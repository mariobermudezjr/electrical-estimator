import mongoose, { Schema, Document, Model } from 'mongoose';
import { Estimate as EstimateType, WorkType } from '@/types/estimate';

export interface IEstimate extends Omit<EstimateType, 'id' | 'createdAt' | 'updatedAt'>, Document {
  userId: string; // Changed to string temporarily for mock auth
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['labor', 'material'], required: true }
}, { _id: false });

const EstimateSchema = new Schema<IEstimate>(
  {
    userId: {
      type: String, // Changed to String temporarily for mock auth
      // type: Schema.Types.ObjectId,
      // ref: 'User',
      required: true,
      index: true
    },
    clientName: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true
    },
    clientEmail: {
      type: String,
      trim: true
    },
    clientPhone: {
      type: String,
      trim: true
    },
    projectAddress: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      maxlength: 2,
      uppercase: true,
      trim: true
    },
    workType: {
      type: String,
      enum: Object.values(WorkType),
      required: true
    },
    scopeOfWork: {
      type: String,
      required: true
    },
    pricing: {
      labor: {
        hours: { type: Number, required: true, min: 0 },
        hourlyRate: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
        description: { type: String, required: true }
      },
      materials: {
        items: [LineItemSchema],
        subtotal: { type: Number, required: true, min: 0 }
      },
      subtotal: { type: Number, required: true, min: 0 },
      markupPercentage: { type: Number, required: true, min: 0 },
      markupAmount: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 }
    },
    aiPricing: {
      averagePrice: { type: Number },
      priceRange: {
        min: { type: Number },
        max: { type: Number }
      },
      sources: [{
        source: { type: String },
        price: { type: Number },
        url: { type: String },
        description: { type: String }
      }],
      confidence: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      lastUpdated: { type: Date },
      searchQuery: { type: String }
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'approved', 'rejected'],
      default: 'draft',
      required: true
    },
    notes: { type: String }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.userId; // Don't expose userId in JSON responses
        return ret;
      }
    }
  }
);

// Compound index for efficient user queries
EstimateSchema.index({ userId: 1, createdAt: -1 });
EstimateSchema.index({ status: 1 });

const Estimate: Model<IEstimate> =
  mongoose.models.Estimate || mongoose.model<IEstimate>('Estimate', EstimateSchema);

export default Estimate;
