import mongoose, { Schema, Document, Model } from 'mongoose';

export type JobStatus = 'scheduled' | 'completed' | 'cancelled';

export interface IScheduledJob extends Document {
  userId: mongoose.Types.ObjectId | string;
  estimateId?: mongoose.Types.ObjectId | string;
  clientId?: mongoose.Types.ObjectId | string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  location: string;
  status: JobStatus;
  reminderDayBeforeSent: boolean;
  reminderMorningOfSent: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledJobSchema = new Schema<IScheduledJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    estimateId: {
      type: Schema.Types.ObjectId,
      ref: 'Estimate',
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
    },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, trim: true },
    clientPhone: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      required: true,
    },
    reminderDayBeforeSent: { type: Boolean, default: false },
    reminderMorningOfSent: { type: Boolean, default: false },
    notes: { type: String },
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

ScheduledJobSchema.index({ userId: 1, scheduledDate: 1 });
ScheduledJobSchema.index({ scheduledDate: 1, status: 1, reminderDayBeforeSent: 1 });
ScheduledJobSchema.index({ scheduledDate: 1, status: 1, reminderMorningOfSent: 1 });

const ScheduledJob: Model<IScheduledJob> =
  mongoose.models.ScheduledJob ||
  mongoose.model<IScheduledJob>('ScheduledJob', ScheduledJobSchema);

export default ScheduledJob;
