import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScheduledJob from '@/lib/db/models/ScheduledJob';
import { sendEmail } from '@/lib/email/outbound';

const OWNER_EMAIL = 'mbermudez91@gmail.com';
const FROM_EMAIL = process.env.OUTBOUND_FROM_EMAIL || 'estimates@charlieselectric.online';
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/calendar/reminders — Called by Vercel Cron
// Runs twice daily:
//   8am PST: sends "day before" reminders for tomorrow's jobs
//   7am PST: sends "morning of" reminders for today's jobs
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get current time in PST
    const nowPST = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    );
    const currentHour = nowPST.getHours();

    // Determine which reminders to send based on current hour
    // 7am PST: morning-of reminders (today's jobs)
    // 8am PST: day-before reminders (tomorrow's jobs)
    const isMorningOf = currentHour >= 6 && currentHour < 8;
    const isDayBefore = currentHour >= 8 && currentHour < 10;

    let sent = 0;

    if (isMorningOf) {
      // Send morning-of reminders for today's jobs
      const todayStart = new Date(nowPST);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(nowPST);
      todayEnd.setHours(23, 59, 59, 999);

      const jobs = await ScheduledJob.find({
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        status: 'scheduled',
        reminderMorningOfSent: false,
      });

      for (const job of jobs) {
        if (!job.clientEmail) continue;

        const dateStr = job.scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Los_Angeles',
        });

        try {
          await sendEmail({
            from: FROM_EMAIL,
            to: [job.clientEmail],
            bcc: [OWNER_EMAIL],
            subject: `Today: ${job.title} — ${dateStr}`,
            html: buildReminderHtml(job.clientName, job.title, dateStr, job.startTime, job.endTime, job.location, 'today'),
            text: buildReminderText(job.clientName, job.title, dateStr, job.startTime, job.endTime, job.location, 'today'),
          });

          job.reminderMorningOfSent = true;
          await job.save();
          sent++;
        } catch (err) {
          console.error(`Failed to send morning reminder for job ${job._id}:`, err);
        }
      }
    }

    if (isDayBefore) {
      // Send day-before reminders for tomorrow's jobs
      const tomorrowStart = new Date(nowPST);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const jobs = await ScheduledJob.find({
        scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
        status: 'scheduled',
        reminderDayBeforeSent: false,
      });

      for (const job of jobs) {
        if (!job.clientEmail) continue;

        const dateStr = job.scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Los_Angeles',
        });

        try {
          await sendEmail({
            from: FROM_EMAIL,
            to: [job.clientEmail],
            bcc: [OWNER_EMAIL],
            subject: `Tomorrow: ${job.title} — ${dateStr}`,
            html: buildReminderHtml(job.clientName, job.title, dateStr, job.startTime, job.endTime, job.location, 'tomorrow'),
            text: buildReminderText(job.clientName, job.title, dateStr, job.startTime, job.endTime, job.location, 'tomorrow'),
          });

          job.reminderDayBeforeSent = true;
          await job.save();
          sent++;
        } catch (err) {
          console.error(`Failed to send day-before reminder for job ${job._id}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      type: isMorningOf ? 'morning_of' : isDayBefore ? 'day_before' : 'no_action',
      currentHourPST: currentHour,
    });
  } catch (error) {
    console.error('GET /api/calendar/reminders error:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}

function buildReminderHtml(
  clientName: string, title: string, dateStr: string,
  startTime: string, endTime: string, location: string, when: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #333;">Reminder: Work Scheduled ${when === 'today' ? 'Today' : 'Tomorrow'}</h2>
      <p>Hi ${clientName},</p>
      <p>This is a friendly reminder that your scheduled work is ${when}:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; color: #555;">Job</td><td style="padding: 8px;">${title}</td></tr>
        <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Date</td><td style="padding: 8px;">${dateStr}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #555;">Time</td><td style="padding: 8px;">${startTime} — ${endTime}</td></tr>
        <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Location</td><td style="padding: 8px;">${location}</td></tr>
      </table>
      <p>If you need to reschedule, please contact us at 562.500.3126.</p>
      <p>Best regards,<br/>Mario Bermudez Jr.<br/>Charlie's Electric</p>
    </div>
  `;
}

function buildReminderText(
  clientName: string, title: string, dateStr: string,
  startTime: string, endTime: string, location: string, when: string
): string {
  return `Reminder: Work Scheduled ${when === 'today' ? 'Today' : 'Tomorrow'}\n\nHi ${clientName},\n\nYour scheduled work is ${when}:\n\nJob: ${title}\nDate: ${dateStr}\nTime: ${startTime} — ${endTime}\nLocation: ${location}\n\nIf you need to reschedule, please contact us at 562.500.3126.\n\nBest regards,\nMario Bermudez Jr.\nCharlie's Electric`;
}
