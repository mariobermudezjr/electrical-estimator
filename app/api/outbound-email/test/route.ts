import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/outbound';

// POST /api/outbound-email/test - Quick test endpoint (no auth required)
// Send a test email to verify Resend is working with your domain
//
// Example body:
// {
//   "to": "your-email@gmail.com",
//   "subject": "Test from Electrical Estimates",
//   "text": "This is a test email!"
// }
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const from = body.from || process.env.OUTBOUND_FROM_EMAIL;
    if (!from) {
      return NextResponse.json(
        { error: 'Set OUTBOUND_FROM_EMAIL in .env or pass "from" in the body' },
        { status: 400 }
      );
    }

    if (!body.to) {
      return NextResponse.json({ error: '"to" is required' }, { status: 400 });
    }

    const result = await sendEmail({
      from,
      to: Array.isArray(body.to) ? body.to : [body.to],
      subject: body.subject || 'Test Email',
      text: body.text || 'This is a test email from the Electrical Estimates app.',
      html: body.html,
      attachments: body.attachments,
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent!',
      resendId: result?.id,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}
