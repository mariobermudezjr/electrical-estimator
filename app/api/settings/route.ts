import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Settings from '@/lib/db/models/Settings';
import { settingsSchema } from '@/lib/validation/schemas';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/settings - Get user settings (creates default if not exists)
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    await connectDB();

    let settings = await Settings.findOne({ userId });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await Settings.create({
        userId,
        companyName: 'My Electrical Company',
        defaultHourlyRate: 75,
        defaultMarkupPercentage: 20,
        preferredAIProvider: 'openai',
        theme: 'dark',
      });
    }

    return NextResponse.json({ success: true, data: settings.toJSON() });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const body = await request.json();

    // Validate input
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();

    const settings = await Settings.findOneAndUpdate(
      { userId },
      { $set: parsed.data },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: settings.toJSON() });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
