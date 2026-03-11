import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/estimates/[id]/note-images — Upload a note image
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG and PNG are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    await connectDB();

    const estimate = await Estimate.findOne({ _id: id, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    const ext = file.type === 'image/png' ? '.png' : '.jpg';
    const filename = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const imageData = {
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      data: dataUrl,
      uploadedAt: new Date(),
    };

    await Estimate.findByIdAndUpdate(id, {
      $push: { noteImages: imageData },
    });

    const { data: _, ...metadata } = imageData;
    return NextResponse.json({ success: true, data: metadata }, { status: 201 });
  } catch (error) {
    console.error('POST /api/estimates/[id]/note-images error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

// GET /api/estimates/[id]/note-images — List note image metadata
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const estimate = await Estimate.findOne(
      { _id: id, userId },
      { 'noteImages.data': 0 }
    );
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: estimate.noteImages || [] });
  } catch (error) {
    console.error('GET /api/estimates/[id]/note-images error:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
