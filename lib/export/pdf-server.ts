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

    // --- Logo (right side of company name header) ---
    const logoSize = 88;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'charlies-electric-logo-white.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, pageWidth - rightMargin - logoSize, 40, { width: logoSize, height: logoSize });
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
    doc.fontSize(14).fillColor(COLOR_PRIMARY).text('ESTIMATE', leftMargin, headerY + 8);
    doc.fontSize(9).fillColor(COLOR_DARK);
    doc.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, leftMargin, headerY + 24);
    doc.text('Status: PRELIMINARY', leftMargin + 120, headerY + 24);

    // --- Client Information ---
    let y = headerY + 44;
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
    doc.text('Description', colX[0] + 4, y + 5, { width: colWidths[0] - 8, lineBreak: false });
    doc.text('Quantity', colX[1] + 4, y + 5, { width: colWidths[1] - 8, lineBreak: false });
    doc.text('Rate', colX[2] + 4, y + 5, { width: colWidths[2] - 8, lineBreak: false });
    doc.text('Amount', colX[3] + 4, y + 5, { width: colWidths[3] - 8, align: 'right', lineBreak: false });
    y += 20;

    // Truncate text to fit within a column width
    const truncate = (text: string, maxChars: number): string => {
      if (text.length <= maxChars) return text;
      return text.slice(0, maxChars - 3) + '...';
    };

    // Table rows
    const rows: string[][] = [];

    // Labor row
    rows.push([
      'Labor',
      `${estimate.pricing.labor.hours} hrs`,
      `$${estimate.pricing.labor.hourlyRate.toFixed(2)}/hr`,
      `$${estimate.pricing.labor.total.toFixed(2)}`,
    ]);

    // Material rows — truncate long descriptions
    for (const item of estimate.pricing.materials.items) {
      rows.push([
        truncate(item.description || 'Material', 45),
        item.quantity.toString(),
        `$${item.unitCost.toFixed(2)}`,
        `$${item.total.toFixed(2)}`,
      ]);
    }

    // Summary rows (handled separately — label spans columns 0-2)
    const summaryRows = [
      ['Subtotal:', `$${estimate.pricing.subtotal.toFixed(2)}`],
      ["Overhead and Contractor's Fee:", `$${estimate.pricing.markupAmount.toFixed(2)}`],
      ['TOTAL:', `$${estimate.pricing.total.toFixed(2)}`],
    ];

    const rowHeight = 18;

    // Data rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Alternating row background
      if (i % 2 === 1) {
        doc.rect(leftMargin, y, contentWidth, rowHeight).fill('#F9F9F9');
      }

      // Grid lines
      doc.rect(leftMargin, y, contentWidth, rowHeight).stroke('#E0E0E0');

      doc.font('Helvetica').fontSize(9).fillColor(COLOR_DARK);
      doc.text(row[0], colX[0] + 4, y + 4, { width: colWidths[0] - 8, lineBreak: false });
      doc.text(row[1], colX[1] + 4, y + 4, { width: colWidths[1] - 8, lineBreak: false });
      doc.text(row[2], colX[2] + 4, y + 4, { width: colWidths[2] - 8, lineBreak: false });
      doc.text(row[3], colX[3] + 4, y + 4, { width: colWidths[3] - 8, align: 'right', lineBreak: false });
      y += rowHeight;
    }

    // Summary rows — label spans first 3 columns, amount in last column
    const labelWidth = colWidths[0] + colWidths[1] + colWidths[2];
    for (let i = 0; i < summaryRows.length; i++) {
      const [label, amount] = summaryRows[i];
      const isTotal = i === summaryRows.length - 1;

      // Row background
      if (isTotal) {
        doc.rect(leftMargin, y, contentWidth, rowHeight).fill('#E6F0FF');
      } else {
        doc.rect(leftMargin, y, contentWidth, rowHeight).fill('#F0F2F5');
      }

      // Grid lines
      doc.rect(leftMargin, y, contentWidth, rowHeight).stroke('#E0E0E0');

      const fontSize = isTotal ? 11 : 9;
      doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(COLOR_DARK);
      doc.text(label, leftMargin + 4, y + 4, { width: labelWidth - 8, align: 'right', lineBreak: false });
      doc.text(amount, colX[3] + 4, y + 4, { width: colWidths[3] - 8, align: 'right', lineBreak: false });
      y += rowHeight;
    }

    // Reset font
    doc.font('Helvetica');

    // --- Footer Disclaimer (pinned to bottom of page) ---
    const pageHeight = 792; // letter height in points
    const disclaimer = 'This cost estimate is provided for budget purposes only. Final pricing is subject to finalized scope, site conditions, and official quotation. This estimate is valid for 30 days from the date above.';
    doc.fontSize(7).fillColor(COLOR_GRAY);
    doc.text(disclaimer, leftMargin, pageHeight - 40, { width: contentWidth });

    // --- Comparable Pricing Page (if AI pricing data exists) ---
    if (estimate.aiPricing?.averagePrice != null && estimate.aiPricing?.priceRange) {
      const ai = estimate.aiPricing;
      doc.addPage();

      // Title
      doc.fontSize(14).fillColor(COLOR_PRIMARY).text('COMPARABLE PRICING IN YOUR AREA', leftMargin, 50);

      // Location context
      const loc = `${estimate.city}${estimate.state ? `, ${estimate.state}` : ''} — ${estimate.workType.replace(/_/g, ' ')}`;
      doc.fontSize(9).fillColor(COLOR_GRAY).text(loc, leftMargin, 70);

      // Market Summary heading
      let py = 90;
      doc.fontSize(11).fillColor(COLOR_DARK).text('MARKET SUMMARY', leftMargin, py);
      py += 16;

      // Summary box
      doc.rect(leftMargin, py, contentWidth, 50).fill('#E6F0FF');

      // Left side labels
      doc.fontSize(9).fillColor(COLOR_GRAY);
      doc.text('Average Market Price', leftMargin + 10, py + 10);
      doc.text('Price Range', leftMargin + 10, py + 30);

      // Left side values
      doc.fontSize(11).fillColor(COLOR_DARK);
      doc.text(
        `$${ai.averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        leftMargin + 140, py + 10
      );
      doc.fontSize(9);
      doc.text(
        `$${ai.priceRange.min.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — $${ai.priceRange.max.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        leftMargin + 140, py + 30
      );

      // Right side
      const confidenceLabel = `Confidence: ${ai.confidence.charAt(0).toUpperCase() + ai.confidence.slice(1)}`;
      doc.fontSize(8).fillColor(COLOR_GRAY);
      doc.text(confidenceLabel, pageWidth - rightMargin - 150, py + 10, { width: 140, align: 'right' });

      doc.fontSize(9).fillColor(COLOR_PRIMARY);
      doc.text(
        `Your Estimate: $${estimate.pricing.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - rightMargin - 150, py + 30, { width: 140, align: 'right' }
      );

      py += 64;

      // Sources table
      if (ai.sources && ai.sources.length > 0) {
        doc.fontSize(11).fillColor(COLOR_DARK).text('PRICING SOURCES', leftMargin, py);
        py += 16;

        // Table header
        const srcColWidths = [contentWidth * 0.25, contentWidth * 0.2, contentWidth * 0.55];
        const srcColX = [leftMargin, leftMargin + srcColWidths[0], leftMargin + srcColWidths[0] + srcColWidths[1]];

        doc.rect(leftMargin, py, contentWidth, 20).fill(COLOR_PRIMARY);
        doc.fontSize(9).fillColor('#FFFFFF');
        doc.text('Source', srcColX[0] + 4, py + 5, { width: srcColWidths[0] - 8, lineBreak: false });
        doc.text('Price', srcColX[1] + 4, py + 5, { width: srcColWidths[1] - 8, lineBreak: false });
        doc.text('Description', srcColX[2] + 4, py + 5, { width: srcColWidths[2] - 8, lineBreak: false });
        py += 20;

        const srcRowHeight = 18;
        for (let i = 0; i < ai.sources.length; i++) {
          const src = ai.sources[i];

          if (i % 2 === 1) {
            doc.rect(leftMargin, py, contentWidth, srcRowHeight).fill('#F9F9F9');
          }
          doc.rect(leftMargin, py, contentWidth, srcRowHeight).stroke('#E0E0E0');

          doc.font('Helvetica').fontSize(9).fillColor(COLOR_DARK);
          doc.text(truncate(src.source, 25), srcColX[0] + 4, py + 4, { width: srcColWidths[0] - 8, lineBreak: false });
          doc.font('Helvetica-Bold');
          doc.text(
            `$${src.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            srcColX[1] + 4, py + 4, { width: srcColWidths[1] - 8, lineBreak: false }
          );
          doc.font('Helvetica');
          doc.text(truncate(src.description, 50), srcColX[2] + 4, py + 4, { width: srcColWidths[2] - 8, lineBreak: false });
          py += srcRowHeight;
        }
      }

      // Footer note
      const pricingNote = `Comparable pricing data retrieved ${ai.lastUpdated ? new Date(ai.lastUpdated).toLocaleDateString() : 'N/A'}. Prices reflect market averages and may vary based on project specifics, site conditions, and material availability.`;
      doc.fontSize(7).fillColor(COLOR_GRAY);
      doc.text(pricingNote, leftMargin, pageHeight - 40, { width: contentWidth });
    }

    doc.end();
  });
}
