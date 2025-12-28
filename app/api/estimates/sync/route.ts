import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { syncEstimatesSchema } from '@/lib/validation/schemas';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// POST /api/estimates/sync - Bulk import estimates from localStorage
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const body = await request.json();

    // Validate input
    const parsed = syncEstimatesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();

    const { estimates } = parsed.data;
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each estimate
    for (const estimateData of estimates) {
      try {
        // Check if estimate already exists (by matching key fields)
        const existing = await Estimate.findOne({
          userId,
          clientName: estimateData.clientName,
          projectAddress: estimateData.projectAddress,
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create new estimate
        await Estimate.create({
          ...estimateData,
          userId,
        });

        results.imported++;
      } catch (error) {
        results.errors.push(
          `Failed to import estimate for ${estimateData.clientName}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('POST /api/estimates/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync estimates' },
      { status: 500 }
    );
  }
}
