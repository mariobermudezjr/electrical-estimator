import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { parseHomeDepotPDF } from '@/lib/import/homedepot-parser';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Import pdf-parse/lib/pdf-parse.js directly to skip the test-runner in index.js
  const require_ = createRequire(import.meta.url);
  const pdfParse = require_('pdf-parse/lib/pdf-parse.js');
  const data = await pdfParse(buffer);
  return data.text;
}

// POST /api/import/homedepot - Parse a Home Depot PDF
export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedUser();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let text: string;
    try {
      text = await extractTextFromPDF(buffer);
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be corrupted.' },
        { status: 422 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be image-based or corrupted.' },
        { status: 422 }
      );
    }

    // Parse Home Depot items
    const result = parseHomeDepotPDF(text);

    if (result.items.length === 0) {
      return NextResponse.json(
        { error: 'No items found. Please upload a Home Depot Share Cart email or Order Receipt PDF.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('POST /api/import/homedepot error:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse PDF';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
