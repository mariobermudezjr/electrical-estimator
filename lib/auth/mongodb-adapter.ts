import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from 'next-auth/adapters';
import { ObjectId } from 'mongodb';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Account from '@/lib/db/models/Account';
import VerificationTokenModel from '@/lib/db/models/VerificationToken';

export function MongoDBAdapter(): Adapter {
  return {
    async createUser(user) {
      await connectDB();
      const newUser = await User.create({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image
      });
      return {
        id: newUser._id.toString(),
        email: newUser.email,
        emailVerified: newUser.emailVerified ?? null,
        name: newUser.name,
        image: newUser.image
      } as AdapterUser;
    },

    async getUser(id) {
      await connectDB();
      const user = await User.findById(id);
      if (!user) return null;
      return {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        name: user.name,
        image: user.image
      } as AdapterUser;
    },

    async getUserByEmail(email) {
      await connectDB();
      const user = await User.findOne({ email });
      if (!user) return null;
      return {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        name: user.name,
        image: user.image
      } as AdapterUser;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      await connectDB();
      const account = await Account.findOne({ provider, providerAccountId });
      if (!account) return null;
      const user = await User.findById(account.userId);
      if (!user) return null;
      return {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        name: user.name,
        image: user.image
      } as AdapterUser;
    },

    async updateUser(user) {
      await connectDB();
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        {
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image
        },
        { new: true }
      );
      if (!updatedUser) throw new Error('User not found');
      return {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified ?? null,
        name: updatedUser.name,
        image: updatedUser.image
      } as AdapterUser;
    },

    async deleteUser(userId) {
      await connectDB();
      await User.findByIdAndDelete(userId);
      await Account.deleteMany({ userId: new ObjectId(userId) });
    },

    async linkAccount(account) {
      await connectDB();
      await Account.create({
        userId: new ObjectId(account.userId),
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state
      });
      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await connectDB();
      await Account.findOneAndDelete({ provider, providerAccountId });
    },

    async createVerificationToken({ identifier, expires, token }) {
      await connectDB();
      await VerificationTokenModel.create({
        identifier,
        token,
        expires
      });
      return { identifier, token, expires } as VerificationToken;
    },

    async useVerificationToken({ identifier, token }) {
      await connectDB();
      const verificationToken = await VerificationTokenModel.findOneAndDelete({
        identifier,
        token
      });
      if (!verificationToken) return null;
      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires
      } as VerificationToken;
    },

    // Session methods (not used with JWT strategy)
    async createSession(session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      throw new Error('Session strategy not supported - using JWT');
    },
    async getSessionAndUser(sessionToken: string) {
      return null;
    },
    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>) {
      throw new Error('Session strategy not supported - using JWT');
    },
    async deleteSession(sessionToken: string) {
      // No-op for JWT strategy
    }
  };
}
