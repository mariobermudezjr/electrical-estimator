export interface CalculationInput {
  laborHours: number;
  hourlyRate: number;
  materialItems: Array<{
    description: string;
    quantity: number;
    unitCost: number;
  }>;
  markupPercentage: number;
  clientProvidedMaterials?: boolean;
}

export interface MaterialItem {
  description: string;
  quantity: number;
  unitCost: number;
}
