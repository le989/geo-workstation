import { UserIntent } from "@prisma/client";

export type AnalysisPromptSuggestion = {
  promptText: string;
  userIntent?: UserIntent;
  recommendedContentType?: string;
  reason?: string;
};

export function normalizeAnalysisPromptSuggestions(value: unknown): AnalysisPromptSuggestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenPromptTexts = new Set<string>();
  const suggestions: AnalysisPromptSuggestion[] = [];

  for (const item of value) {
    const suggestion = normalizeSuggestion(item);

    if (!suggestion || seenPromptTexts.has(suggestion.promptText)) {
      continue;
    }

    seenPromptTexts.add(suggestion.promptText);
    suggestions.push(suggestion);
  }

  return suggestions;
}

function normalizeSuggestion(value: unknown): AnalysisPromptSuggestion | undefined {
  if (typeof value === "string") {
    const promptText = value.trim();
    return promptText ? { promptText } : undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const promptText = typeof record.promptText === "string" ? record.promptText.trim() : "";

  if (!promptText) {
    return undefined;
  }

  return {
    promptText,
    userIntent: normalizeUserIntent(record.userIntent),
    recommendedContentType:
      typeof record.recommendedContentType === "string"
        ? record.recommendedContentType.trim() || undefined
        : undefined,
    reason: typeof record.reason === "string" ? record.reason.trim() || undefined : undefined
  };
}

function normalizeUserIntent(value: unknown): UserIntent | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return Object.values(UserIntent).includes(value as UserIntent)
    ? (value as UserIntent)
    : undefined;
}
