import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts');

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

    const filePath = path.join(UPLOAD_DIR, id, filename);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const format = request.nextUrl.searchParams.get('format');

    if (format === 'base64') {
      const buffer = await readFile(filePath);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${receipt.mimeType};base64,${base64}`;
      return NextResponse.json({ success: true, data: dataUrl });
    }

    // Default: serve the raw image
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': receipt.mimeType,
        'Content-Disposition': `inline; filename="${receipt.originalName}"`,
      },
    });
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

    // Remove file from disk
    const filePath = path.join(UPLOAD_DIR, id, filename);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Remove from MongoDB
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
