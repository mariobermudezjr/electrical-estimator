import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import InboundEmail from '@/lib/db/models/InboundEmail';
import OutboundEmail from '@/lib/db/models/OutboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/email/trash - Get deleted emails from both inbound and outbound
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const search = request.nextUrl.searchParams.get('search') || '';

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchFilter: any = search
      ? {
          $or: [
            { subject: { $regex: search, $options: 'i' } },
            { from: { $regex: search, $options: 'i' } },
            { text: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [inbound, outbound] = await Promise.all([
      InboundEmail.find({ userId, folder: 'deleted', ...searchFilter })
        .select({ 'attachments.data': 0, html: 0 })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      OutboundEmail.find({ userId, folder: 'deleted', ...searchFilter })
        .select({ 'attachments.data': 0, html: 0 })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const transformedInbound = inbound.map((e) => ({
      ...e,
      id: e._id.toString(),
      _id: undefined,
    }));

    const transformedOutbound = outbound.map((e) => ({
      ...e,
      id: e._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: { inbound: transformedInbound, outbound: transformedOutbound },
    });
  } catch (error) {
    console.error('GET /api/email/trash error:', error);
    return NextResponse.json({ error: 'Failed to fetch trash' }, { status: 500 });
  }
}
