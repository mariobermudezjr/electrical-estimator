import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { createEstimateSchema } from '@/lib/validation/schemas';

// Temporary hardcoded userId while we fix NextAuth v5 beta issues
const TEMP_USER_ID = 'temp-user-id';

// GET /api/estimates - List all user's estimates
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const estimates = await Estimate.find({ userId: TEMP_USER_ID })
      .sort({ createdAt: -1 })
      .lean();

    // Transform documents to include id field
    const transformedEstimates = estimates.map((est) => ({
      ...est,
      id: est._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: transformedEstimates });
  } catch (error) {
    console.error('GET /api/estimates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimates' },
      { status: 500 }
    );
  }
}

// POST /api/estimates - Create new estimate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = createEstimateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    await connectDB();

    const estimate = await Estimate.create({
      ...parsed.data,
      userId: TEMP_USER_ID,
    });

    return NextResponse.json(
      { success: true, data: estimate.toJSON() },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/estimates error:', error);
    return NextResponse.json(
      { error: 'Failed to create estimate' },
      { status: 500 }
    );
  }
}
