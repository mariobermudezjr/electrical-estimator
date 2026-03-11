import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const convert = require('heic-convert');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 15 * 1024 * 1024; // 15MB (HEIC files can be larger)

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

    // Check file type — also handle HEIC files that browsers may report as ''
    const isHeic = ALLOWED_TYPES.slice(2).includes(file.type) ||
      /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);

    if (!ALLOWED_TYPES.includes(file.type) && !isHeic) {
      return NextResponse.json(
        { error: 'Invalid file type. JPEG, PNG, and HEIC are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 15MB.' },
        { status: 400 }
      );
    }

    await connectDB();

    const estimate = await Estimate.findOne({ _id: id, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    let buffer = Buffer.from(await file.arrayBuffer());
    let mimeType = file.type;

    // Convert HEIC/HEIF to JPEG
    if (isHeic) {
      try {
        const converted = await convert({
          buffer,
          format: 'JPEG',
          quality: 0.85,
        });
        buffer = Buffer.from(converted);
        mimeType = 'image/jpeg';
      } catch (convErr) {
        console.error('HEIC conversion error:', convErr);
        return NextResponse.json(
          { error: 'Failed to convert HEIC image. Please convert to JPEG/PNG first.' },
          { status: 400 }
        );
      }
    }

    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const ext = mimeType === 'image/png' ? '.png' : '.jpg';
    const filename = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const imageData = {
      filename,
      originalName: file.name,
      mimeType,
      size: buffer.length,
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
