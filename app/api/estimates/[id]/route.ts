import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { updateEstimateSchema } from '@/lib/validation/schemas';

// Temporary hardcoded userId while we fix NextAuth v5 beta issues
const TEMP_USER_ID = 'temp-user-id';

// GET /api/estimates/[id] - Get single estimate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const estimate = await Estimate.findOne({
      _id: id,
      userId: TEMP_USER_ID,
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: estimate.toJSON() });
  } catch (error) {
    console.error('GET /api/estimates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimate' },
      { status: 500 }
    );
  }
}

// PATCH /api/estimates/[id] - Update estimate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = updateEstimateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();
    const { id } = await params;

    const estimate = await Estimate.findOneAndUpdate(
      {
        _id: id,
        userId: TEMP_USER_ID,
      },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: estimate.toJSON() });
  } catch (error) {
    console.error('PATCH /api/estimates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update estimate' },
      { status: 500 }
    );
  }
}

// DELETE /api/estimates/[id] - Delete estimate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const estimate = await Estimate.findOneAndDelete({
      _id: id,
      userId: TEMP_USER_ID,
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Estimate deleted' });
  } catch (error) {
    console.error('DELETE /api/estimates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete estimate' },
      { status: 500 }
    );
  }
}
