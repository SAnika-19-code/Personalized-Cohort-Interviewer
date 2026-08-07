export interface LLMConfig {
  enabled: boolean;
  fallbackOnError: boolean;
  baseUrl: string | undefined;
  apiKey: string | undefined;
  model: string;
}

let cachedConfig: LLMConfig | null = null;

export function getLLMConfig(): LLMConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    enabled: process.env.USE_LLM === "true",
    fallbackOnError: process.env.LLM_FALLBACK_ON_ERROR !== "false",
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  };

  return cachedConfig;
}

export function isLLMEnabled(): boolean {
  const config = getLLMConfig();
  return config.enabled && !!config.baseUrl && !!config.apiKey;
}

export function resetLLMConfig(): void {
  cachedConfig = null;
}