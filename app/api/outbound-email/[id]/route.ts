import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import OutboundEmail, { EmailFolder } from '@/lib/db/models/OutboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/outbound-email/[id] - Get single email
export async function GET(
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

    return NextResponse.json({ success: true, data: email.toJSON() });
  } catch (error) {
    console.error('GET /api/outbound-email/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
  }
}

// PATCH /api/outbound-email/[id] - Update email (move folder, edit draft)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const email = await OutboundEmail.findOne({ _id: id, userId });
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Only allow editing drafts (except for moving to deleted)
    if (email.folder === 'sent' && body.folder !== 'deleted') {
      return NextResponse.json({ error: 'Cannot edit sent emails' }, { status: 400 });
    }

    if (body.from !== undefined) email.from = body.from;
    if (body.to !== undefined) email.to = Array.isArray(body.to) ? body.to : [body.to];
    if (body.cc !== undefined) email.cc = body.cc;
    if (body.bcc !== undefined) email.bcc = body.bcc;
    if (body.subject !== undefined) email.subject = body.subject;
    if (body.html !== undefined) email.html = body.html;
    if (body.text !== undefined) email.text = body.text;
    if (body.folder !== undefined) email.folder = body.folder;
    if (body.attachments !== undefined) email.attachments = body.attachments;

    await email.save();

    return NextResponse.json({ success: true, data: email.toJSON() });
  } catch (error) {
    console.error('PATCH /api/outbound-email/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }
}

// DELETE /api/outbound-email/[id] - Permanently delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const result = await OutboundEmail.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/outbound-email/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
  }
}
