export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  completeStructured<T>(messages: LLMMessage[], schema: object, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(baseUrl: string, apiKey: string, defaultModel: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`LLM API error: ${response.status} ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content ?? "",
      usage: data.usage,
    };
  }

  async completeStructured<T>(messages: LLMMessage[], schema: object, options: LLMOptions = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1500,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "structured_output",
            schema,
            strict: true,
          },
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`LLM structured API error: ${response.status} ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as T;
  }
}

import { getLLMConfig } from "./config";

export function createLLMProvider(): LLMProvider | null {
  const config = getLLMConfig();
  
  if (!config.enabled || !config.baseUrl || !config.apiKey) {
    return null;
  }

  return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, config.model);
}