import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import InboundEmail from '@/lib/db/models/InboundEmail';
import OutboundEmail from '@/lib/db/models/OutboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/email/counts - Get unread/total counts per folder
export async function GET() {
  try {
    const userId = await getAuthenticatedUser();

    await connectDB();

    const [inboxUnread, drafts, sent, archiveInbound, archiveOutbound, trashInbound, trashOutbound] =
      await Promise.all([
        InboundEmail.countDocuments({ userId, folder: 'inbox', isRead: false }),
        OutboundEmail.countDocuments({ userId, folder: 'draft' }),
        OutboundEmail.countDocuments({ userId, folder: 'sent' }),
        InboundEmail.countDocuments({ userId, folder: 'archive' }),
        OutboundEmail.countDocuments({ userId, folder: 'archive' }),
        InboundEmail.countDocuments({ userId, folder: 'deleted' }),
        OutboundEmail.countDocuments({ userId, folder: 'deleted' }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        inbox: inboxUnread,
        drafts,
        sent,
        archive: archiveInbound + archiveOutbound,
        trash: trashInbound + trashOutbound,
      },
    });
  } catch (error) {
    console.error('GET /api/email/counts error:', error);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
