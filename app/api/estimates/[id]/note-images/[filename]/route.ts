import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/estimates/[id]/note-images/[filename] — Get image data
export async function GET(
  _request: NextRequest,
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

    const image = (estimate.noteImages || []).find(
      (img: { filename: string }) => img.filename === filename
    );
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: image.data });
  } catch (error) {
    console.error('GET /api/estimates/[id]/note-images/[filename] error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}

// DELETE /api/estimates/[id]/note-images/[filename] — Delete image
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id, filename } = await params;

    await connectDB();

    const result = await Estimate.updateOne(
      { _id: id, userId },
      { $pull: { noteImages: { filename } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/estimates/[id]/note-images/[filename] error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
