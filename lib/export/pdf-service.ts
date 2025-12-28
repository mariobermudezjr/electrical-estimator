import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate } from '@/types/estimate';
import { UserSettings } from '@/types/settings';

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
  doc.text(splitScope, leftMargin, 124, { align: 'justify', maxWidth: contentWidth });

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
  tableData.push(['', '', `Markup (${estimate.pricing.markupPercentage}%):`, `$${estimate.pricing.markupAmount.toFixed(2)}`]);
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
