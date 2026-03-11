import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import OutboundEmail from '@/lib/db/models/OutboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email/outbound';

const OWNER_EMAIL = 'mbermudez91@gmail.com';
const FROM_EMAIL = process.env.OUTBOUND_FROM_EMAIL || 'estimates@charlieselectric.online';

// POST /api/estimates/[id]/send-email
// Accepts FormData with PDF file + email metadata, sends via Resend
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id: estimateId } = await params;

    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File | null;
    const to = formData.get('to') as string;
    const clientName = formData.get('clientName') as string;
    const subject = formData.get('subject') as string;
    const html = formData.get('html') as string;
    const text = formData.get('text') as string;
    const filename = formData.get('filename') as string;

    if (!pdfFile || !to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: pdf, to, subject' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    await connectDB();

    // Send via Resend
    const result = await sendEmail({
      from: FROM_EMAIL,
      to: [to],
      bcc: [OWNER_EMAIL],
      subject,
      html,
      text,
      attachments: [{
        filename: filename || 'estimate.pdf',
        content: pdfBuffer,
      }],
    });

    // Save a record in OutboundEmail (without the large attachment data)
    await OutboundEmail.create({
      userId,
      folder: 'sent',
      from: FROM_EMAIL,
      to: [to],
      bcc: [OWNER_EMAIL],
      subject,
      html,
      text,
      attachments: [{
        filename: filename || 'estimate.pdf',
        originalName: filename || 'estimate.pdf',
        mimeType: 'application/pdf',
        size: pdfBuffer.length,
        // Intentionally omit data to avoid storing large blobs
      }],
      estimateId,
      resendId: result?.id,
      sentAt: new Date(),
    });

    return NextResponse.json({ success: true, resendId: result?.id });
  } catch (error) {
    console.error('POST /api/estimates/[id]/send-email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
