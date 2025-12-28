import { CalculationInput } from '@/types/pricing';
import { PricingBreakdown, LineItem } from '@/types/estimate';

export function calculateEstimate(input: CalculationInput): PricingBreakdown {
  // Calculate labor total
  const laborTotal = input.laborHours * input.hourlyRate;

  // Calculate materials total
  const materialItems: LineItem[] = input.materialItems.map((item, idx) => ({
    id: `mat-${Date.now()}-${idx}`,
    description: item.description,
    quantity: item.quantity,
    unitCost: item.unitCost,
    total: item.quantity * item.unitCost,
    type: 'material' as const,
  }));

  const materialsSubtotal = materialItems.reduce((sum, item) => sum + item.total, 0);

  // Calculate subtotal before markup
  const subtotal = laborTotal + materialsSubtotal;

  // Calculate markup
  const markupAmount = subtotal * (input.markupPercentage / 100);

  // Calculate final total
  const total = subtotal + markupAmount;

  return {
    labor: {
      hours: input.laborHours,
      hourlyRate: input.hourlyRate,
      total: laborTotal,
      description: `${input.laborHours} hours @ $${input.hourlyRate.toFixed(2)}/hr`,
    },
    materials: {
      items: materialItems,
      subtotal: materialsSubtotal,
    },
    subtotal,
    markupPercentage: input.markupPercentage,
    markupAmount,
    total,
  };
}

export function recalculatePricing(
  laborHours: number,
  hourlyRate: number,
  materials: LineItem[],
  markupPercentage: number
): PricingBreakdown {
  const laborTotal = laborHours * hourlyRate;
  const materialsSubtotal = materials.reduce((sum, item) => sum + item.total, 0);
  const subtotal = laborTotal + materialsSubtotal;
  const markupAmount = subtotal * (markupPercentage / 100);
  const total = subtotal + markupAmount;

  return {
    labor: {
      hours: laborHours,
      hourlyRate,
      total: laborTotal,
      description: `${laborHours} hours @ $${hourlyRate.toFixed(2)}/hr`,
    },
    materials: {
      items: materials,
      subtotal: materialsSubtotal,
    },
    subtotal,
    markupPercentage,
    markupAmount,
    total,
  };
}
