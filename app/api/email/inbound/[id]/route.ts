import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import InboundEmail from '@/lib/db/models/InboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/email/inbound/[id] - Get single inbound email (full body)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const email = await InboundEmail.findOne({ _id: id, userId });
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: email.toJSON() });
  } catch (error) {
    console.error('GET /api/email/inbound/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
  }
}

// PATCH /api/email/inbound/[id] - Update folder, isRead, isStarred
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const email = await InboundEmail.findOne({ _id: id, userId });
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (body.folder !== undefined) email.folder = body.folder;
    if (body.isRead !== undefined) email.isRead = body.isRead;
    if (body.isStarred !== undefined) email.isStarred = body.isStarred;

    await email.save();

    return NextResponse.json({ success: true, data: email.toJSON() });
  } catch (error) {
    console.error('PATCH /api/email/inbound/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }
}

// DELETE /api/email/inbound/[id] - Permanently delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const result = await InboundEmail.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/email/inbound/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
  }
}
