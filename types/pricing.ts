export interface CalculationInput {
  laborHours: number;
  hourlyRate: number;
  materialItems: Array<{
    description: string;
    quantity: number;
    unitCost: number;
  }>;
  markupPercentage: number;
}

export interface MaterialItem {
  description: string;
  quantity: number;
  unitCost: number;
}
