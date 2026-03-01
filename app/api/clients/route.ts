import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Client from '@/lib/db/models/Client';
import Estimate from '@/lib/db/models/Estimate';
import { createClientSchema } from '@/lib/validation/schemas';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/clients - List all user's clients
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    await connectDB();

    const withStats = request.nextUrl.searchParams.get('withStats') === 'true';

    if (withStats) {
      const clients = await Client.find({ userId }).sort({ name: 1 }).lean();

      const clientIds = clients.map((c) => c._id);
      const stats = await Estimate.aggregate([
        { $match: { userId: clients[0]?.userId, clientId: { $in: clientIds } } },
        {
          $group: {
            _id: '$clientId',
            estimateCount: { $sum: 1 },
            totalValue: { $sum: '$pricing.total' },
          },
        },
      ]);

      const statsMap = new Map(
        stats.map((s) => [s._id.toString(), { estimateCount: s.estimateCount, totalValue: s.totalValue }])
      );

      const data = clients.map((c) => {
        const clientStats = statsMap.get(c._id.toString()) || { estimateCount: 0, totalValue: 0 };
        return {
          id: c._id.toString(),
          name: c.name,
          email: c.email,
          phone: c.phone,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          estimateCount: clientStats.estimateCount,
          totalValue: clientStats.totalValue,
        };
      });

      return NextResponse.json({ success: true, data });
    }

    const clients = await Client.find({ userId }).sort({ name: 1 }).lean();
    const data = clients.map((c) => ({
      ...c,
      id: c._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const body = await request.json();

    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();

    const client = await Client.create({
      ...parsed.data,
      userId,
    });

    return NextResponse.json(
      { success: true, data: client.toJSON() },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
