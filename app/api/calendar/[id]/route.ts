import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScheduledJob from '@/lib/db/models/ScheduledJob';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email/outbound';

const OWNER_EMAIL = 'mbermudez91@gmail.com';
const FROM_EMAIL = process.env.OUTBOUND_FROM_EMAIL || 'estimates@charlieselectric.online';

// GET /api/calendar/[id]
export async function GET(
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

    return NextResponse.json({ success: true, data: job.toJSON() });
  } catch (error) {
    console.error('GET /api/calendar/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}

// PATCH /api/calendar/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const job = await ScheduledJob.findOne({ _id: id, userId });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const allowedFields = [
      'clientName', 'clientEmail', 'clientPhone', 'title', 'description',
      'scheduledDate', 'startTime', 'endTime', 'location', 'status', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'scheduledDate') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (job as any)[field] = new Date(body[field] + 'T12:00:00.000Z');
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (job as any)[field] = body[field];
        }
      }
    }

    // Reset reminder flags if date changed
    if (body.scheduledDate !== undefined) {
      job.reminderDayBeforeSent = false;
      job.reminderMorningOfSent = false;
    }

    await job.save();

    // Send update notification email if requested
    if (body.sendNotification && job.clientEmail) {
      try {
        const dateStr = job.scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });

        await sendEmail({
          from: FROM_EMAIL,
          to: [job.clientEmail],
          cc: [OWNER_EMAIL],
          subject: `Schedule Updated: ${job.title} — ${dateStr}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #333;">Schedule Update</h2>
              <p>Hi ${job.clientName},</p>
              <p>Your scheduled work has been updated to a new date and time:</p>
              <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                <tr><td style="padding: 8px; font-weight: bold; color: #555;">Job</td><td style="padding: 8px;">${job.title}</td></tr>
                <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">New Date</td><td style="padding: 8px;">${dateStr}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; color: #555;">Time</td><td style="padding: 8px;">${job.startTime} — ${job.endTime}</td></tr>
                <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Location</td><td style="padding: 8px;">${job.location}</td></tr>
              </table>
              <p>If you have any questions, please contact us at 562.500.3126.</p>
              <p>Best regards,<br/>Mario Bermudez Jr.<br/>Charlie's Electric</p>
            </div>
          `,
          text: `Schedule Update\n\nHi ${job.clientName},\n\nYour scheduled work has been updated:\n\nJob: ${job.title}\nNew Date: ${dateStr}\nTime: ${job.startTime} — ${job.endTime}\nLocation: ${job.location}\n\nIf you have any questions, please contact us at 562.500.3126.\n\nBest regards,\nMario Bermudez Jr.\nCharlie's Electric`,
        });
      } catch (emailErr) {
        console.error('Failed to send update notification:', emailErr);
      }
    }

    return NextResponse.json({ success: true, data: job.toJSON() });
  } catch (error) {
    console.error('PATCH /api/calendar/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

// DELETE /api/calendar/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const result = await ScheduledJob.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/calendar/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
