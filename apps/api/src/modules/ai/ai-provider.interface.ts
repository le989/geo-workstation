export const MOCK_AI_PROVIDER = "mock";
export const OPENAI_COMPATIBLE_PROVIDER = "openai_compatible";

export type GenerateTextInput = {
  provider?: string;
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  purpose: string;
  relatedType?: string;
  relatedId?: string;
};

export type GenerateTextResult = {
  text: string;
  provider: string;
  model: string;
  tokenInput?: number;
  tokenOutput?: number;
  raw?: unknown;
};

export interface AiTextProvider {
  readonly provider: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}

export function isMockAiProvider(provider?: string): boolean {
  return !provider || normalizeAiProvider(provider) === MOCK_AI_PROVIDER;
}

export function isOpenAICompatibleProvider(provider?: string): boolean {
  const normalized = normalizeAiProvider(provider);
  return ["deepseek", "openai", OPENAI_COMPATIBLE_PROVIDER, "siliconflow", "silicon_flow"].includes(
    normalized
  );
}

export function normalizeAiProvider(provider?: string): string {
  return (provider?.trim().toLowerCase().replaceAll("-", "_") || MOCK_AI_PROVIDER) as string;
}
