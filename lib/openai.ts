import OpenAI from 'openai';

export function getOpenAIClient(): OpenAI {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const apiKey = groqKey || openrouterKey || openaiKey;

  if (!apiKey || apiKey === 'your-groq-api-key' || apiKey === 'your-openrouter-api-key' || apiKey === 'your-openai-api-key') {
    throw new Error(
      'AI API key is missing. Please add GROQ_API_KEY to your .env.local file.'
    );
  }

  const isGroq = Boolean(groqKey && groqKey !== 'your-groq-api-key') || apiKey.startsWith('gsk_') || Boolean(process.env.GROQ_MODEL?.trim());

  let baseURL: string | undefined;
  let defaultHeaders: Record<string, string> = {};

  if (isGroq) {
    baseURL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  } else if (openrouterKey || apiKey.startsWith('sk-or-')) {
    baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    defaultHeaders = {
      'HTTP-Referer': 'https://callflow-ai.local',
      'X-OpenRouter-Title': 'CallFlow AI',
    };
  } else {
    baseURL = process.env.OPENAI_BASE_URL || undefined;
  }

  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders,
  });
}

export function getOpenAIModel(): string {
  const groqModel = process.env.GROQ_MODEL?.trim();
  if (groqModel) {
    return groqModel;
  }
  const openrouterModel = process.env.OPENROUTER_MODEL?.trim();
  if (openrouterModel) {
    return openrouterModel;
  }
  const openaiModel = process.env.OPENAI_MODEL?.trim();
  if (openaiModel) {
    return openaiModel;
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey || process.env.GROQ_API_KEY) {
    return 'openai/gpt-oss-20b';
  }

  return 'openai/gpt-oss-20b';
}
