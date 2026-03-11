import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScheduledJob from '@/lib/db/models/ScheduledJob';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email/outbound';

const OWNER_EMAIL = 'mbermudez91@gmail.com';
const FROM_EMAIL = process.env.OUTBOUND_FROM_EMAIL || 'estimates@charlieselectric.online';

// GET /api/calendar?month=3&year=2026
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const month = parseInt(request.nextUrl.searchParams.get('month') || '0');
    const year = parseInt(request.nextUrl.searchParams.get('year') || '0');

    await connectDB();

    // Get jobs for the entire month (plus a few days buffer for calendar display)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Extend range to cover calendar grid (prev/next month days visible)
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 7);

    const jobs = await ScheduledJob.find({
      userId,
      scheduledDate: { $gte: startDate, $lte: endDate },
    })
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    const transformed = jobs.map((j) => ({
      ...j,
      id: j._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    console.error('GET /api/calendar error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

// POST /api/calendar - Create a scheduled job + send confirmation
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const body = await request.json();

    await connectDB();

    const job = await ScheduledJob.create({
      userId,
      estimateId: body.estimateId || undefined,
      clientId: body.clientId || undefined,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      title: body.title,
      description: body.description,
      scheduledDate: new Date(body.scheduledDate + 'T12:00:00.000Z'),
      startTime: body.startTime,
      endTime: body.endTime,
      location: body.location,
      status: 'scheduled',
      notes: body.notes,
    });

    // Send confirmation email to client (and CC owner)
    if (body.clientEmail) {
      try {
        const dateStr = new Date(body.scheduledDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Los_Angeles',
        });

        await sendEmail({
          from: FROM_EMAIL,
          to: [body.clientEmail],
          bcc: [OWNER_EMAIL],
          subject: `Work Scheduled: ${body.title} — ${dateStr}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #333;">Work Day Scheduled</h2>
              <p>Hi ${body.clientName},</p>
              <p>This is a confirmation that the following work has been scheduled:</p>
              <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                <tr><td style="padding: 8px; font-weight: bold; color: #555;">Job</td><td style="padding: 8px;">${body.title}</td></tr>
                <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Date</td><td style="padding: 8px;">${dateStr}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; color: #555;">Time</td><td style="padding: 8px;">${body.startTime} — ${body.endTime}</td></tr>
                <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Location</td><td style="padding: 8px;">${body.location}</td></tr>
                ${body.description ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">Details</td><td style="padding: 8px;">${body.description}</td></tr>` : ''}
              </table>
              <p>If you need to reschedule, please contact us at 562.500.3126.</p>
              <p>Best regards,<br/>Mario Bermudez Jr.<br/>Charlie's Electric</p>
            </div>
          `,
          text: `Work Day Scheduled\n\nHi ${body.clientName},\n\nJob: ${body.title}\nDate: ${dateStr}\nTime: ${body.startTime} — ${body.endTime}\nLocation: ${body.location}\n${body.description ? `Details: ${body.description}\n` : ''}\nIf you need to reschedule, please contact us at 562.500.3126.\n\nBest regards,\nMario Bermudez Jr.\nCharlie's Electric`,
        });
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
      }
    }

    return NextResponse.json({ success: true, data: job.toJSON() }, { status: 201 });
  } catch (error) {
    console.error('POST /api/calendar error:', error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
