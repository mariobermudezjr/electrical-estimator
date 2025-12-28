import Anthropic from '@anthropic-ai/sdk';

export async function callAnthropic(
  prompt: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Anthropic API key is required');
  }

  const anthropic = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
