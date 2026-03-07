import mongoose, { Schema, Document, Model } from 'mongoose';

export type EmailFolder = 'draft' | 'queued' | 'sent' | 'deleted';

export interface IAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  data: string; // base64
}

export interface IOutboundEmail extends Document {
  userId: mongoose.Types.ObjectId | string;
  folder: EmailFolder;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments: IAttachment[];
  estimateId?: mongoose.Types.ObjectId | string;
  resendId?: string;
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: String, required: true },
}, { _id: false });

const OutboundEmailSchema = new Schema<IOutboundEmail>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    folder: {
      type: String,
      enum: ['draft', 'queued', 'sent', 'deleted'],
      default: 'draft',
      required: true,
    },
    from: { type: String, required: true, trim: true },
    to: [{ type: String, required: true, trim: true }],
    cc: [{ type: String, trim: true }],
    bcc: [{ type: String, trim: true }],
    subject: { type: String, required: true, trim: true },
    html: { type: String },
    text: { type: String },
    attachments: [AttachmentSchema],
    estimateId: {
      type: Schema.Types.ObjectId,
      ref: 'Estimate',
    },
    resendId: { type: String },
    sentAt: { type: Date },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { _id, __v, userId, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

OutboundEmailSchema.index({ userId: 1, folder: 1, createdAt: -1 });

const OutboundEmail: Model<IOutboundEmail> =
  mongoose.models.OutboundEmail || mongoose.model<IOutboundEmail>('OutboundEmail', OutboundEmailSchema);

export default OutboundEmail;
