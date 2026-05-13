import { apiGet } from "./http";
import type { GeoPromptType, UserIntent } from "./geo-prompts";

export type ReportQuery = {
  productLine?: string;
  model?: string;
  from?: string;
  to?: string;
  promptType?: GeoPromptType;
  userIntent?: UserIntent;
  trackEnabled?: boolean;
  priority?: number;
  generationType?: string;
  status?: string;
  materialType?: string;
  limit?: number;
};

export type ReportPromptSummary = {
  geoPromptId: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent | string;
  priority: number;
  trackEnabled: boolean;
  latestCoverageStatus?: string;
};

export type ModelCoveragePromptSummary = {
  geoPromptId: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent | string;
  model: string;
  checkedAt: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition?: number | null;
  citedOfficialSite: boolean;
};

export type ReportDistribution = Record<string, number>;

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

export type PromptCoverageReport = {
  totalPrompts: number;
  trackedPrompts: number;
  promptsWithRecords: number;
  promptsWithoutRecords: number;
  coverageRate: number;
  byType: ReportDistribution;
  byProductLine: ReportDistribution;
  byUserIntent: ReportDistribution;
  byLatestCoverageStatus: ReportDistribution;
  highPriorityUncoveredPrompts: ReportPromptSummary[];
};

export type ModelCoverageReport = {
  totalRecords: number;
  modelDistribution: ReportDistribution;
  mentionedByModel: ReportDistribution;
  recommendedByModel: ReportDistribution;
  citedOfficialSiteByModel: ReportDistribution;
  brandMentionRateByModel: ReportDistribution;
  brandRecommendRateByModel: ReportDistribution;
  topRecommendedPrompts: ModelCoveragePromptSummary[];
  notMentionedPrompts: ModelCoveragePromptSummary[];
};

export type ContentCoverageReport = {
  contentTaskCount: number;
  contentItemCount: number;
  succeededTaskCount: number;
  failedTaskCount: number;
  contentItemsByGenerationType: ReportDistribution;
  contentItemsByProductLine: ReportDistribution;
  contentItemsByStatus: ReportDistribution;
  promptsWithContent: number;
  promptsWithoutContent: number;
  highPriorityPromptsWithoutContent: ReportPromptSummary[];
};

export type KnowledgeCoverageReport = {
  knowledgeBaseCount: number;
  knowledgeFileCount: number;
  knowledgeChunkCount: number;
  chunksByProductLine: ReportDistribution;
  chunksByMaterialType: ReportDistribution;
  filesByParseStatus: ReportDistribution;
  productLinesWithoutKnowledge: string[];
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

export type OptimizationSuggestionsQuery = Pick<
  ReportQuery,
  "productLine" | "model" | "priority" | "limit"
>;

export type ReportExportType =
  | "geo_overview"
  | "prompt_coverage"
  | "model_coverage"
  | "content_coverage"
  | "knowledge_coverage"
  | "optimization_suggestions";

export type ReportExportQuery = ReportQuery & {
  reportType: ReportExportType;
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

const buildReportQuery = (query: ReportQuery = {}) =>
  toQueryString({
    productLine: query.productLine,
    model: query.model,
    from: query.from,
    to: query.to,
    promptType: query.promptType,
    userIntent: query.userIntent,
    trackEnabled: query.trackEnabled,
    priority: query.priority,
    generationType: query.generationType,
    status: query.status,
    materialType: query.materialType,
    limit: query.limit
  });

export const getGeoOverview = (query: ReportQuery = {}) =>
  apiGet<GeoOverviewReport>(`/api/reports/geo-overview${buildReportQuery(query)}`);

export const getPromptCoverage = (query: ReportQuery = {}) =>
  apiGet<PromptCoverageReport>(`/api/reports/prompt-coverage${buildReportQuery(query)}`);

export const getModelCoverage = (query: ReportQuery = {}) =>
  apiGet<ModelCoverageReport>(`/api/reports/model-coverage${buildReportQuery(query)}`);

export const getContentCoverage = (query: ReportQuery = {}) =>
  apiGet<ContentCoverageReport>(`/api/reports/content-coverage${buildReportQuery(query)}`);

export const getKnowledgeCoverage = (query: ReportQuery = {}) =>
  apiGet<KnowledgeCoverageReport>(`/api/reports/knowledge-coverage${buildReportQuery(query)}`);

export const getOptimizationSuggestions = (query: OptimizationSuggestionsQuery = {}) =>
  apiGet<OptimizationSuggestionsResponse>(
    `/api/reports/optimization-suggestions${buildReportQuery({
      limit: query.limit ?? 8,
      productLine: query.productLine,
      model: query.model,
      priority: query.priority
    })}`
  );

export const exportReport = (query: ReportExportQuery) =>
  apiGet<string>(
    `/api/reports/export${toQueryString({
      reportType: query.reportType,
      productLine: query.productLine,
      model: query.model,
      from: query.from,
      to: query.to,
      promptType: query.promptType,
      userIntent: query.userIntent,
      trackEnabled: query.trackEnabled,
      priority: query.priority,
      generationType: query.generationType,
      status: query.status,
      materialType: query.materialType,
      limit: query.limit
    })}`
  );
