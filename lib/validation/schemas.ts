import { z } from 'zod';
import { WorkType } from '@/types/estimate';

// Line Item Schema
const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitCost: z.number().min(0),
  total: z.number().min(0),
  type: z.enum(['labor', 'material'])
});

// Labor Estimate Schema
const laborEstimateSchema = z.object({
  hours: z.number().min(0),
  hourlyRate: z.number().min(0),
  total: z.number().min(0),
  description: z.string()
});

// Material Estimate Schema
const materialEstimateSchema = z.object({
  items: z.array(lineItemSchema),
  subtotal: z.number().min(0)
});

// Pricing Breakdown Schema
const pricingBreakdownSchema = z.object({
  labor: laborEstimateSchema,
  materials: materialEstimateSchema,
  subtotal: z.number().min(0),
  markupPercentage: z.number().min(0),
  markupAmount: z.number().min(0),
  total: z.number().min(0)
});

// AI Pricing Data Schema (optional)
const aiPricingDataSchema = z.object({
  averagePrice: z.number(),
  priceRange: z.object({
    min: z.number(),
    max: z.number()
  }),
  sources: z.array(z.object({
    source: z.string(),
    price: z.number(),
    url: z.string().optional(),
    description: z.string()
  })),
  confidence: z.enum(['low', 'medium', 'high']),
  lastUpdated: z.date(),
  searchQuery: z.string()
}).optional();

// Create Estimate Schema
export const createEstimateSchema = z.object({
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  projectAddress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().max(2).optional(),
  workType: z.nativeEnum(WorkType),
  scopeOfWork: z.string().min(1),
  pricing: pricingBreakdownSchema,
  aiPricing: aiPricingDataSchema,
  status: z.enum(['draft', 'sent', 'approved', 'rejected']).default('draft'),
  notes: z.string().optional()
});

// Update Estimate Schema (all fields optional)
export const updateEstimateSchema = createEstimateSchema.partial();

// Settings Schema (without API keys - those are server-side only)
export const settingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyEmail: z.string().email().optional().or(z.literal('')),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  defaultHourlyRate: z.number().min(0).optional(),
  defaultMarkupPercentage: z.number().min(0).max(100).optional(),
  preferredAIProvider: z.enum(['openai', 'anthropic']).optional(),
  theme: z.enum(['dark', 'light']).optional()
});

// AI Pricing Request Schema
export const aiPricingRequestSchema = z.object({
  scopeOfWork: z.string().min(1),
  city: z.string().min(1),
  workType: z.nativeEnum(WorkType),
  provider: z.enum(['openai', 'anthropic']).optional(),
  estimateId: z.string().optional()
});

// Template Material Schema
const templateMaterialSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().min(0).default(1),
  unitCost: z.number().min(0).default(0),
  notes: z.string().max(500).optional()
});

// Create Template Schema
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  workTypes: z.array(z.nativeEnum(WorkType)).min(1),
  scopeText: z.string().min(1).max(5000),
  suggestedLaborHours: z.number().min(0).default(8),
  materials: z.array(templateMaterialSchema).default([])
});

// Update Template Schema
export const updateTemplateSchema = createTemplateSchema.partial().extend({
  isActive: z.boolean().optional()
});

// Sync Estimates Schema (for migration)
export const syncEstimatesSchema = z.object({
  estimates: z.array(createEstimateSchema)
});
