import { WorkType } from './estimate';

export interface TemplateMaterial {
  description: string;
  quantity: number;
  unitCost: number;
  notes?: string;
}

export interface ScopeTemplate {
  id: string;
  name: string;
  description?: string;
  workTypes: WorkType[];
  scopeText: string;
  suggestedLaborHours: number;
  materials: TemplateMaterial[];
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// For creating templates
export interface CreateTemplateInput {
  name: string;
  description?: string;
  workTypes: WorkType[];
  scopeText: string;
  suggestedLaborHours: number;
  materials: TemplateMaterial[];
}

// For updating templates
export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  isActive?: boolean;
}
