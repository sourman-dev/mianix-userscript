// LLM Provider constants from Helicone API
// Source: docs/PROVIDERS.md

export const LLM_PROVIDERS = [
  'ANTHROPIC',
  'AVIAN',
  'AWS',
  'AZURE',
  'BEDROCK',
  'COHERE',
  'DEEPSEEK',
  'FIREWORKS',
  'GOOGLE',
  'GROQ',
  'LLAMA',
  'MISTRAL',
  'NEBIUS',
  'NOVITA',
  'OPENAI',
  'OPENROUTER',
  'PERPLEXITY',
  'QSTASH',
  'TOGETHER',
  'VERCEL',
  'X',
  'UNKNOWN' // For local/custom models
] as const;

export type LLMProvider = typeof LLM_PROVIDERS[number];

// Provider to Base URL mapping
export const PROVIDER_BASE_URLS: Record<string, string> = {
  'ANTHROPIC': 'https://api.anthropic.com/v1',
  'OPENAI': 'https://api.openai.com/v1',
  'GOOGLE': 'https://generativelanguage.googleapis.com/v1beta',
  'GROQ': 'https://api.groq.com/openai/v1',
  'MISTRAL': 'https://api.mistral.ai/v1',
  'COHERE': 'https://api.cohere.ai/v1',
  'DEEPSEEK': 'https://api.deepseek.com/v1',
  'TOGETHER': 'https://api.together.xyz/v1',
  'PERPLEXITY': 'https://api.perplexity.ai',
  'OPENROUTER': 'https://openrouter.ai/api/v1',
  'FIREWORKS': 'https://api.fireworks.ai/inference/v1',
  'UNKNOWN': '' // User will fill manually
};

// Provider options for Select dropdown
export const PROVIDER_OPTIONS = LLM_PROVIDERS.map(provider => ({
  label: provider,
  value: provider
}));
