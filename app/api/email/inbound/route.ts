import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import InboundEmail from '@/lib/db/models/InboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/email/inbound?folder=inbox&search=...
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const folder = request.nextUrl.searchParams.get('folder') || 'inbox';
    const search = request.nextUrl.searchParams.get('search') || '';

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId, folder };

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } },
        { fromName: { $regex: search, $options: 'i' } },
        { text: { $regex: search, $options: 'i' } },
      ];
    }

    const emails = await InboundEmail.find(query)
      .select({ 'attachments.data': 0, html: 0 })
      .sort({ receivedAt: -1 })
      .limit(100)
      .lean();

    const transformed = emails.map((e) => ({
      ...e,
      id: e._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    console.error('GET /api/email/inbound error:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}
