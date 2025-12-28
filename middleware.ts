import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';

// Force Node.js runtime for middleware
export const runtime = 'nodejs';

export default async function middleware(req: NextRequest) {
  const session = await auth();
  const { nextUrl } = req;
  const isAuthenticated = !!session;

  // Public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/auth/verify-request'];
  const isPublicPath = publicPaths.some(path => nextUrl.pathname.startsWith(path));

  // If not authenticated and trying to access protected route, redirect to signin
  if (!isAuthenticated && !isPublicPath) {
    const signInUrl = new URL('/auth/signin', nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If authenticated and trying to access signin, redirect to home
  if (isAuthenticated && nextUrl.pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/', nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/estimates/:path*',
    '/settings',
    '/auth/signin',
    '/api/estimates/:path*',
    '/api/settings/:path*',
    '/api/ai/:path*',
    '/api/templates/:path*',
  ],
};
