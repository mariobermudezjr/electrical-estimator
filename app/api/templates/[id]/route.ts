import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScopeTemplate from '@/lib/db/models/ScopeTemplate';
import { updateTemplateSchema } from '@/lib/validation/schemas';
import mongoose from 'mongoose';

const TEMP_USER_ID = 'temp-user-id';

// GET /api/templates/[id] - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    const template = await ScopeTemplate.findOne({
      _id: id,
      userId: TEMP_USER_ID,
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template.toJSON() });
  } catch (error) {
    console.error('GET /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PATCH /api/templates/[id] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();

    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    await connectDB();
    const { id } = await params;

    const template = await ScopeTemplate.findOneAndUpdate(
      { _id: id, userId: TEMP_USER_ID },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template.toJSON() });
  } catch (error) {
    console.error('PATCH /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete template (soft delete by default)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      const result = await ScopeTemplate.deleteOne({
        _id: id,
        userId: TEMP_USER_ID,
      });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
    } else {
      // Soft delete
      const template = await ScopeTemplate.findOneAndUpdate(
        { _id: id, userId: TEMP_USER_ID },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
