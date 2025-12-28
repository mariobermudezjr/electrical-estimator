import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ScopeTemplate from '@/lib/db/models/ScopeTemplate';
import { createTemplateSchema } from '@/lib/validation/schemas';
import { WorkType } from '@/types/estimate';

const TEMP_USER_ID = 'temp-user-id';

// GET /api/templates - List all templates with optional filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const workType = searchParams.get('workType') as WorkType | null;
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default true
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt | usageCount | name

    // Build query
    const query: any = { userId: TEMP_USER_ID };
    if (activeOnly) query.isActive = true;
    if (workType) query.workTypes = workType;

    // Build sort
    const sortOptions: any = {};
    if (sortBy === 'usageCount') {
      sortOptions.usageCount = -1;
      sortOptions.createdAt = -1; // Secondary sort
    } else if (sortBy === 'name') {
      sortOptions.name = 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const templates = await ScopeTemplate.find(query)
      .sort(sortOptions)
      .lean();

    const transformedTemplates = templates.map((tpl) => ({
      ...tpl,
      id: tpl._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: transformedTemplates });
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();

    const template = await ScopeTemplate.create({
      ...parsed.data,
      userId: TEMP_USER_ID,
    });

    return NextResponse.json(
      { success: true, data: template.toJSON() },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
