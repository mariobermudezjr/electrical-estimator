import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScheduledJob from '@/lib/db/models/ScheduledJob';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email/outbound';

const OWNER_EMAIL = 'mbermudez91@gmail.com';
const FROM_EMAIL = process.env.OUTBOUND_FROM_EMAIL || 'estimates@charlieselectric.online';

// POST /api/calendar/[id]/notify - Manually send reminder email
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const job = await ScheduledJob.findOne({ _id: id, userId });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.clientEmail) {
      return NextResponse.json({ error: 'No client email on this job' }, { status: 400 });
    }

    const dateStr = job.scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Los_Angeles',
    });

    await sendEmail({
      from: FROM_EMAIL,
      to: [job.clientEmail],
      cc: [OWNER_EMAIL],
      subject: `Reminder: ${job.title} — ${dateStr}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #333;">Work Day Reminder</h2>
          <p>Hi ${job.clientName},</p>
          <p>This is a friendly reminder about your upcoming scheduled work:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Job</td><td style="padding: 8px;">${job.title}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Date</td><td style="padding: 8px;">${dateStr}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Time</td><td style="padding: 8px;">${job.startTime} — ${job.endTime}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Location</td><td style="padding: 8px;">${job.location}</td></tr>
          </table>
          <p>If you need to reschedule, please contact us at 562.500.3126.</p>
          <p>Best regards,<br/>Mario Bermudez Jr.<br/>Charlie's Electric</p>
        </div>
      `,
      text: `Work Day Reminder\n\nHi ${job.clientName},\n\nJob: ${job.title}\nDate: ${dateStr}\nTime: ${job.startTime} — ${job.endTime}\nLocation: ${job.location}\n\nIf you need to reschedule, please contact us at 562.500.3126.\n\nBest regards,\nMario Bermudez Jr.\nCharlie's Electric`,
    });

    return NextResponse.json({ success: true, message: 'Reminder sent' });
  } catch (error) {
    console.error('POST /api/calendar/[id]/notify error:', error);
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 });
  }
}
