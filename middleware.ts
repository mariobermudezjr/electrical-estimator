import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For now, allow all requests through
  // NextAuth v5 beta middleware has compatibility issues with Next.js 16
  // We'll rely on server-side session checks in API routes and pages instead
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/estimates/:path*',
    '/settings',
    '/api/estimates/:path*',
    '/api/settings/:path*',
    '/api/ai/:path*',
  ],
};
