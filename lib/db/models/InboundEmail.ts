import mongoose, { Schema, Document, Model } from 'mongoose';

export type InboxFolder = 'inbox' | 'archive' | 'deleted';

export interface IInboundAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  data: string; // base64
}

export interface IInboundEmail extends Document {
  userId: mongoose.Types.ObjectId | string;
  folder: InboxFolder;
  resendEmailId?: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments: IInboundAttachment[];
  isRead: boolean;
  isStarred: boolean;
  receivedAt: Date;
  estimateId?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const InboundAttachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: String, required: true },
  },
  { _id: false }
);

const InboundEmailSchema = new Schema<IInboundEmail>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    folder: {
      type: String,
      enum: ['inbox', 'archive', 'deleted'],
      default: 'inbox',
      required: true,
    },
    resendEmailId: { type: String },
    from: { type: String, required: true, trim: true },
    fromName: { type: String, trim: true },
    to: [{ type: String, required: true, trim: true }],
    cc: [{ type: String, trim: true }],
    subject: { type: String, required: true, trim: true },
    html: { type: String },
    text: { type: String },
    attachments: [InboundAttachmentSchema],
    isRead: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    receivedAt: { type: Date, required: true },
    estimateId: {
      type: Schema.Types.ObjectId,
      ref: 'Estimate',
    },
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

InboundEmailSchema.index({ userId: 1, folder: 1, receivedAt: -1 });
InboundEmailSchema.index({ userId: 1, isRead: 1 });

const InboundEmail: Model<IInboundEmail> =
  mongoose.models.InboundEmail ||
  mongoose.model<IInboundEmail>('InboundEmail', InboundEmailSchema);

export default InboundEmail;
