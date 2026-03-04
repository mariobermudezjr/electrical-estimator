export interface ParsedItem {
  description: string;
  quantity: number;
  unitCost: number;
  sku?: string;
  model?: string;
}

export interface ParseResult {
  format: 'share_cart' | 'order_receipt';
  items: ParsedItem[];
  subtotal: number;
  warnings: string[];
  metadata?: {
    receiptNumber?: string;
    poJobName?: string;
    orderDate?: string;
    storeOrigin?: string;
  };
}

type Format = 'share_cart' | 'order_receipt' | 'unknown';

export function detectFormat(text: string): Format {
  let cartScore = 0;
  let receiptScore = 0;

  // Share Cart indicators
  if (/share\s*(their\s*)?cart/i.test(text)) cartScore += 3;
  if (/Store SKU #/i.test(text)) cartScore += 2;
  if (/Model #/i.test(text)) cartScore += 1;
  // v1 has no whitespace: "ItemIn StoreQtyItem Total", v2 has tabs
  if (/Item\s*In\s*Store\s*Qty\s*Item\s*Total/i.test(text)) cartScore += 3;
  if (/View Cart/i.test(text)) cartScore += 1;
  if (/YOU MIGHT ALSO LIKE/i.test(text)) cartScore += 2;

  // Order Receipt indicators
  if (/Receipt\s*#/i.test(text)) receiptScore += 3;
  if (/Invoice Number/i.test(text)) receiptScore += 2;
  if (/PO\/Job Name/i.test(text)) receiptScore += 2;
  if (/In-Store Purchase/i.test(text)) receiptScore += 2;
  if (/Unit Price/i.test(text)) receiptScore += 2;
  if (/Pre\s*Tax\s*Amount/i.test(text)) receiptScore += 2;
  if (/Printed On:/i.test(text)) receiptScore += 1;

  if (cartScore > receiptScore && cartScore >= 3) return 'share_cart';
  if (receiptScore > cartScore && receiptScore >= 3) return 'order_receipt';
  return 'unknown';
}

export function parseShareCart(text: string): ParseResult {
  const items: ParsedItem[] = [];
  const warnings: string[] = [];

  // Stop at "YOU MIGHT ALSO LIKE" section
  const stopIndex = text.indexOf('YOU MIGHT ALSO LIKE');
  const relevantText = stopIndex > -1 ? text.substring(0, stopIndex) : text;

  // Find the cart items section - v1: "ItemIn StoreQtyItem Total", v2: "Item\tIn Store\tQty\tItem Total"
  const headerMatch = relevantText.match(/Item\s*In\s*Store\s*Qty\s*Item\s*Total/i);
  if (!headerMatch) {
    warnings.push('Could not find cart items header');
    return { format: 'share_cart', items, subtotal: 0, warnings };
  }

  const itemsText = relevantText.substring(headerMatch.index! + headerMatch[0].length);

  // Price line pattern — handles both:
  //   v1: "4$30.88" (no whitespace between qty and $)
  //   v2: "4 \t $30.88" (whitespace/tabs between qty and $)
  const pricePattern = /^(\d+)\s*\$([0-9,]+\.\d{2})\s*$/gm;
  const descriptions: string[] = [];
  const quantities: number[] = [];
  const totals: number[] = [];

  let match;
  let lastEnd = 0;

  while ((match = pricePattern.exec(itemsText)) !== null) {
    const descBlock = itemsText.substring(lastEnd, match.index).trim();
    if (descBlock) {
      descriptions.push(descBlock);
      quantities.push(parseInt(match[1], 10));
      totals.push(parseFloat(match[2].replace(/,/g, '')));
    }
    lastEnd = match.index + match[0].length;
  }

  for (let i = 0; i < descriptions.length; i++) {
    const block = descriptions[i];
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);

    // Remove page separator lines and empty/whitespace-only lines
    const cleanLines = lines.filter(l => !/^-- \d+ of \d+ --$/.test(l));

    const descLines: string[] = [];
    let model = '';
    let sku = '';

    for (const line of cleanLines) {
      const modelMatch = line.match(/^Model #(.+)/);
      const skuMatch = line.match(/^Store SKU #(.+)/);
      if (modelMatch) {
        model = modelMatch[1].trim();
      } else if (skuMatch) {
        sku = skuMatch[1].trim();
      } else if (line === 'Aisle' || line === 'Bay') {
        // skip location info
      } else if (/^(Subtotal|Shipping|Sales Tax|Est\.\s*Total|View Cart)/i.test(line)) {
        // skip summary lines
      } else {
        descLines.push(line);
      }
    }

    const description = descLines.join(' ').trim();
    if (!description) continue;

    const qty = quantities[i];
    const itemTotal = totals[i];
    const unitCost = qty > 0 ? Math.round((itemTotal / qty) * 100) / 100 : itemTotal;

    items.push({
      description,
      quantity: qty,
      unitCost,
      ...(sku && { sku }),
      ...(model && { model }),
    });
  }

  // Extract subtotal — v1: "Subtotal$338.74" or v2: "Subtotal \t$338.74"
  const subtotalMatch = text.match(/Subtotal\s*\$([0-9,]+\.\d{2})/);
  const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : 0;

  // Cross-validate
  const parsedTotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const diff = Math.abs(parsedTotal - subtotal);
  if (subtotal > 0 && diff > 0.10) {
    warnings.push(
      `Parsed total ($${parsedTotal.toFixed(2)}) differs from PDF subtotal ($${subtotal.toFixed(2)}) by $${diff.toFixed(2)}`
    );
  }

  return { format: 'share_cart', items, subtotal, warnings };
}

export function parseOrderReceipt(text: string): ParseResult {
  const items: ParsedItem[] = [];
  const warnings: string[] = [];

  // Extract metadata — v1 may have everything on one line
  const receiptMatch = text.match(/Receipt\s*#\s*([0-9-]+)/);
  const poMatch = text.match(/PO\/Job Name:\s*([^\n]+?)(?:In-Store|Ordered|$)/);
  const dateMatch = text.match(/Ordered\s*\n?\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  const storeMatch = text.match(/Order Origin:\s*([^\n]+?)(?:Ordered|$)/);

  const metadata = {
    receiptNumber: receiptMatch?.[1]?.trim(),
    poJobName: poMatch?.[1]?.trim(),
    orderDate: dateMatch?.[1]?.trim(),
    storeOrigin: storeMatch?.[1]?.trim(),
  };

  const lines = text.split('\n');
  let i = 0;

  // Skip to after the header. v1: "Pre Tax Amount" on its own line.
  // v2: "Item Description Qty Unit Price Discount Net Unit Price Pre Tax Amount" on one line.
  while (i < lines.length) {
    if (/Pre\s*Tax\s*Amount/i.test(lines[i])) { i++; break; }
    if (/Item Description\s+Qty/i.test(lines[i])) { i++; break; }
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    // Stop at summary section
    if (/^Subtotal$/i.test(line)) break;
    if (/^Subtotal\s/i.test(line)) break;

    // Skip page footer/header lines
    if (/^Printed On:/i.test(line) || /^-- \d+ of \d+ --$/.test(line) ||
        /^Page \d+ of/i.test(line) || line === '' ||
        /^Pre\s*Tax\s*Amount/i.test(line) || /^Item Description/i.test(line) ||
        /^Qty$/i.test(line) || /^Unit Price$/i.test(line) ||
        /^Discount$/i.test(line) || /^Net Unit Price$/i.test(line)) {
      i++;
      continue;
    }

    // Skip lines that are just a number (page number after "Page X of")
    if (/^\d+$/.test(line) && i > 0 && /^Page \d+ of/i.test(lines[i - 1]?.trim())) {
      i++;
      continue;
    }

    // v1 format: description+SKU on one line like "Cat-6 Jack in White (10-Pack)SKU 1003119026"
    // Then qty, unitPrice, discount, netPrice, preTax on separate lines
    const skuInlineMatch = line.match(/^(.+?)SKU\s+(\d+)\s*$/);
    if (skuInlineMatch) {
      const description = skuInlineMatch[1].trim();
      const sku = skuInlineMatch[2];

      // Next 5 lines should be: qty, unitPrice, discount, netUnitPrice, preTaxAmount
      const qtyLine = lines[i + 1]?.trim();
      const netPriceLine = lines[i + 4]?.trim();
      const preTaxLine = lines[i + 5]?.trim();

      if (qtyLine && /^\d+$/.test(qtyLine) && netPriceLine && preTaxLine) {
        const qty = parseInt(qtyLine, 10);
        const unitPrice = parseFloat(netPriceLine.replace(/^\$/, '').replace(/,/g, ''));
        items.push({ description, quantity: qty, unitCost: unitPrice, sku });
        i += 6; // skip past all 5 price lines + description line
        continue;
      }
    }

    // v2 format: standalone "SKU XXXXX" line
    const skuStandaloneMatch = line.match(/^SKU\s+(\d+)\s*$/);
    if (skuStandaloneMatch) {
      const sku = skuStandaloneMatch[1];

      // Description is in the lines above
      const descLines: string[] = [];
      let j = i - 1;
      while (j >= 0) {
        const prevLine = lines[j].trim();
        if (!prevLine || /SKU\s+\d+/.test(prevLine) || /^\$[0-9,]+\.\d{2}$/.test(prevLine) ||
            /^\d+$/.test(prevLine) || /^Printed On:/i.test(prevLine) ||
            /^-- \d+ of \d+ --$/.test(prevLine) || /^Page \d+ of/i.test(prevLine) ||
            /^Item Description/i.test(prevLine) || /^Pre\s*Tax\s*Amount/i.test(prevLine)) {
          break;
        }
        descLines.unshift(prevLine);
        j--;
      }

      // Check if next line is qty (number only) — v1 standalone SKU pattern
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && /^\d+$/.test(nextLine)) {
        const qty = parseInt(nextLine, 10);
        const netPriceLine = lines[i + 4]?.trim();
        if (netPriceLine) {
          const unitPrice = parseFloat(netPriceLine.replace(/^\$/, '').replace(/,/g, ''));
          const description = descLines.join(' ').trim() || `Item SKU ${sku}`;
          items.push({ description, quantity: qty, unitCost: unitPrice, sku });
          i += 6;
          continue;
        }
      }

      // v2: next line is "qty $price $discount $net $pretax" all on one line
      if (nextLine) {
        const priceMatch = nextLine.match(
          /^(\d+)\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})$/
        );
        if (priceMatch) {
          const qty = parseInt(priceMatch[1], 10);
          const unitPrice = parseFloat(priceMatch[4].replace(/,/g, ''));
          const description = descLines.join(' ').trim();
          if (description) {
            items.push({ description, quantity: qty, unitCost: unitPrice, sku });
          }
          i += 2;
          continue;
        }
      }
    }

    i++;
  }

  // Extract subtotal — v1: "Subtotal\n$733.11" or v2: "Subtotal\t$733.11"
  let subtotal = 0;
  const subtotalMatchInline = text.match(/Subtotal\s+\$([0-9,]+\.\d{2})/);
  if (subtotalMatchInline) {
    subtotal = parseFloat(subtotalMatchInline[1].replace(/,/g, ''));
  } else {
    // v1: Subtotal on its own line, value on next line
    const subtotalIdx = lines.findIndex(l => /^Subtotal$/i.test(l.trim()));
    if (subtotalIdx >= 0 && subtotalIdx + 1 < lines.length) {
      const valMatch = lines[subtotalIdx + 1].trim().match(/^\$([0-9,]+\.\d{2})$/);
      if (valMatch) subtotal = parseFloat(valMatch[1].replace(/,/g, ''));
    }
  }

  // Cross-validate
  const parsedTotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const diff = Math.abs(parsedTotal - subtotal);
  if (subtotal > 0 && diff > 0.10) {
    warnings.push(
      `Parsed total ($${parsedTotal.toFixed(2)}) differs from PDF subtotal ($${subtotal.toFixed(2)}) by $${diff.toFixed(2)}`
    );
  }

  return { format: 'order_receipt', items, subtotal, warnings, metadata };
}

export function parseHomeDepotPDF(text: string): ParseResult {
  const format = detectFormat(text);

  if (format === 'share_cart') {
    return parseShareCart(text);
  }

  if (format === 'order_receipt') {
    return parseOrderReceipt(text);
  }

  return {
    format: 'share_cart',
    items: [],
    subtotal: 0,
    warnings: ['Could not detect Home Depot PDF format. Please upload a Share Cart email or Order Receipt PDF.'],
  };
}
