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

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Convert file to buffer if provided
    let pdfBuffer: Buffer | null = null;
    if (pdfFile) {
      pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      console.log('[send-email] PDF size:', pdfBuffer.length, 'bytes');
    } else {
      console.log('[send-email] No PDF attachment (too large for payload limit)');
    }
    console.log('[send-email] to:', to, 'subject:', subject?.slice(0, 50));

    await connectDB();

    // Send via Resend
    let result;
    try {
      result = await sendEmail({
        from: FROM_EMAIL,
        to: [to],
        bcc: [OWNER_EMAIL],
        subject,
        html,
        text,
        ...(pdfBuffer ? {
          attachments: [{
            filename: filename || 'estimate.pdf',
            content: pdfBuffer,
          }],
        } : {}),
      });
      console.log('[send-email] Resend success, id:', result?.id);
    } catch (sendErr) {
      console.error('[send-email] Resend API error:', sendErr);
      return NextResponse.json(
        { error: `Resend send failed: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}` },
        { status: 502 }
      );
    }

    // Save a record in OutboundEmail
    try {
      await OutboundEmail.create({
        userId,
        folder: 'sent',
        from: FROM_EMAIL,
        to: [to],
        bcc: [OWNER_EMAIL],
        subject,
        html,
        text,
        attachments: pdfBuffer ? [{
          filename: filename || 'estimate.pdf',
          originalName: filename || 'estimate.pdf',
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
        }] : [],
        estimateId,
        resendId: result?.id,
        sentAt: new Date(),
      });
    } catch (dbErr) {
      console.error('[send-email] DB save error (email was sent):', dbErr);
      // Email was sent successfully, just failed to save record — don't fail the request
    }

    return NextResponse.json({ success: true, resendId: result?.id });
  } catch (error) {
    console.error('[send-email] Unexpected error:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
