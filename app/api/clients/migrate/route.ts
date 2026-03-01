import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Client from '@/lib/db/models/Client';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// POST /api/clients/migrate - Extract clients from estimates and backfill clientId
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    await connectDB();

    // Get all unique client names from estimates
    const estimates = await Estimate.find({ userId }).lean();

    const clientMap = new Map<string, { name: string; email?: string; phone?: string }>();

    for (const est of estimates) {
      const key = est.clientName.trim().toLowerCase();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          name: est.clientName.trim(),
          email: est.clientEmail || undefined,
          phone: est.clientPhone || undefined,
        });
      }
    }

    let created = 0;
    let linked = 0;

    for (const [, clientData] of clientMap) {
      // Check if client already exists (idempotent)
      let client = await Client.findOne({
        userId,
        name: { $regex: new RegExp(`^${clientData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (!client) {
        client = await Client.create({
          userId,
          ...clientData,
        });
        created++;
      }

      // Backfill clientId on estimates that don't have one
      const result = await Estimate.updateMany(
        {
          userId,
          clientName: { $regex: new RegExp(`^${clientData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          $or: [{ clientId: { $exists: false } }, { clientId: null }],
        },
        { $set: { clientId: client._id } }
      );

      linked += result.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      data: {
        clientsCreated: created,
        estimatesLinked: linked,
        totalUniqueClients: clientMap.size,
      },
    });
  } catch (error) {
    console.error('POST /api/clients/migrate error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate clients' },
      { status: 500 }
    );
  }
}
