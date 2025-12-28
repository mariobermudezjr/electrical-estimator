import mongoose, { Schema, Document, Model } from 'mongoose';
import { WorkType } from '@/types/estimate';

export interface IScopeTemplate extends Document {
  userId: string;
  name: string;
  description?: string;
  workTypes: WorkType[];
  scopeText: string;
  suggestedLaborHours: number;
  materials: Array<{
    description: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScopeTemplateSchema = new Schema<IScopeTemplate>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true
    },
    workTypes: [{
      type: String,
      enum: Object.values(WorkType),
      required: true
    }],
    scopeText: {
      type: String,
      required: true,
      maxlength: 5000
    },
    suggestedLaborHours: {
      type: Number,
      required: true,
      min: 0,
      default: 8
    },
    materials: [{
      description: { type: String, required: true, trim: true },
      quantity: { type: Number, required: true, min: 0, default: 1 },
      unitCost: { type: Number, required: true, min: 0, default: 0 },
      notes: { type: String, trim: true }
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.userId;
        return ret;
      }
    }
  }
);

// Compound indexes for efficient queries
ScopeTemplateSchema.index({ userId: 1, isActive: 1, createdAt: -1 });
ScopeTemplateSchema.index({ userId: 1, workTypes: 1, isActive: 1 });
ScopeTemplateSchema.index({ userId: 1, usageCount: -1 });

const ScopeTemplate: Model<IScopeTemplate> =
  mongoose.models.ScopeTemplate || mongoose.model<IScopeTemplate>('ScopeTemplate', ScopeTemplateSchema);

export default ScopeTemplate;
