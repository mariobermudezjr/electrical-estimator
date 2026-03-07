import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import OutboundEmail from '@/lib/db/models/OutboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email/outbound';

// POST /api/outbound-email/[id]/send - Send a draft email
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const email = await OutboundEmail.findOne({ _id: id, userId });
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (email.folder === 'sent') {
      return NextResponse.json({ error: 'Email already sent' }, { status: 400 });
    }

    if (email.folder === 'deleted') {
      return NextResponse.json({ error: 'Cannot send a deleted email' }, { status: 400 });
    }

    try {
      const result = await sendEmail({
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: email.attachments?.map((a) => ({
          filename: a.originalName || a.filename,
          content: a.data,
        })),
      });

      email.folder = 'sent';
      email.resendId = result?.id;
      email.sentAt = new Date();
      email.errorMessage = undefined;
      await email.save();

      return NextResponse.json({
        success: true,
        data: email.toJSON(),
        resendId: result?.id,
      });
    } catch (sendError) {
      email.errorMessage = sendError instanceof Error ? sendError.message : 'Send failed';
      await email.save();

      return NextResponse.json(
        { error: 'Failed to send email', details: email.errorMessage },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('POST /api/outbound-email/[id]/send error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
