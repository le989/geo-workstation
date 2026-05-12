export type OptimizationSuggestionType =
  | "prompt_without_record"
  | "prompt_not_mentioned"
  | "prompt_without_content"
  | "product_line_without_knowledge"
  | "failed_content_task";

export type OptimizationSuggestion = {
  type: OptimizationSuggestionType;
  priority: number;
  title: string;
  reason: string;
  suggestedAction: string;
  relatedPromptId?: string;
  relatedPromptText?: string;
  relatedProductLine?: string;
  relatedModel?: string;
};

export function sortOptimizationSuggestions(
  suggestions: OptimizationSuggestion[]
): OptimizationSuggestion[] {
  return [...suggestions].sort(
    (left, right) =>
      right.priority - left.priority ||
      left.type.localeCompare(right.type) ||
      left.title.localeCompare(right.title)
  );
}
