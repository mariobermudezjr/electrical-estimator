// Note: API keys (openaiApiKey, anthropicApiKey) are now stored server-side only
// They are accessed via environment variables and not stored in the database or client
export interface UserSettings {
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  defaultHourlyRate: number;
  defaultMarkupPercentage: number;
  preferredAIProvider: 'openai' | 'anthropic';
  theme: 'dark' | 'light';
}

export const defaultSettings: UserSettings = {
  companyName: 'My Electrical Company',
  defaultHourlyRate: 75,
  defaultMarkupPercentage: 20,
  preferredAIProvider: 'openai',
  theme: 'dark',
};
