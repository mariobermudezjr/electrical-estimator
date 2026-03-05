import Anthropic from '@anthropic-ai/sdk';
import { WorkType } from '@/types/estimate';

export interface ParsedEmailEstimate {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectAddress: string;
  city: string;
  state: string;
  workType: WorkType;
  scopeOfWork: string;
  laborHours: number;
  materials: Array<{
    description: string;
    quantity: number;
    unitCost: number;
  }>;
}

const WORK_TYPE_VALUES = Object.values(WorkType);

const EXTRACTION_PROMPT = `You are an assistant that extracts structured data from emails describing electrical work requests.

Given the email below, extract the following fields as JSON. If a field cannot be determined, use the default value shown.

Fields:
- clientName (string) — the client's name. Default: "Unknown Client"
- clientEmail (string) — the client's email address. Default: ""
- clientPhone (string) — the client's phone number. Default: ""
- projectAddress (string) — the street address where work is needed. Default: "TBD"
- city (string) — the city. Default: "TBD"
- state (string) — 2-letter US state abbreviation. Default: ""
- workType (string) — one of: ${WORK_TYPE_VALUES.join(', ')}. Pick the best match. Default: "service_call"
- scopeOfWork (string) — a clear summary of the work requested. Default: "See email for details"
- laborHours (number) — estimated labor hours if mentioned. Default: 0
- materials (array of {description, quantity, unitCost}) — any materials mentioned with estimated costs. Default: []

Respond with ONLY valid JSON, no markdown fences or explanation.`;

export async function parseEmailToEstimate(
  emailBody: string,
  senderEmail: string,
  subject: string
): Promise<ParsedEmailEstimate> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const anthropic = new Anthropic({ apiKey });

  const userMessage = `Subject: ${subject}\nFrom: ${senderEmail}\n\n${emailBody}`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    temperature: 0.2,
    messages: [
      { role: 'user', content: `${EXTRACTION_PROMPT}\n\nEmail:\n${userMessage}` },
    ],
  });

  const content = message.content[0];
  const text = content.type === 'text' ? content.text : '{}';

  // Strip markdown fences if present
  const jsonStr = text.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/, '$1').trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse AI response as JSON:', text);
    parsed = {};
  }

  // Validate workType
  const rawWorkType = parsed.workType as string;
  const workType = WORK_TYPE_VALUES.includes(rawWorkType as WorkType)
    ? (rawWorkType as WorkType)
    : WorkType.SERVICE_CALL;

  return {
    clientName: (parsed.clientName as string) || 'Unknown Client',
    clientEmail: (parsed.clientEmail as string) || senderEmail,
    clientPhone: (parsed.clientPhone as string) || '',
    projectAddress: (parsed.projectAddress as string) || 'TBD',
    city: (parsed.city as string) || 'TBD',
    state: (parsed.state as string) || '',
    workType,
    scopeOfWork: (parsed.scopeOfWork as string) || 'See email for details',
    laborHours: typeof parsed.laborHours === 'number' ? parsed.laborHours : 0,
    materials: Array.isArray(parsed.materials)
      ? parsed.materials.map((m: Record<string, unknown>) => ({
          description: (m.description as string) || 'Material',
          quantity: typeof m.quantity === 'number' ? m.quantity : 1,
          unitCost: typeof m.unitCost === 'number' ? m.unitCost : 0,
        }))
      : [],
  };
}
