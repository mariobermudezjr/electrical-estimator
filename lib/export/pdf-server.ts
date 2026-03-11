import PDFDocument from 'pdfkit';
import { Estimate } from '@/types/estimate';
import { UserSettings } from '@/types/settings';
import path from 'path';
import fs from 'fs';

// Colors
const PRIMARY: [number, number, number] = [59, 130, 246];
const DARK: [number, number, number] = [10, 14, 26];
const GRAY: [number, number, number] = [155, 168, 192];

function hexFromRGB(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

const COLOR_PRIMARY = hexFromRGB(...PRIMARY);
const COLOR_DARK = hexFromRGB(...DARK);
const COLOR_GRAY = hexFromRGB(...GRAY);

/**
 * Generate an estimate PDF server-side using PDFKit.
 * Returns a Buffer containing the PDF data.
 */
export async function generateEstimatePDFServer(
  estimate: Estimate,
  companyInfo: UserSettings
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'letter', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 612; // letter width in points
    const leftMargin = 56;
    const rightMargin = 56;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    // --- Logo ---
    try {
      const logoPath = path.join(process.cwd(), 'public', 'charlies-electric-logo-white.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, pageWidth - rightMargin - 100, 40, { width: 90 });
      }
    } catch {
      // Logo not found, skip
    }

    // --- Header: Company Info ---
    doc.fontSize(20).fillColor(COLOR_DARK).text(companyInfo.companyName, leftMargin, 50);

    let headerY = 75;
    doc.fontSize(9).fillColor(COLOR_GRAY);
    if (companyInfo.companyEmail) {
      doc.text(companyInfo.companyEmail, leftMargin, headerY);
      headerY += 13;
    }
    if (companyInfo.companyPhone) {
      doc.text(companyInfo.companyPhone, leftMargin, headerY);
      headerY += 13;
    }
    if (companyInfo.companyAddress) {
      doc.text(companyInfo.companyAddress, leftMargin, headerY);
      headerY += 13;
    }

    // --- Estimate title block ---
    doc.fontSize(14).fillColor(COLOR_PRIMARY).text('ESTIMATE', 420, 50);
    doc.fontSize(9).fillColor(COLOR_DARK);
    doc.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, 420, 68);
    doc.text('Status: PRELIMINARY', 420, 81);

    // --- Client Information ---
    let y = 140;
    doc.fontSize(11).fillColor(COLOR_DARK).text('CLIENT INFORMATION', leftMargin, y);
    y += 18;
    doc.fontSize(9).fillColor(COLOR_DARK);
    doc.text(`Name: ${estimate.clientName}`, leftMargin, y);
    y += 13;
    if (estimate.clientPhone) {
      doc.text(`Phone: ${estimate.clientPhone}`, leftMargin, y);
      y += 13;
    }
    if (estimate.clientEmail) {
      doc.text(`Email: ${estimate.clientEmail}`, leftMargin, y);
      y += 13;
    }

    // --- Project Details ---
    y += 8;
    doc.fontSize(11).fillColor(COLOR_DARK).text('PROJECT DETAILS', leftMargin, y);
    y += 18;
    doc.fontSize(9);
    const location = `${estimate.projectAddress}, ${estimate.city}${estimate.state ? `, ${estimate.state}` : ''}`;
    doc.text(`Location: ${location}`, leftMargin, y);
    y += 13;
    doc.text(`Type: ${estimate.workType.replace(/_/g, ' ')}`, leftMargin, y);
    y += 20;

    // --- Scope of Work ---
    doc.fontSize(11).fillColor(COLOR_DARK).text('SCOPE OF WORK', leftMargin, y);
    y += 18;
    doc.fontSize(9).fillColor(COLOR_DARK);
    const scopeHeight = doc.heightOfString(estimate.scopeOfWork, { width: contentWidth });
    doc.text(estimate.scopeOfWork, leftMargin, y, { width: contentWidth });
    y += scopeHeight + 16;

    // --- Bill of Quantity ---
    doc.fontSize(11).fillColor(COLOR_DARK).text('BILL OF QUANTITY', leftMargin, y);
    y += 14;

    // Table header
    const colWidths = [contentWidth * 0.45, contentWidth * 0.15, contentWidth * 0.2, contentWidth * 0.2];
    const colX = [leftMargin, leftMargin + colWidths[0], leftMargin + colWidths[0] + colWidths[1], leftMargin + colWidths[0] + colWidths[1] + colWidths[2]];

    // Header row
    doc.rect(leftMargin, y, contentWidth, 20).fill(COLOR_PRIMARY);
    doc.fontSize(9).fillColor('#FFFFFF');
    doc.text('Description', colX[0] + 4, y + 5, { width: colWidths[0] - 8 });
    doc.text('Quantity', colX[1] + 4, y + 5, { width: colWidths[1] - 8 });
    doc.text('Rate', colX[2] + 4, y + 5, { width: colWidths[2] - 8 });
    doc.text('Amount', colX[3] + 4, y + 5, { width: colWidths[3] - 8, align: 'right' });
    y += 20;

    // Table rows
    const rows: string[][] = [];

    // Labor row
    rows.push([
      'Labor',
      `${estimate.pricing.labor.hours} hrs`,
      `$${estimate.pricing.labor.hourlyRate.toFixed(2)}/hr`,
      `$${estimate.pricing.labor.total.toFixed(2)}`,
    ]);

    // Material rows
    for (const item of estimate.pricing.materials.items) {
      rows.push([
        item.description || 'Material',
        item.quantity.toString(),
        `$${item.unitCost.toFixed(2)}`,
        `$${item.total.toFixed(2)}`,
      ]);
    }

    // Summary rows
    rows.push(['', '', 'Subtotal:', `$${estimate.pricing.subtotal.toFixed(2)}`]);
    rows.push(['', '', "Overhead and Contractor's fee:", `$${estimate.pricing.markupAmount.toFixed(2)}`]);
    rows.push(['', '', 'TOTAL:', `$${estimate.pricing.total.toFixed(2)}`]);

    const rowHeight = 18;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isLast3 = i >= rows.length - 3;
      const isTotal = i === rows.length - 1;

      // Row background
      if (isTotal) {
        doc.rect(leftMargin, y, contentWidth, rowHeight).fill('#E6F0FF');
      } else if (isLast3) {
        doc.rect(leftMargin, y, contentWidth, rowHeight).fill('#F0F2F5');
      } else if (i % 2 === 1) {
        doc.rect(leftMargin, y, contentWidth, rowHeight).fill('#F9F9F9');
      }

      // Grid lines
      doc.rect(leftMargin, y, contentWidth, rowHeight).stroke('#E0E0E0');

      const fontSize = isTotal ? 11 : 9;
      const fontStyle = isLast3 ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(fontStyle).fontSize(fontSize).fillColor(COLOR_DARK);
      doc.text(row[0], colX[0] + 4, y + 4, { width: colWidths[0] - 8 });
      doc.text(row[1], colX[1] + 4, y + 4, { width: colWidths[1] - 8 });
      doc.text(row[2], colX[2] + 4, y + 4, { width: colWidths[2] - 8 });
      doc.text(row[3], colX[3] + 4, y + 4, { width: colWidths[3] - 8, align: 'right' });
      y += rowHeight;
    }

    // Reset font
    doc.font('Helvetica');

    // --- Footer Disclaimer ---
    const disclaimer = 'This cost estimate is provided for budget purposes only. Final pricing is subject to finalized scope, site conditions, and official quotation. This estimate is valid for 30 days from the date above.';
    doc.fontSize(7).fillColor(COLOR_GRAY);
    doc.text(disclaimer, leftMargin, 700, { width: contentWidth });

    doc.end();
  });
}
