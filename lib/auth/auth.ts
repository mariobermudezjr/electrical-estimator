import NextAuth, { NextAuthConfig } from 'next-auth';
import { MongoDBAdapter } from './mongodb-adapter';
import Resend from 'next-auth/providers/resend';
import Google from 'next-auth/providers/google';

const providers: NextAuthConfig['providers'] = [
  Resend({
    apiKey: process.env.EMAIL_SERVER_PASSWORD,
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  }),
];

// Add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(),
  providers,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      console.log('New user created:', user.email);
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
