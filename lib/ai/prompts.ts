import { WorkType } from '@/types/estimate';

export function createPricingResearchPrompt(
  scopeOfWork: string,
  city: string,
  workType: WorkType
): string {
  const workTypeLabel = workType.replace(/_/g, ' ').toLowerCase();

  return `You are an electrical pricing research assistant. Analyze the following job and provide pricing estimates based on current market rates.

JOB DETAILS:
- Type: ${workTypeLabel}
- Location: ${city}
- Scope: ${scopeOfWork}

TASK: Research typical pricing for this type of electrical work in ${city}. Consider:
1. Labor costs for electricians in this area
2. Material costs
3. Typical markup/overhead
4. Local market rates from contractors

Provide a JSON response with this EXACT structure:
{
  "averagePrice": <number>,
  "priceRange": {
    "min": <number>,
    "max": <number>
  },
  "sources": [
    {
      "source": "<source name>",
      "price": <number>,
      "url": "<url if available>",
      "description": "<brief description>"
    }
  ],
  "confidence": "<low|medium|high>",
  "searchQuery": "<the query you would use to search for this information>"
}

Base confidence on:
- HIGH: Found 3+ specific comparable jobs in the same city
- MEDIUM: Found 2-3 general pricing guides or nearby city data
- LOW: Limited data, general national averages only

Return ONLY the JSON, no other text.`;
}

export function createWebScrapingPrompt(
  scopeOfWork: string,
  city: string,
  htmlContent: string
): string {
  return `Extract electrical pricing information from the following web page content.

JOB: ${scopeOfWork}
LOCATION: ${city}

WEB PAGE CONTENT:
${htmlContent.substring(0, 4000)}

Extract any pricing information relevant to this type of electrical work. Return JSON:
{
  "prices": [
    {
      "amount": <number>,
      "description": "<what this price covers>"
    }
  ],
  "source": "<website name>",
  "confidence": "<low|medium|high>"
}

Return ONLY the JSON.`;
}
