import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Client from '@/lib/db/models/Client';
import { updateClientSchema } from '@/lib/validation/schemas';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/clients/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    await connectDB();
    const { id } = await params;

    const client = await Client.findOne({ _id: id, userId });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: client.toJSON() });
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PATCH /api/clients/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const body = await request.json();

    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();
    const { id } = await params;

    const client = await Client.findOneAndUpdate(
      { _id: id, userId },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: client.toJSON() });
  } catch (error) {
    console.error('PATCH /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    await connectDB();
    const { id } = await params;

    const client = await Client.findOneAndDelete({ _id: id, userId });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
