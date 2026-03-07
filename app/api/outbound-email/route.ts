import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import OutboundEmail from '@/lib/db/models/OutboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/outbound-email?folder=draft|queued|sent|deleted
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const folder = request.nextUrl.searchParams.get('folder') || 'draft';

    await connectDB();

    const emails = await OutboundEmail.find({ userId, folder })
      .select({ 'attachments.data': 0 })
      .sort({ createdAt: -1 })
      .lean();

    const transformed = emails.map((e) => ({
      ...e,
      id: e._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    console.error('GET /api/outbound-email error:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

// POST /api/outbound-email - Create a draft email
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const body = await request.json();

    await connectDB();

    const email = await OutboundEmail.create({
      userId,
      folder: 'draft',
      from: body.from,
      to: Array.isArray(body.to) ? body.to : [body.to],
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: body.html,
      text: body.text,
      attachments: body.attachments || [],
      estimateId: body.estimateId,
    });

    return NextResponse.json({ success: true, data: email.toJSON() }, { status: 201 });
  } catch (error) {
    console.error('POST /api/outbound-email error:', error);
    return NextResponse.json({ error: 'Failed to create email' }, { status: 500 });
  }
}
