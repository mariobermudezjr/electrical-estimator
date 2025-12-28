import mongoose, { Schema, Document, Model } from 'mongoose';

// Settings interface without API keys (stored server-side only)
export interface ISettings extends Document {
  userId: string; // Changed to string temporarily for mock auth
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  defaultHourlyRate: number;
  defaultMarkupPercentage: number;
  preferredAIProvider: 'openai' | 'anthropic';
  theme: 'dark' | 'light';
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: String, // Changed to String temporarily for mock auth
      // type: Schema.Types.ObjectId,
      // ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    companyName: {
      type: String,
      required: true,
      default: 'My Electrical Company',
      trim: true
    },
    companyEmail: {
      type: String,
      trim: true
    },
    companyPhone: {
      type: String,
      trim: true
    },
    companyAddress: {
      type: String,
      trim: true
    },
    defaultHourlyRate: {
      type: Number,
      required: true,
      min: 0,
      default: 75
    },
    defaultMarkupPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 20
    },
    preferredAIProvider: {
      type: String,
      enum: ['openai', 'anthropic'],
      default: 'openai'
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const { _id, __v, userId, ...rest } = ret;
        return rest;
      }
    }
  }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
