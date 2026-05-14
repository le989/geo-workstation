import { apiGet } from "./http";
import type { GeoPromptType, UserIntent } from "./geo-prompts";

export type ReportQuery = {
  productLine?: string;
  model?: string;
  platform?: string;
  entryPoint?: string;
  from?: string;
  to?: string;
  promptType?: GeoPromptType;
  userIntent?: UserIntent;
  trackEnabled?: boolean;
  priority?: number;
  latestOnly?: boolean;
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
  citedContentAsset: boolean;
  competitorMentioned: boolean;
  hitLevel?: string;
  platform?: string;
  entryPoint?: string;
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
  citedContentAssetCount: number;
  citedContentAssetRate: number;
  competitorMentionedCount: number;
  competitorMentionRate: number;
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
  citedContentAssetByModel: ReportDistribution;
  competitorMentionedByModel: ReportDistribution;
  brandMentionRateByModel: ReportDistribution;
  brandRecommendRateByModel: ReportDistribution;
  hitLevelDistribution: ReportDistribution;
  platformDistribution: ReportDistribution;
  entryPointDistribution: ReportDistribution;
  topRecommendedPrompts: ModelCoveragePromptSummary[];
  notMentionedPrompts: ModelCoveragePromptSummary[];
};

export type GeoHitOverallStatus =
  | "all_recommended"
  | "all_mentioned"
  | "partial_hit"
  | "not_mentioned"
  | "competitor_only"
  | "unclear"
  | "unchecked";

export type GeoHitSummaryOverview = {
  promptCount: number;
  checkedPromptCount: number;
  recordCount: number;
  latestRecordCount: number;
  brandMentionedCount: number;
  brandRecommendedCount: number;
  citedOfficialSiteCount: number;
  citedContentAssetCount: number;
  competitorMentionedCount: number;
  notMentionedCount: number;
  unclearCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  officialSiteCitationRate: number;
  competitorMentionRate: number;
  notMentionedRate: number;
};

export type GeoHitComparisonItem = {
  platform?: string;
  entryPoint?: string;
  recordCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  notMentionedRate: number;
  competitorMentionRate: number;
  hitLevelDistribution: ReportDistribution;
};

export type GeoHitPromptMatrixResult = {
  platform: string;
  entryPoint: string;
  hitLevel: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  citedOfficialSite: boolean;
  competitorMentioned: boolean;
  checkedAt: string;
};

export type GeoHitPromptMatrixItem = {
  geoPromptId: string;
  promptText: string;
  productLine?: string;
  priority: number;
  results: GeoHitPromptMatrixResult[];
  overallStatus: GeoHitOverallStatus;
};

export type GeoHitOptimizationSuggestion = {
  type: string;
  priority: "high" | "medium" | "low";
  geoPromptId: string;
  promptText: string;
  reason: string;
  suggestedAction: string;
};

export type GeoHitSummaryReport = {
  overview: GeoHitSummaryOverview;
  platformComparison: GeoHitComparisonItem[];
  entryPointComparison: GeoHitComparisonItem[];
  promptMatrix: GeoHitPromptMatrixItem[];
  optimizationSuggestions: GeoHitOptimizationSuggestion[];
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
    platform: query.platform,
    entryPoint: query.entryPoint,
    from: query.from,
    to: query.to,
    promptType: query.promptType,
    userIntent: query.userIntent,
    trackEnabled: query.trackEnabled,
    priority: query.priority,
    latestOnly: query.latestOnly,
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

export const getGeoHitSummary = (query: ReportQuery = {}) =>
  apiGet<GeoHitSummaryReport>(`/api/reports/geo-hit-summary${buildReportQuery(query)}`);

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
      platform: query.platform,
      entryPoint: query.entryPoint,
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
