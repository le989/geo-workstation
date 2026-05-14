import type { GeoPromptType, UserIntent } from "./geo-prompts";
import { apiRequest } from "./http";

export type RecordMethod = "manual" | "api" | "import";
export type GeoHitEntryPoint =
  | "api_model"
  | "web_search_api"
  | "web_pc"
  | "web_mobile"
  | "app_ios"
  | "app_android"
  | "manual";
export type GeoHitDetectionMethod =
  | "manual"
  | "api"
  | "web_search"
  | "browser_capture"
  | "mobile_emulation"
  | "app_manual";
export type GeoHitDeviceType = "desktop" | "mobile" | "ios" | "android" | "api";
export type GeoHitLevel =
  | "recommended"
  | "mentioned"
  | "cited"
  | "competitor_only"
  | "not_mentioned"
  | "unclear";
export type ProviderErrorCategory =
  | "network_timeout"
  | "network_fetch_failed"
  | "network_connection_reset"
  | "provider_auth_error"
  | "provider_rate_limit"
  | "provider_insufficient_balance"
  | "provider_model_error"
  | "provider_tool_error"
  | "provider_bad_request"
  | "provider_unknown";

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ModelInclusionGeoPrompt = {
  id: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent;
};

export type ModelInclusionRecord = {
  id: string;
  geoPromptId: string;
  model: string;
  platform?: string;
  entryPoint?: GeoHitEntryPoint | string;
  detectionMethod?: GeoHitDetectionMethod | string;
  deviceType?: GeoHitDeviceType | string;
  isWebSearchEnabled: boolean;
  isLoggedIn: boolean;
  checkedAt: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition?: number | null;
  citedOfficialSite: boolean;
  citedContentAsset: boolean;
  competitorMentioned: boolean;
  hitLevel?: GeoHitLevel | string;
  answerSummary?: string;
  rawAnswer?: string;
  citations?: unknown;
  searchResults?: unknown;
  screenshotPath?: string;
  errorMessage?: string;
  competitors: string[];
  recordMethod: RecordMethod;
  createdBy: string;
  createdAt: string;
  geoPrompt: ModelInclusionGeoPrompt;
  retryCount?: number;
  errorCategory?: ProviderErrorCategory;
};

export type ModelInclusionRecordQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  geoPromptId?: string;
  model?: string;
  platform?: string;
  entryPoint?: GeoHitEntryPoint;
  detectionMethod?: GeoHitDetectionMethod;
  deviceType?: GeoHitDeviceType;
  isWebSearchEnabled?: boolean;
  isLoggedIn?: boolean;
  brandMentioned?: boolean;
  brandRecommended?: boolean;
  citedOfficialSite?: boolean;
  citedContentAsset?: boolean;
  competitorMentioned?: boolean;
  hitLevel?: GeoHitLevel;
  recordMethod?: RecordMethod;
  createdBy?: string;
  checkedFrom?: string;
  checkedTo?: string;
  productLine?: string;
  promptType?: GeoPromptType;
  userIntent?: UserIntent;
};

export type CreateModelInclusionRecordPayload = {
  geoPromptId: string;
  model: string;
  platform?: string;
  entryPoint?: GeoHitEntryPoint;
  detectionMethod?: GeoHitDetectionMethod;
  deviceType?: GeoHitDeviceType;
  isWebSearchEnabled?: boolean;
  isLoggedIn?: boolean;
  checkedAt?: string;
  brandMentioned?: boolean;
  brandRecommended?: boolean;
  rankingPosition?: number;
  citedOfficialSite?: boolean;
  citedContentAsset?: boolean;
  competitorMentioned?: boolean;
  hitLevel?: GeoHitLevel;
  answerSummary?: string;
  rawAnswer?: string;
  citations?: unknown;
  searchResults?: unknown;
  screenshotPath?: string;
  errorMessage?: string;
  competitors?: string[];
  recordMethod?: RecordMethod;
  createdBy?: string;
};

export type ImportModelInclusionRecordRow = Partial<CreateModelInclusionRecordPayload> & {
  promptText?: string;
};

export type ImportModelInclusionRecordsPayload = {
  rows: ImportModelInclusionRecordRow[];
};

export type FailedModelInclusionImportRow = {
  rowIndex: number;
  row: ImportModelInclusionRecordRow;
  errors: string[];
};

export type ImportModelInclusionRecordsResult = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdItems: ModelInclusionRecord[];
  failedRows: FailedModelInclusionImportRow[];
};

export type WebSearchCheckPayload = {
  geoPromptIds: string[];
  provider: "kimi_web_search" | "volcengine_web_search";
  model?: string;
  brandName?: string;
  companyName?: string;
  websiteUrl?: string;
  entryPoint?: "web_search_api";
  isLoggedIn?: boolean;
  limit?: number;
};

export type FailedWebSearchCheckItem = {
  geoPromptId: string;
  promptText?: string;
  errorMessage: string;
  errorCategory?: ProviderErrorCategory;
  retryCount?: number;
  record?: ModelInclusionRecord;
};

export type WebSearchCheckResult = {
  provider: "kimi_web_search" | "volcengine_web_search";
  successCount: number;
  failedCount: number;
  createdItems: ModelInclusionRecord[];
  failedItems: FailedWebSearchCheckItem[];
};

export type UncoveredPrompt = {
  geoPromptId: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent;
  priority: number;
  trackEnabled: boolean;
  latestCoverageStatus?: string;
};

export type UncoveredPromptsQuery = {
  page?: number;
  pageSize?: number;
  model?: string;
  productLine?: string;
  promptType?: GeoPromptType;
  userIntent?: UserIntent;
  trackEnabled?: boolean;
  checkedFrom?: string;
  checkedTo?: string;
};

export type ModelInclusionSummaryQuery = {
  model?: string;
  productLine?: string;
  checkedFrom?: string;
  checkedTo?: string;
};

export type ModelInclusionSummary = {
  totalRecords: number;
  mentionedCount: number;
  notMentionedCount: number;
  recommendedCount: number;
  notRecommendedCount: number;
  citedOfficialSiteCount: number;
  citedContentAssetCount: number;
  competitorMentionedCount: number;
  webSearchEnabledCount: number;
  loggedInCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  citedOfficialSiteRate: number;
  citedContentAssetRate: number;
  competitorMentionRate: number;
  modelDistribution: Record<string, number>;
  platformDistribution: Record<string, number>;
  entryPointDistribution: Record<string, number>;
  hitLevelDistribution: Record<string, number>;
  productLineDistribution: Record<string, number>;
};

const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const getModelInclusionRecords = (params: ModelInclusionRecordQuery = {}) =>
  apiRequest<PaginatedResponse<ModelInclusionRecord>>(
    `/api/model-inclusion-records${toQueryString(params)}`
  );

export const createModelInclusionRecord = (payload: CreateModelInclusionRecordPayload) =>
  apiRequest<ModelInclusionRecord>("/api/model-inclusion-records", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const importModelInclusionRecords = (payload: ImportModelInclusionRecordsPayload) =>
  apiRequest<ImportModelInclusionRecordsResult>("/api/model-inclusion-records/import", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const runKimiWebSearchCheck = (payload: WebSearchCheckPayload) =>
  apiRequest<WebSearchCheckResult>("/api/model-inclusion-records/web-search-check", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const exportModelInclusionRecords = (params: ModelInclusionRecordQuery = {}) =>
  apiRequest<string>(`/api/model-inclusion-records/export${toQueryString(params)}`);

export const getUncoveredPrompts = (params: UncoveredPromptsQuery = {}) =>
  apiRequest<PaginatedResponse<UncoveredPrompt>>(
    `/api/model-inclusion-records/uncovered-prompts${toQueryString(params)}`
  );

export const getModelInclusionSummary = (params: ModelInclusionSummaryQuery = {}) =>
  apiRequest<ModelInclusionSummary>(`/api/model-inclusion-records/summary${toQueryString(params)}`);
