import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate, AIPricingData } from '@/types/estimate';
import { UserSettings } from '@/types/settings';

function addComparablePricingPage(
  doc: jsPDF,
  aiPricing: AIPricingData,
  estimate: Estimate
) {
  const pageWidth = doc.internal.pageSize.width;
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const primaryColor: [number, number, number] = [59, 130, 246];
  const darkColor: [number, number, number] = [10, 14, 26];
  const grayColor: [number, number, number] = [155, 168, 192];

  doc.addPage();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('COMPARABLE PRICING IN YOUR AREA', leftMargin, 20);

  // Location context
  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(
    `${estimate.city}${estimate.state ? `, ${estimate.state}` : ''} — ${estimate.workType.replace(/_/g, ' ')}`,
    leftMargin,
    28
  );

  // Summary stats
  let y = 42;

  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('MARKET SUMMARY', leftMargin, y);
  y += 10;

  // Average price box
  doc.setFillColor(230, 240, 255);
  doc.roundedRect(leftMargin, y, contentWidth, 28, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Average Market Price', leftMargin + 8, y + 10);
  doc.text('Price Range', leftMargin + 8, y + 22);

  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(
    `$${aiPricing.averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    leftMargin + 80,
    y + 10
  );
  doc.setFontSize(10);
  doc.text(
    `$${aiPricing.priceRange.min.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — $${aiPricing.priceRange.max.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    leftMargin + 80,
    y + 22
  );

  // Confidence + your price on the right
  const confidenceLabel = `Confidence: ${aiPricing.confidence.charAt(0).toUpperCase() + aiPricing.confidence.slice(1)}`;
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(confidenceLabel, pageWidth - rightMargin - 8, y + 10, { align: 'right' });

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(10);
  doc.text(
    `Your Estimate: $${estimate.pricing.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - rightMargin - 8,
    y + 22,
    { align: 'right' }
  );

  y += 38;

  // Sources table
  if (aiPricing.sources && aiPricing.sources.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('PRICING SOURCES', leftMargin, y);
    y += 6;

    const sourceData = aiPricing.sources.map((s) => [
      s.source,
      `$${s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      s.description,
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: leftMargin, right: rightMargin },
      head: [['Source', 'Price', 'Description']],
      body: sourceData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        textColor: darkColor,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
      },
    });
  }

  // Footer note
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  const note = `Comparable pricing data retrieved ${new Date(aiPricing.lastUpdated).toLocaleDateString()}. Prices reflect market averages and may vary based on project specifics, site conditions, and material availability.`;
  const splitNote = doc.splitTextToSize(note, contentWidth);
  doc.text(splitNote, leftMargin, pageHeight - 15, { maxWidth: contentWidth });
}

export function generateEstimatePDF(
  estimate: Estimate,
  companyInfo: UserSettings
): Blob {
  const doc = new jsPDF();

  // Layout constants
  const pageWidth = doc.internal.pageSize.width;
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const darkColor: [number, number, number] = [10, 14, 26];
  const grayColor: [number, number, number] = [155, 168, 192];

  // Header with company info
  doc.setFontSize(24);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(companyInfo.companyName, 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  if (companyInfo.companyEmail) {
    doc.text(companyInfo.companyEmail, 20, 28);
  }
  if (companyInfo.companyPhone) {
    doc.text(companyInfo.companyPhone, 20, 33);
  }
  if (companyInfo.companyAddress) {
    doc.text(companyInfo.companyAddress, 20, 38);
  }

  // Estimate title
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ESTIMATE', 150, 20);

  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, 150, 28);
  doc.text('Status: PRELIMINARY', 150, 33);

  // Client info section
  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('CLIENT INFORMATION', 20, 55);

  doc.setFontSize(10);
  doc.text(`Name: ${estimate.clientName}`, 20, 63);
  if (estimate.clientPhone) {
    doc.text(`Phone: ${estimate.clientPhone}`, 20, 68);
  }
  if (estimate.clientEmail) {
    doc.text(`Email: ${estimate.clientEmail}`, 20, 73);
  }

  // Project info
  doc.setFontSize(12);
  doc.text('PROJECT DETAILS', 20, 88);

  doc.setFontSize(10);
  doc.text(`Location: ${estimate.projectAddress}, ${estimate.city}${estimate.state ? `, ${estimate.state}` : ''}`, 20, 96);
  doc.text(`Type: ${estimate.workType.replace(/_/g, ' ')}`, 20, 101);

  // Scope of work
  doc.setFontSize(12);
  doc.text('SCOPE OF WORK', leftMargin, 116);

  doc.setFontSize(10);
  const splitScope = doc.splitTextToSize(estimate.scopeOfWork, contentWidth);
  doc.text(splitScope, leftMargin, 124, { maxWidth: contentWidth });

  // Bill of Quantity section
  const billOfQuantityY = 124 + (splitScope.length * 5) + 6;

  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('BILL OF QUANTITY', leftMargin, billOfQuantityY);

  // Pricing table
  const startY = billOfQuantityY + 8;

  // Labor row
  const tableData: any[] = [
    [
      'Labor',
      `${estimate.pricing.labor.hours} hrs`,
      `$${estimate.pricing.labor.hourlyRate.toFixed(2)}/hr`,
      `$${estimate.pricing.labor.total.toFixed(2)}`,
    ],
  ];

  // Material rows
  estimate.pricing.materials.items.forEach((item) => {
    tableData.push([
      item.description || 'Material',
      item.quantity.toString(),
      `$${item.unitCost.toFixed(2)}`,
      `$${item.total.toFixed(2)}`,
    ]);
  });

  // Summary rows
  tableData.push(['', '', 'Subtotal:', `$${estimate.pricing.subtotal.toFixed(2)}`]);
  tableData.push(['', '', `Overhead and Contractor's fee:`, `$${estimate.pricing.markupAmount.toFixed(2)}`]);
  tableData.push(['', '', 'TOTAL:', `$${estimate.pricing.total.toFixed(2)}`]);

  autoTable(doc, {
    startY,
    margin: { left: leftMargin, right: rightMargin },
    head: [['Description', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      textColor: darkColor,
    },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Make last 3 rows stand out
      if (data.section === 'body' && data.row.index >= tableData.length - 3) {
        data.cell.styles.fillColor = [240, 242, 245];
        data.cell.styles.fontStyle = 'bold';
      }
      // Make total row extra bold
      if (data.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.fontSize = 12;
        data.cell.styles.fillColor = [230, 240, 255];
      }
    },
  });

  // Footer disclaimer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  const disclaimer = 'This cost estimate is provided for budget purposes only. Final pricing is subject to finalized scope, site conditions, and official quotation. This estimate is valid for 30 days from the date above.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, leftMargin, pageHeight - 15, { maxWidth: contentWidth });

  // Comparable pricing page
  if (estimate.aiPricing?.averagePrice != null && estimate.aiPricing?.priceRange) {
    addComparablePricingPage(doc, estimate.aiPricing, estimate);
  }

  return doc.output('blob');
}

export async function generateInvoicePDF(
  estimate: Estimate,
  companyInfo: UserSettings,
  receiptDataUrls?: string[]
): Promise<Blob> {
  const doc = new jsPDF();

  // Layout constants
  const pageWidth = doc.internal.pageSize.width;
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const darkColor: [number, number, number] = [10, 14, 26];
  const grayColor: [number, number, number] = [155, 168, 192];

  // Header with company info
  doc.setFontSize(24);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(companyInfo.companyName, 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  if (companyInfo.companyEmail) {
    doc.text(companyInfo.companyEmail, 20, 28);
  }
  if (companyInfo.companyPhone) {
    doc.text(companyInfo.companyPhone, 20, 33);
  }
  if (companyInfo.companyAddress) {
    doc.text(companyInfo.companyAddress, 20, 38);
  }

  // Invoice title
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INVOICE', 150, 20);

  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, 150, 28);
  doc.text('Status: DUE', 150, 33);

  // Client info section
  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('CLIENT INFORMATION', 20, 55);

  doc.setFontSize(10);
  doc.text(`Name: ${estimate.clientName}`, 20, 63);
  if (estimate.clientPhone) {
    doc.text(`Phone: ${estimate.clientPhone}`, 20, 68);
  }
  if (estimate.clientEmail) {
    doc.text(`Email: ${estimate.clientEmail}`, 20, 73);
  }

  // Project info
  doc.setFontSize(12);
  doc.text('PROJECT DETAILS', 20, 88);

  doc.setFontSize(10);
  doc.text(`Location: ${estimate.projectAddress}, ${estimate.city}${estimate.state ? `, ${estimate.state}` : ''}`, 20, 96);
  doc.text(`Type: ${estimate.workType.replace(/_/g, ' ')}`, 20, 101);

  // Scope of work
  doc.setFontSize(12);
  doc.text('SCOPE OF WORK', leftMargin, 116);

  doc.setFontSize(10);
  const splitScope = doc.splitTextToSize(estimate.scopeOfWork, contentWidth);
  doc.text(splitScope, leftMargin, 124, { maxWidth: contentWidth });

  // Bill of Quantity section
  const billOfQuantityY = 124 + (splitScope.length * 5) + 6;

  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('BILL OF QUANTITY', leftMargin, billOfQuantityY);

  // Pricing table
  const startY = billOfQuantityY + 8;

  // Labor row
  const tableData: any[] = [
    [
      'Labor',
      `${estimate.pricing.labor.hours} hrs`,
      `$${estimate.pricing.labor.hourlyRate.toFixed(2)}/hr`,
      `$${estimate.pricing.labor.total.toFixed(2)}`,
    ],
  ];

  // Material rows
  estimate.pricing.materials.items.forEach((item) => {
    tableData.push([
      item.description || 'Material',
      item.quantity.toString(),
      `$${item.unitCost.toFixed(2)}`,
      `$${item.total.toFixed(2)}`,
    ]);
  });

  // Summary rows
  tableData.push(['', '', 'Subtotal:', `$${estimate.pricing.subtotal.toFixed(2)}`]);
  tableData.push(['', '', `Overhead and Contractor's fee:`, `$${estimate.pricing.markupAmount.toFixed(2)}`]);
  tableData.push(['', '', 'TOTAL:', `$${estimate.pricing.total.toFixed(2)}`]);

  autoTable(doc, {
    startY,
    margin: { left: leftMargin, right: rightMargin },
    head: [['Description', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      textColor: darkColor,
    },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Make last 3 rows stand out
      if (data.section === 'body' && data.row.index >= tableData.length - 3) {
        data.cell.styles.fillColor = [240, 242, 245];
        data.cell.styles.fontStyle = 'bold';
      }
      // Make total row extra bold
      if (data.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.fontSize = 12;
        data.cell.styles.fillColor = [230, 240, 255];
      }
    },
  });

  // Footer disclaimer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  const disclaimer = 'This invoice reflects charges for work performed. Payment is due within 30 days of the date above. Please contact us with any questions.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, leftMargin, pageHeight - 15, { maxWidth: contentWidth });

  // Comparable pricing page
  if (estimate.aiPricing?.averagePrice != null && estimate.aiPricing?.priceRange) {
    addComparablePricingPage(doc, estimate.aiPricing, estimate);
  }

  // Append receipt images as additional pages
  if (receiptDataUrls && receiptDataUrls.length > 0) {
    for (const dataUrl of receiptDataUrls) {
      doc.addPage();

      doc.setFontSize(12);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('RECEIPT / PROOF OF PURCHASE', leftMargin, 20);

      const format = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      const maxW = contentWidth;
      const maxH = pageHeight - 50; // margins top + bottom

      // Use jsPDF's built-in scaling
      doc.addImage(dataUrl, format, leftMargin, 30, maxW, maxH, undefined, 'FAST');
    }
  }

  return doc.output('blob');
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
