import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScopeTemplate from '@/lib/db/models/ScopeTemplate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// POST /api/templates/[id]/use - Increment usage counter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    await connectDB();
    const { id } = await params;

    const template = await ScopeTemplate.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found or inactive' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template.toJSON() });
  } catch (error) {
    console.error('POST /api/templates/[id]/use error:', error);
    return NextResponse.json(
      { error: 'Failed to track template usage' },
      { status: 500 }
    );
  }
}
