import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Client from '@/lib/db/models/Client';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/clients/[id]/addresses - Get unique project addresses for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    await connectDB();
    const { id } = await params;

    const client = await Client.findOne({ _id: id, userId });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get unique addresses from client's estimate history
    const estimates = await Estimate.find({
      userId,
      $or: [
        { clientId: client._id },
        { clientId: { $exists: false }, clientName: client.name },
        { clientId: null, clientName: client.name },
      ],
    })
      .select({ projectAddress: 1, city: 1, state: 1 })
      .sort({ createdAt: -1 })
      .lean();

    // Deduplicate by address+city+state
    const seen = new Set<string>();
    const addresses = [];
    for (const est of estimates) {
      const key = `${est.projectAddress}|${est.city}|${est.state || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        addresses.push({
          projectAddress: est.projectAddress,
          city: est.city,
          state: est.state || '',
        });
      }
    }

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    console.error('GET /api/clients/[id]/addresses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client addresses' },
      { status: 500 }
    );
  }
}
