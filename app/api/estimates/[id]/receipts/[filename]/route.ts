import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/estimates/[id]/receipts/[filename] - Serve receipt image as base64
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id, filename } = await params;

    await connectDB();

    const estimate = await Estimate.findOne({ _id: id, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const receipt = estimate.receipts?.find(
      (r: any) => r.filename === filename
    );
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: receipt.data });
  } catch (error) {
    console.error('GET /api/estimates/[id]/receipts/[filename] error:', error);
    return NextResponse.json(
      { error: 'Failed to serve receipt' },
      { status: 500 }
    );
  }
}

// DELETE /api/estimates/[id]/receipts/[filename] - Delete receipt image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id, filename } = await params;

    await connectDB();

    const estimate = await Estimate.findOne({ _id: id, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const receipt = estimate.receipts?.find(
      (r: any) => r.filename === filename
    );
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    await Estimate.findByIdAndUpdate(id, {
      $pull: { receipts: { filename } },
    });

    return NextResponse.json({ success: true, message: 'Receipt deleted' });
  } catch (error) {
    console.error('DELETE /api/estimates/[id]/receipts/[filename] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}
