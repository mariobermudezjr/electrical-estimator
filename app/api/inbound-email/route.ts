import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import { Webhook } from 'svix';
import { parseEmailToEstimate } from '@/lib/ai/parse-email';
import { calculateEstimate } from '@/lib/pricing/calculator';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import User from '@/lib/db/models/User';
import Settings from '@/lib/db/models/Settings';

interface EmailAttachment {
  filename: string;
  content: string; // base64-encoded
  content_type: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const require_ = createRequire(import.meta.url);
  const pdfParse = require_('pdf-parse/lib/pdf-parse.js');
  const data = await pdfParse(buffer);
  return data.text;
}

async function processAttachments(attachments: EmailAttachment[]): Promise<{
  extractedText: string;
  receiptImages: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    data: string;
  }>;
}> {
  let extractedText = '';
  const receiptImages: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    data: string;
  }> = [];

  for (const attachment of attachments) {
    const buffer = Buffer.from(attachment.content, 'base64');

    if (buffer.length > MAX_ATTACHMENT_SIZE) {
      console.warn(`Skipping oversized attachment: ${attachment.filename}`);
      continue;
    }

    // Extract text from PDFs
    if (attachment.content_type === 'application/pdf') {
      try {
        const text = await extractTextFromPDF(buffer);
        if (text.trim()) {
          extractedText += `\n\n--- Attached PDF: ${attachment.filename} ---\n${text}`;
        }
      } catch (err) {
        console.warn(`Failed to parse PDF attachment ${attachment.filename}:`, err);
      }
    }

    // Store images as receipts
    if (IMAGE_TYPES.includes(attachment.content_type)) {
      receiptImages.push({
        filename: `email-${Date.now()}-${attachment.filename}`,
        originalName: attachment.filename,
        mimeType: attachment.content_type,
        size: buffer.length,
        data: attachment.content, // already base64
      });
    }
  }

  return { extractedText, receiptImages };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await request.text();
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 401 });
    }

    const wh = new Webhook(webhookSecret);
    let payload: Record<string, unknown>;
    try {
      payload = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as Record<string, unknown>;
    } catch {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Extract email fields from Resend inbound payload
    const data = (payload.data || payload) as Record<string, unknown>;
    const senderEmail = (data.from as string) || '';
    const subject = (data.subject as string) || '(no subject)';
    let emailBody = (data.text as string) || (data.html as string) || '';

    // Process attachments (PDFs → text, images → receipts)
    const rawAttachments = (data.attachments as EmailAttachment[]) || [];
    const { extractedText, receiptImages } = await processAttachments(rawAttachments);

    // Append PDF text to email body so AI can parse it
    if (extractedText) {
      emailBody += extractedText;
    }

    if (!emailBody) {
      console.warn('Empty email body received');
      return NextResponse.json({ error: 'Empty email body' }, { status: 400 });
    }

    // Look up the owner user
    const ownerEmail = process.env.INBOUND_ESTIMATE_USER_EMAIL;
    if (!ownerEmail) {
      console.error('INBOUND_ESTIMATE_USER_EMAIL not configured');
      return NextResponse.json({ error: 'Owner email not configured' }, { status: 500 });
    }

    await connectDB();

    const user = await User.findOne({ email: ownerEmail });
    if (!user) {
      console.error(`User not found for email: ${ownerEmail}`);
      return NextResponse.json({ error: 'Owner user not found' }, { status: 500 });
    }

    // Get user's default settings
    const settings = await Settings.findOne({ userId: user._id });
    const hourlyRate = settings?.defaultHourlyRate ?? 75;
    const markupPercentage = settings?.defaultMarkupPercentage ?? 20;

    // Parse email with AI
    const parsed = await parseEmailToEstimate(emailBody, senderEmail, subject);

    // Calculate pricing
    const pricing = calculateEstimate({
      laborHours: parsed.laborHours,
      hourlyRate,
      materialItems: parsed.materials,
      markupPercentage,
    });

    // Create draft estimate
    const estimate = await Estimate.create({
      userId: user._id,
      clientName: parsed.clientName,
      clientEmail: parsed.clientEmail,
      clientPhone: parsed.clientPhone,
      projectAddress: parsed.projectAddress,
      city: parsed.city,
      state: parsed.state,
      workType: parsed.workType,
      scopeOfWork: parsed.scopeOfWork,
      pricing,
      status: 'draft',
      notes: `Auto-created from email by ${senderEmail}`,
      ...(receiptImages.length > 0 && { receipts: receiptImages }),
    });

    console.log(`Draft estimate created: ${estimate._id} from ${senderEmail}`);

    return NextResponse.json({ success: true, estimateId: estimate._id }, { status: 200 });
  } catch (error) {
    console.error('Inbound email webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
