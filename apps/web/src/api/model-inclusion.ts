import type { GeoPromptType, UserIntent } from "./geo-prompts";
import { apiRequest } from "./http";

export type RecordMethod = "manual" | "api" | "import";

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
  checkedAt: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition?: number | null;
  citedOfficialSite: boolean;
  answerSummary?: string;
  competitors: string[];
  recordMethod: RecordMethod;
  createdBy: string;
  createdAt: string;
  geoPrompt: ModelInclusionGeoPrompt;
};

export type ModelInclusionRecordQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  geoPromptId?: string;
  model?: string;
  brandMentioned?: boolean;
  brandRecommended?: boolean;
  citedOfficialSite?: boolean;
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
  checkedAt?: string;
  brandMentioned?: boolean;
  brandRecommended?: boolean;
  rankingPosition?: number;
  citedOfficialSite?: boolean;
  answerSummary?: string;
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
  brandMentionRate: number;
  brandRecommendRate: number;
  citedOfficialSiteRate: number;
  modelDistribution: Record<string, number>;
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

export const exportModelInclusionRecords = (params: ModelInclusionRecordQuery = {}) =>
  apiRequest<string>(`/api/model-inclusion-records/export${toQueryString(params)}`);

export const getUncoveredPrompts = (params: UncoveredPromptsQuery = {}) =>
  apiRequest<PaginatedResponse<UncoveredPrompt>>(
    `/api/model-inclusion-records/uncovered-prompts${toQueryString(params)}`
  );

export const getModelInclusionSummary = (params: ModelInclusionSummaryQuery = {}) =>
  apiRequest<ModelInclusionSummary>(`/api/model-inclusion-records/summary${toQueryString(params)}`);
