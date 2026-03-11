import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// POST /api/estimates/[id]/payments — Add a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const estimate = await Estimate.findOne({ _id: id, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const payment = {
      id: crypto.randomUUID(),
      amount: Number(body.amount),
      method: body.method || undefined,
      note: body.note || undefined,
      date: body.date ? new Date(body.date) : new Date(),
    };

    if (!payment.amount || payment.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (!estimate.payments) estimate.payments = [];
    estimate.payments.push(payment);

    // Auto-update status based on payment total
    const totalPaid = estimate.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    if (totalPaid >= estimate.pricing.total) {
      estimate.status = 'completed_paid';
    } else if (estimate.status === 'completed_paid') {
      // If a payment was removed or this is a partial, revert to unpaid
      estimate.status = 'completed_unpaid';
    }

    await estimate.save();

    return NextResponse.json({ success: true, data: estimate.toJSON() }, { status: 201 });
  } catch (error) {
    console.error('POST /api/estimates/[id]/payments error:', error);
    return NextResponse.json({ error: 'Failed to add payment' }, { status: 500 });
  }
}

// DELETE /api/estimates/[id]/payments?paymentId=xxx — Remove a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id } = await params;
    const paymentId = request.nextUrl.searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    await connectDB();

    const estimate = await Estimate.findOne({ _id: id, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    estimate.payments = (estimate.payments || []).filter(
      (p: { id: string }) => p.id !== paymentId
    );

    // Recalculate status
    const totalPaid = estimate.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    if (totalPaid >= estimate.pricing.total) {
      estimate.status = 'completed_paid';
    } else if (estimate.status === 'completed_paid') {
      estimate.status = 'completed_unpaid';
    }

    await estimate.save();

    return NextResponse.json({ success: true, data: estimate.toJSON() });
  } catch (error) {
    console.error('DELETE /api/estimates/[id]/payments error:', error);
    return NextResponse.json({ error: 'Failed to remove payment' }, { status: 500 });
  }
}
