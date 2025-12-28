import { WorkType, AIPricingData } from '@/types/estimate';
import { callOpenAI } from './openai-client';
import { callAnthropic } from './anthropic-client';
import { createPricingResearchPrompt } from './prompts';
import { STORAGE_KEYS } from '../storage/local-storage';

// Cache interface
interface PricingCache {
  [key: string]: AIPricingData;
}

// Generate cache key from inputs
function generateCacheKey(scopeOfWork: string, city: string, workType: WorkType): string {
  const normalized = `${workType}-${city}-${scopeOfWork}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return normalized.substring(0, 100);
}

// Get cached pricing (valid for 30 days)
function getCachedPricing(cacheKey: string): AIPricingData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cacheStr = localStorage.getItem(STORAGE_KEYS.AI_CACHE);
    if (!cacheStr) return null;

    const cache: PricingCache = JSON.parse(cacheStr);
    const cached = cache[cacheKey];

    if (!cached) return null;

    // Check if cache is still valid (30 days)
    const lastUpdated = new Date(cached.lastUpdated);
    const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince > 30) {
      return null; // Cache expired
    }

    return {
      ...cached,
      lastUpdated: new Date(cached.lastUpdated),
    };
  } catch (error) {
    console.error('Error reading AI cache:', error);
    return null;
  }
}

// Save pricing to cache
function cachePricingData(cacheKey: string, data: AIPricingData): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheStr = localStorage.getItem(STORAGE_KEYS.AI_CACHE);
    const cache: PricingCache = cacheStr ? JSON.parse(cacheStr) : {};

    cache[cacheKey] = {
      ...data,
      lastUpdated: new Date(data.lastUpdated),
    };

    localStorage.setItem(STORAGE_KEYS.AI_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error('Error writing AI cache:', error);
  }
}

// Parse AI response
function parseAIResponse(response: string): AIPricingData {
  try {
    const parsed = JSON.parse(response);

    return {
      averagePrice: parsed.averagePrice || 0,
      priceRange: {
        min: parsed.priceRange?.min || 0,
        max: parsed.priceRange?.max || 0,
      },
      sources: parsed.sources || [],
      confidence: parsed.confidence || 'low',
      lastUpdated: new Date(),
      searchQuery: parsed.searchQuery || '',
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

// Main research function
export async function researchPricing(
  scopeOfWork: string,
  city: string,
  workType: WorkType,
  provider: 'openai' | 'anthropic',
  apiKey: string
): Promise<AIPricingData> {
  // 1. Check cache first
  const cacheKey = generateCacheKey(scopeOfWork, city, workType);
  const cached = getCachedPricing(cacheKey);

  if (cached) {
    console.log('Using cached pricing data');
    return cached;
  }

  // 2. Generate prompt
  const prompt = createPricingResearchPrompt(scopeOfWork, city, workType);

  // 3. Call AI API
  let response: string;
  if (provider === 'openai') {
    response = await callOpenAI(prompt, apiKey);
  } else {
    response = await callAnthropic(prompt, apiKey);
  }

  // 4. Parse response
  const pricingData = parseAIResponse(response);

  // 5. Cache result
  cachePricingData(cacheKey, pricingData);

  return pricingData;
}
