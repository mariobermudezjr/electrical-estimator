import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScheduledJob from '@/lib/db/models/ScheduledJob';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

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
          (job as any)[field] = new Date(body[field]);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (job as any)[field] = body[field];
        }
      }
    }

    await job.save();

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
