import mongoose, { Schema, Document, Model } from 'mongoose';
import { Client as ClientType } from '@/types/client';

export interface IClient extends Omit<ClientType, 'id' | 'createdAt' | 'updatedAt'>, Document {
  userId: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const { _id, __v, userId, ...rest } = ret;
        return {
          id: _id.toString(),
          ...rest,
        };
      },
    },
  }
);

ClientSchema.index({ userId: 1, name: 1 });

const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
