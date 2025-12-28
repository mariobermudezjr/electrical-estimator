import OpenAI from 'openai';

export async function callOpenAI(
  prompt: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Client-side usage
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert electrical pricing research assistant with knowledge of construction costs and market rates.',
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
