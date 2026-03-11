import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import Settings from '@/lib/db/models/Settings';
import OutboundEmail from '@/lib/db/models/OutboundEmail';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email/outbound';
import { generateEstimatePDFServer } from '@/lib/export/pdf-server';
import { defaultSettings } from '@/types/settings';

const OWNER_EMAIL = 'mbermudez91@gmail.com';
const FROM_EMAIL = process.env.OUTBOUND_FROM_EMAIL || 'estimates@charlieselectric.online';

// POST /api/estimates/[id]/send-email
// Generates PDF server-side and sends via Resend — no client upload needed
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser();
    const { id: estimateId } = await params;

    await connectDB();

    // Fetch estimate from DB
    const estimate = await Estimate.findOne({ _id: estimateId, userId });
    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    if (!estimate.clientEmail) {
      return NextResponse.json({ error: 'No client email on this estimate' }, { status: 400 });
    }

    // Fetch company settings
    const settingsDoc = await Settings.findOne({ userId }).lean();
    const companyInfo = settingsDoc
      ? {
          companyName: settingsDoc.companyName || defaultSettings.companyName,
          companyEmail: settingsDoc.companyEmail,
          companyPhone: settingsDoc.companyPhone,
          companyAddress: settingsDoc.companyAddress,
          defaultHourlyRate: settingsDoc.defaultHourlyRate ?? defaultSettings.defaultHourlyRate,
          defaultMarkupPercentage: settingsDoc.defaultMarkupPercentage ?? defaultSettings.defaultMarkupPercentage,
          preferredAIProvider: settingsDoc.preferredAIProvider || defaultSettings.preferredAIProvider,
          theme: settingsDoc.theme || defaultSettings.theme,
        }
      : defaultSettings;

    // Generate PDF server-side
    const estimateData = { ...estimate.toJSON(), id: estimateId };
    console.log('[send-email] Generating PDF server-side for estimate:', estimateId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await generateEstimatePDFServer(estimateData as any, companyInfo);
    console.log('[send-email] PDF generated:', pdfBuffer.length, 'bytes');

    const location = `${estimate.projectAddress}, ${estimate.city}${estimate.state ? `, ${estimate.state}` : ''}`;
    const filename = `estimate-${estimate.clientName.replace(/\s+/g, '-')}-${estimateId}.pdf`;
    const subject = `Estimate for ${estimate.scopeOfWork.slice(0, 60)} — ${location}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #333;">Estimate from Charlie's Electric</h2>
        <p>Hi ${estimate.clientName},</p>
        <p>Thank you for reaching out to Charlie's Electric. Please find attached your estimate for the work at <strong>${location}</strong>.</p>
        <h3 style="color: #555;">Scope of Work</h3>
        <p>${estimate.scopeOfWork.replace(/\n/g, '<br/>')}</p>
        <h3 style="color: #555;">Estimate Total: $${estimate.pricing.total.toFixed(2)}</h3>
        <p>This estimate is valid for 30 days. If you have any questions or would like to schedule the work, please don't hesitate to reach out.</p>
        <p>Best regards,<br/>Mario Bermudez Jr.<br/>Charlie's Electric<br/>562.500.3126</p>
      </div>
    `;

    const text = `Hi ${estimate.clientName},\n\nThank you for reaching out to Charlie's Electric. Please find attached your estimate for the work at ${location}.\n\nScope of Work:\n${estimate.scopeOfWork}\n\nEstimate Total: $${estimate.pricing.total.toFixed(2)}\n\nThis estimate is valid for 30 days. If you have any questions or would like to schedule the work, please don't hesitate to reach out.\n\nBest regards,\nMario Bermudez Jr.\nCharlie's Electric\n562.500.3126`;

    // Send via Resend
    let result;
    try {
      result = await sendEmail({
        from: FROM_EMAIL,
        to: [estimate.clientEmail],
        bcc: [OWNER_EMAIL],
        subject,
        html,
        text,
        attachments: [{
          filename,
          content: pdfBuffer,
        }],
      });
      console.log('[send-email] Resend success, id:', result?.id);
    } catch (sendErr) {
      console.error('[send-email] Resend API error:', sendErr);
      return NextResponse.json(
        { error: `Resend send failed: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}` },
        { status: 502 }
      );
    }

    // Save record in OutboundEmail (without attachment data)
    try {
      await OutboundEmail.create({
        userId,
        folder: 'sent',
        from: FROM_EMAIL,
        to: [estimate.clientEmail],
        bcc: [OWNER_EMAIL],
        subject,
        html,
        text,
        attachments: [{
          filename,
          originalName: filename,
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
        }],
        estimateId,
        resendId: result?.id,
        sentAt: new Date(),
      });
    } catch (dbErr) {
      console.error('[send-email] DB save error (email was sent):', dbErr);
    }

    // Update estimate status to sent
    estimate.status = 'sent';
    await estimate.save();

    return NextResponse.json({ success: true, resendId: result?.id });
  } catch (error) {
    console.error('[send-email] Unexpected error:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
