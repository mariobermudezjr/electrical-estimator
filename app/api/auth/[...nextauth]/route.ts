import { NextRequest, NextResponse } from 'next/server';

// Temporary mock auth endpoints while we debug NextAuth v5 beta issues
// This allows us to test MongoDB integration without auth blocking
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('nextauth')?.[0];

  // Mock session endpoint
  if (path === 'session') {
    return NextResponse.json({
      user: {
        id: 'temp-user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Mock providers endpoint
  if (path === 'providers') {
    return NextResponse.json({});
  }

  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
