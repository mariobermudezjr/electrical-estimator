import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts');
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/estimates/[id]/receipts - Upload a receipt image
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

    // Generate unique filename
    const ext = file.type === 'image/png' ? '.png' : '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    // Ensure upload directory exists
    const estimateDir = path.join(UPLOAD_DIR, id);
    await mkdir(estimateDir, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(estimateDir, filename), buffer);

    // Save metadata to MongoDB
    const receiptData = {
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedAt: new Date(),
    };

    await Estimate.findByIdAndUpdate(id, {
      $push: { receipts: receiptData },
    });

    return NextResponse.json({ success: true, data: receiptData }, { status: 201 });
  } catch (error) {
    console.error('POST /api/estimates/[id]/receipts error:', error);
    return NextResponse.json(
      { error: 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}

// GET /api/estimates/[id]/receipts - List receipt images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;

    await connectDB();

    const estimate = await Estimate.findOne({ _id: id, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: estimate.receipts || [] });
  } catch (error) {
    console.error('GET /api/estimates/[id]/receipts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}
