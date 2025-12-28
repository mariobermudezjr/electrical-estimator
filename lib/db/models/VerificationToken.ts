import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVerificationToken extends Document {
  identifier: string;
  token: string;
  expires: Date;
}

const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    identifier: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    expires: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: false
  }
);

// Compound index for token lookups
VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });

// TTL index to automatically delete expired tokens
VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

const VerificationToken: Model<IVerificationToken> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>('VerificationToken', VerificationTokenSchema);

export default VerificationToken;
