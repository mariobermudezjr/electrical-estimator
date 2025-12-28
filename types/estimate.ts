export enum WorkType {
  RESIDENTIAL_PANEL_UPGRADE = 'residential_panel_upgrade',
  RESIDENTIAL_REWIRING = 'residential_rewiring',
  RESIDENTIAL_OUTLETS = 'residential_outlets',
  SERVICE_CALL = 'service_call',
  REPAIR = 'repair',
  COMMERCIAL_OFFICE = 'commercial_office',
  COMMERCIAL_RETAIL = 'commercial_retail',
  COMMERCIAL_INDUSTRIAL = 'commercial_industrial',
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  total: number;
  type: 'labor' | 'material';
}

export interface LaborEstimate {
  hours: number;
  hourlyRate: number;
  total: number;
  description: string;
}

export interface MaterialEstimate {
  items: LineItem[];
  subtotal: number;
}

export interface PricingBreakdown {
  labor: LaborEstimate;
  materials: MaterialEstimate;
  subtotal: number;
  markupPercentage: number;
  markupAmount: number;
  total: number;
}

export interface AIPricingData {
  averagePrice: number;
  priceRange: { min: number; max: number };
  sources: Array<{
    source: string;
    price: number;
    url?: string;
    description: string;
  }>;
  confidence: 'low' | 'medium' | 'high';
  lastUpdated: Date;
  searchQuery: string;
}

export interface Estimate {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  projectAddress: string;
  city: string;
  state?: string;
  workType: WorkType;
  scopeOfWork: string;
  pricing: PricingBreakdown;
  aiPricing?: AIPricingData;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

// Serializable version for local storage
export interface StorageEstimate extends Omit<Estimate, 'createdAt' | 'updatedAt' | 'aiPricing'> {
  createdAt: string;
  updatedAt: string;
  aiPricing?: Omit<AIPricingData, 'lastUpdated'> & { lastUpdated: string };
}
