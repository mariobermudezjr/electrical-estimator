import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Client from '@/lib/db/models/Client';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET /api/clients/[id]/estimates - Get all estimates for a client
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

    // Match by clientId OR by name (for pre-migration estimates)
    const estimates = await Estimate.find({
      userId,
      $or: [
        { clientId: client._id },
        { clientId: { $exists: false }, clientName: client.name },
        { clientId: null, clientName: client.name },
      ],
    })
      .select({ 'receipts.data': 0 })
      .sort({ createdAt: -1 })
      .lean();

    const data = estimates.map((est) => ({
      ...est,
      id: est._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/clients/[id]/estimates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client estimates' },
      { status: 500 }
    );
  }
}
