import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import { Webhook } from 'svix';
import { parseEmailToEstimate } from '@/lib/ai/parse-email';
import { calculateEstimate } from '@/lib/pricing/calculator';
import connectDB from '@/lib/db/mongodb';
import Estimate from '@/lib/db/models/Estimate';
import User from '@/lib/db/models/User';
import Settings from '@/lib/db/models/Settings';

const RESEND_API_BASE = 'https://api.resend.com';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

interface ResendEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string | null;
  html: string | null;
  attachments: Array<{
    id: string;
    filename: string;
    content_type: string;
  }>;
}

interface ResendAttachmentMeta {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  download_url: string;
}

async function fetchResendEmail(emailId: string, apiKey: string): Promise<ResendEmail> {
  const res = await fetch(`${RESEND_API_BASE}/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch email ${emailId}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchAttachmentMeta(
  emailId: string,
  attachmentId: string,
  apiKey: string
): Promise<ResendAttachmentMeta> {
  const res = await fetch(
    `${RESEND_API_BASE}/emails/receiving/${emailId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch attachment ${attachmentId}: ${res.status}`);
  }
  return res.json();
}

async function downloadAttachment(downloadUrl: string): Promise<Buffer> {
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Failed to download attachment: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const require_ = createRequire(import.meta.url);
  const pdfParse = require_('pdf-parse/lib/pdf-parse.js');
  const data = await pdfParse(buffer);
  return data.text;
}

async function processAttachments(
  emailId: string,
  attachments: Array<{ id: string; filename: string; content_type: string }>,
  apiKey: string
): Promise<{
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
    const isPDF = attachment.content_type === 'application/pdf';
    const isImage = IMAGE_TYPES.includes(attachment.content_type);

    if (!isPDF && !isImage) continue;

    try {
      const meta = await fetchAttachmentMeta(emailId, attachment.id, apiKey);

      if (meta.size > MAX_ATTACHMENT_SIZE) {
        console.warn(`Skipping oversized attachment: ${attachment.filename}`);
        continue;
      }

      const buffer = await downloadAttachment(meta.download_url);

      if (isPDF) {
        try {
          const text = await extractTextFromPDF(buffer);
          if (text.trim()) {
            extractedText += `\n\n--- Attached PDF: ${attachment.filename} ---\n${text}`;
          }
        } catch (err) {
          console.warn(`Failed to parse PDF attachment ${attachment.filename}:`, err);
        }
      }

      if (isImage) {
        receiptImages.push({
          filename: `email-${Date.now()}-${attachment.filename}`,
          originalName: attachment.filename,
          mimeType: attachment.content_type,
          size: buffer.length,
          data: buffer.toString('base64'),
        });
      }
    } catch (err) {
      console.warn(`Failed to process attachment ${attachment.filename}:`, err);
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

    // Extract email_id from webhook payload and fetch full email via Resend API
    const webhookData = (payload.data || payload) as Record<string, unknown>;
    const emailId = webhookData.email_id as string;

    if (!emailId) {
      console.error('No email_id in webhook payload');
      return NextResponse.json({ error: 'Missing email_id' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_SERVER_PASSWORD;
    if (!resendApiKey) {
      console.error('Resend API key not configured (set RESEND_API_KEY)');
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
    }

    const email = await fetchResendEmail(emailId, resendApiKey);

    const senderEmail = email.from || '';
    const subject = email.subject || '(no subject)';
    let emailBody = email.text || email.html || '';

    // Process attachments (PDFs → text, images → receipts)
    const { extractedText, receiptImages } = await processAttachments(
      emailId,
      email.attachments || [],
      resendApiKey
    );

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
