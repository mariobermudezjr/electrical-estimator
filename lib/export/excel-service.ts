import * as XLSX from 'xlsx';
import { Estimate } from '@/types/estimate';

export function generateEstimateExcel(estimate: Estimate): Blob {
  const workbook = XLSX.utils.book_new();

  // Estimate summary sheet
  const summaryData = [
    ['ELECTRICAL ESTIMATE'],
    [],
    ['Client Information'],
    ['Name', estimate.clientName],
    ['Phone', estimate.clientPhone || ''],
    ['Email', estimate.clientEmail || ''],
    [],
    ['Project Information'],
    ['Address', estimate.projectAddress],
    ['City', estimate.city],
    ['State', estimate.state || ''],
    ['Work Type', estimate.workType.replace(/_/g, ' ')],
    ['Date', new Date(estimate.createdAt).toLocaleDateString()],
    ['Status', estimate.status.toUpperCase()],
    [],
    ['Scope of Work'],
    [estimate.scopeOfWork],
    [],
    ['Pricing Breakdown'],
    ['Category', 'Description', 'Quantity', 'Rate', 'Amount'],
    [
      'Labor',
      `${estimate.pricing.labor.hours} hours`,
      estimate.pricing.labor.hours,
      estimate.pricing.labor.hourlyRate,
      estimate.pricing.labor.total,
    ],
  ];

  // Add material rows
  estimate.pricing.materials.items.forEach((item) => {
    summaryData.push([
      'Material',
      item.description || 'Material',
      item.quantity,
      item.unitCost,
      item.total,
    ]);
  });

  // Add summary rows
  summaryData.push(
    [],
    ['', '', '', 'Subtotal', estimate.pricing.subtotal],
    ['', '', '', `Markup (${estimate.pricing.markupPercentage}%)`, estimate.pricing.markupAmount],
    ['', '', '', 'TOTAL', estimate.pricing.total]
  );

  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estimate');

  // If AI pricing data exists, add it to a second sheet
  if (estimate.aiPricing) {
    const aiData = [
      ['AI PRICING RESEARCH'],
      [],
      ['Search Query', estimate.aiPricing.searchQuery],
      ['Last Updated', new Date(estimate.aiPricing.lastUpdated).toLocaleDateString()],
      ['Confidence', estimate.aiPricing.confidence.toUpperCase()],
      [],
      ['Average Price', estimate.aiPricing.averagePrice],
      ['Price Range Min', estimate.aiPricing.priceRange.min],
      ['Price Range Max', estimate.aiPricing.priceRange.max],
      [],
      ['Sources'],
      ['Source', 'Price', 'Description', 'URL'],
    ];

    estimate.aiPricing.sources.forEach((source) => {
      aiData.push([
        source.source,
        source.price,
        source.description,
        source.url || '',
      ]);
    });

    const aiWorksheet = XLSX.utils.aoa_to_sheet(aiData);
    aiWorksheet['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 40 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(workbook, aiWorksheet, 'AI Pricing');
  }

  // Convert to blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadExcel(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
