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
  if (/Item\s+In Store\s+Qty\s+Item Total/i.test(text)) cartScore += 3;
  if (/View Cart/i.test(text)) cartScore += 1;
  if (/YOU MIGHT ALSO LIKE/i.test(text)) cartScore += 2;

  // Order Receipt indicators
  if (/Receipt\s*#/i.test(text)) receiptScore += 3;
  if (/Invoice Number/i.test(text)) receiptScore += 2;
  if (/PO\/Job Name/i.test(text)) receiptScore += 2;
  if (/In-Store Purchase/i.test(text)) receiptScore += 2;
  if (/Unit Price\s+Discount\s+Net Unit Price/i.test(text)) receiptScore += 3;
  if (/Pre Tax Amount/i.test(text)) receiptScore += 2;
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

  // Find the cart items section - starts after the header row
  const headerMatch = relevantText.match(/Item\s+In Store\s+Qty\s+Item Total/i);
  if (!headerMatch) {
    warnings.push('Could not find cart items header');
    return { format: 'share_cart', items, subtotal: 0, warnings };
  }

  const itemsText = relevantText.substring(headerMatch.index! + headerMatch[0].length);

  // Pattern: multi-line description, then Model #..., Store SKU #..., then Aisle/Bay lines, then Qty + Item Total
  // The text format has items separated by price lines like "$30.88"
  // Split by the quantity + price pattern: number(s) \t $price
  const itemBlocks = itemsText.split(/(?=\n(?:[A-Z]|[0-9]))/);

  // Alternative approach: find all price entries and work backwards
  // Pattern: digit(s) \t $amount on a line — matches "4 \t $30.88" or "1 \t $9.37"
  const pricePattern = /^(\d+)\s+\$([0-9,]+\.\d{2})\s*$/gm;
  const descriptions: string[] = [];
  const quantities: number[] = [];
  const totals: number[] = [];

  let match;
  let lastEnd = 0;
  const textToScan = itemsText;

  while ((match = pricePattern.exec(textToScan)) !== null) {
    const descBlock = textToScan.substring(lastEnd, match.index).trim();
    if (descBlock) {
      descriptions.push(descBlock);
      quantities.push(parseInt(match[1], 10));
      totals.push(parseFloat(match[2].replace(/,/g, '')));
    }
    lastEnd = match.index + match[0].length;
  }

  for (let i = 0; i < descriptions.length; i++) {
    const block = descriptions[i];
    const lines = block.split('\n').map(l => l.trim()).filter(l => l && l !== '--' && !/^\d+ of \d+$/.test(l));

    // Remove page separator lines
    const cleanLines = lines.filter(l => !/^-- \d+ of \d+ --$/.test(l));

    // Extract description (first lines before Model/SKU/Aisle)
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
      } else if (/^(Subtotal|Shipping|Sales Tax|Est\. Total|View Cart)/i.test(line)) {
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

  // Extract subtotal
  const subtotalMatch = text.match(/Subtotal\s+\$([0-9,]+\.\d{2})/);
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

  // Extract metadata
  const receiptMatch = text.match(/Receipt\s*#\s*([^\n]+)/);
  const poMatch = text.match(/PO\/Job Name:\s*([^\n]+)/);
  const dateMatch = text.match(/Ordered\s*\n\s*([^\n]+)/);
  const storeMatch = text.match(/Order Origin:\s*([^\n]+)/);

  const metadata = {
    receiptNumber: receiptMatch?.[1]?.trim(),
    poJobName: poMatch?.[1]?.trim(),
    orderDate: dateMatch?.[1]?.trim(),
    storeOrigin: storeMatch?.[1]?.trim(),
  };

  // The order receipt format has a consistent columnar layout:
  // Description (may be multi-line)
  // SKU XXXXXXX
  // Qty  UnitPrice  Discount  NetUnitPrice  PreTaxAmount
  //
  // Pattern: SKU line followed by price line
  // Price line format: qty $price $discount $netprice $pretax
  const itemPattern = /^([\s\S]*?)SKU\s+(\d+)\s*\n\s*(\d+)\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})/gm;

  // Alternative: line-by-line scan approach
  const lines = text.split('\n');
  let i = 0;

  // Skip header — find the column header line
  while (i < lines.length && !/Item Description\s+Qty/i.test(lines[i])) {
    i++;
  }
  i++; // skip past header line

  while (i < lines.length) {
    const line = lines[i].trim();

    // Stop at summary section
    if (/^Subtotal\s/.test(line)) break;
    if (/^Discount\s/.test(line)) break;

    // Skip page footer/header lines
    if (/^Printed On:/.test(line) || /^-- \d+ of \d+ --$/.test(line) || /^Page \d+ of/.test(line)) {
      i++;
      continue;
    }

    // Skip the repeated column header on subsequent pages
    if (/^Item Description\s+Qty/i.test(line)) {
      i++;
      continue;
    }

    // Look for SKU line
    const skuMatch = line.match(/^SKU\s+(\d+)\s*$/);
    if (skuMatch) {
      // Description is in the lines above (collect them going backward)
      const sku = skuMatch[1];
      const descLines: string[] = [];
      let j = i - 1;
      while (j >= 0) {
        const prevLine = lines[j].trim();
        if (!prevLine || /^SKU\s+\d+/.test(prevLine) || /^\d+\s+\$/.test(prevLine) ||
            /^Printed On:/.test(prevLine) || /^-- \d+ of \d+ --$/.test(prevLine) ||
            /^Item Description\s+Qty/i.test(prevLine) || /^Page \d+ of/.test(prevLine)) {
          break;
        }
        descLines.unshift(prevLine);
        j--;
      }

      // Next line should be the price line
      i++;
      const priceLine = (i < lines.length) ? lines[i].trim() : '';
      const priceMatch = priceLine.match(
        /^(\d+)\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})$/
      );

      if (priceMatch) {
        const qty = parseInt(priceMatch[1], 10);
        const unitPrice = parseFloat(priceMatch[4].replace(/,/g, ''));
        const preTaxAmount = parseFloat(priceMatch[5].replace(/,/g, ''));
        const description = descLines.join(' ').trim();

        if (description) {
          items.push({
            description,
            quantity: qty,
            unitCost: unitPrice,
            sku,
          });
        }
      }

      i++;
      continue;
    }

    // Handle items without a separate SKU line (SKU on same line as price)
    // e.g. "SKU 999899 1 $1.20 $0.00 $1.20 $1.20"
    const inlineMatch = line.match(
      /^SKU\s+(\d+)\s+(\d+)\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})\s+\$([0-9,]+\.\d{2})$/
    );
    if (inlineMatch) {
      const sku = inlineMatch[1];
      const qty = parseInt(inlineMatch[2], 10);
      const unitPrice = parseFloat(inlineMatch[5].replace(/,/g, ''));

      items.push({
        description: `Item SKU ${sku}`,
        quantity: qty,
        unitCost: unitPrice,
        sku,
      });
      i++;
      continue;
    }

    i++;
  }

  // Extract subtotal
  const subtotalMatch = text.match(/Subtotal\s+\$([0-9,]+\.\d{2})/);
  const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : 0;

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
