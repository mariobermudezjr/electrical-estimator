import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string; // Buffer or base64 string
  }>;
}

export async function sendEmail(options: SendEmailOptions) {
  const attachments = options.attachments?.map((a) => ({
    filename: a.filename,
    content: typeof a.content === 'string' ? Buffer.from(a.content, 'base64') : a.content,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    attachments,
  };
  if (options.cc?.length) payload.cc = options.cc;
  if (options.bcc?.length) payload.bcc = options.bcc;
  if (options.html) payload.html = options.html;
  if (options.text) payload.text = options.text;

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
