import { NextRequest, NextResponse } from 'next/server';
import { aiPricingRequestSchema } from '@/lib/validation/schemas';
import { createPricingResearchPrompt } from '@/lib/ai/prompts';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { WorkType, AIPricingData } from '@/types/estimate';
import Settings from '@/lib/db/models/Settings';
import Estimate from '@/lib/db/models/Estimate';
import connectDB from '@/lib/db/mongodb';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

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

// Call OpenAI API (server-side)
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured on server');
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Updated to current GPT-4 model
      messages: [
        {
          role: 'system',
          content:
            'You are an expert electrical pricing research assistant with knowledge of construction costs and market rates.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return completion.choices[0].message.content || '{}';
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    throw new Error(error.message || 'Failed to call OpenAI API');
  }
}

// Call Anthropic API (server-side)
async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured on server');
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : '{}';
  } catch (error: any) {
    console.error('Anthropic API Error:', error);
    throw new Error(error.message || 'Failed to call Anthropic API');
  }
}

// POST /api/ai/pricing - Research pricing (server-side)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();
    const body = await request.json();

    // Validate input
    const parsed = aiPricingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { scopeOfWork, city, workType, provider, estimateId } = parsed.data;

    // Get user's preferred provider from settings if not specified
    let aiProvider: 'openai' | 'anthropic' = provider || 'openai';
    if (!provider) {
      await connectDB();
      const settings = await Settings.findOne({ userId });
      if (settings?.preferredAIProvider) {
        aiProvider = settings.preferredAIProvider;
      }
    }

    // Generate prompt
    const prompt = createPricingResearchPrompt(scopeOfWork, city, workType as WorkType);

    // Call AI API
    let response: string;
    if (aiProvider === 'openai') {
      response = await callOpenAI(prompt);
    } else {
      response = await callAnthropic(prompt);
    }

    // Parse response
    const pricingData = parseAIResponse(response);

    // If estimateId is provided, save AI pricing data to the database
    if (estimateId) {
      await connectDB();
      const estimate = await Estimate.findOneAndUpdate(
        {
          _id: estimateId,
          userId,
        },
        { $set: { aiPricing: pricingData } },
        { new: true }
      );

      if (!estimate) {
        return NextResponse.json(
          { error: 'Estimate not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: pricingData,
    });
  } catch (error) {
    console.error('POST /api/ai/pricing error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to research pricing',
      },
      { status: 500 }
    );
  }
}
