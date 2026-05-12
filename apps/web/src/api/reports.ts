import { apiGet } from "./http";

export type GeoOverviewReport = {
  promptTotal: number;
  basePromptCount: number;
  distilledPromptCount: number;
  brandPromptCount: number;
  scenePromptCount: number;
  trackedPromptCount: number;
  highPriorityPromptCount: number;
  knowledgeBaseCount: number;
  knowledgeChunkCount: number;
  contentTaskCount: number;
  contentItemCount: number;
  failedContentTaskCount: number;
  modelInclusionRecordCount: number;
  brandMentionedCount: number;
  brandRecommendedCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  citedOfficialSiteCount: number;
  citedOfficialSiteRate: number;
  uncoveredTrackedPromptCount: number;
};

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

export type OptimizationSuggestionsResponse = {
  items: OptimizationSuggestion[];
};

export type OptimizationSuggestionsQuery = {
  productLine?: string;
  model?: string;
  priority?: number;
  limit?: number;
};

const toQueryString = (query: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const getGeoOverview = () => apiGet<GeoOverviewReport>("/api/reports/geo-overview");

export const getOptimizationSuggestions = (query: OptimizationSuggestionsQuery = {}) =>
  apiGet<OptimizationSuggestionsResponse>(
    `/api/reports/optimization-suggestions${toQueryString({
      limit: query.limit ?? 8,
      productLine: query.productLine,
      model: query.model,
      priority: query.priority
    })}`
  );
