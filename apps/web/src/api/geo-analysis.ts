import type { ContentTaskDetail, TaskStatus } from "./content";
import type { GeoPromptType, UserIntent } from "./geo-prompts";
import { apiRequest } from "./http";

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AnalysisPromptSuggestion = {
  promptText: string;
  userIntent?: UserIntent;
  recommendedContentType?: string;
  reason?: string;
};

export type GeoAnalysisTask = {
  id: string;
  name: string;
  brandName: string;
  websiteUrl?: string;
  productLine?: string;
  targetModels: string[];
  status: TaskStatus;
  summary?: Record<string, unknown>;
  contentGaps: string[];
  knowledgeGaps: string[];
  promptSuggestions: AnalysisPromptSuggestion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GeoModelResult = {
  id: string;
  analysisTaskId: string;
  promptText: string;
  model: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition: number | null;
  citedOfficialSite: boolean;
  answerSummary?: string;
  competitors: string[];
  rawAnswer?: string;
  createdAt: string;
};

export type RelatedAnalysisPrompt = {
  id: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent;
  priority: number;
  trackEnabled: boolean;
  source?: string;
};

export type GeoAnalysisTaskDetail = {
  task: GeoAnalysisTask;
  modelResults: GeoModelResult[];
  relatedPrompts: RelatedAnalysisPrompt[];
  relatedContentTasks: [];
};

export type GeoAnalysisTaskQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TaskStatus;
  productLine?: string;
  createdBy?: string;
  targetModel?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type CreateGeoAnalysisTaskPayload = {
  name: string;
  brandName: string;
  websiteUrl?: string;
  productLine?: string;
  baseWords?: string[];
  targetModels: string[];
  createdBy?: string;
};

export type UpdateGeoAnalysisTaskPayload = Partial<CreateGeoAnalysisTaskPayload>;

export type ConvertAnalysisPromptsPayload = {
  selectedPromptTexts?: string[];
  promptType?: GeoPromptType;
  productLine?: string;
  userIntent?: UserIntent;
  priority?: number;
  trackEnabled?: boolean;
  createdBy?: string;
};

export type ConvertAnalysisPromptsResult = {
  totalSelected: number;
  createdCount: number;
  skippedCount: number;
  createdItems: RelatedAnalysisPrompt[];
  skippedItems: Array<{
    promptText: string;
    reason: string;
  }>;
};

export type CreateAnalysisContentTaskPayload = {
  name?: string;
  knowledgeBaseId?: string;
  instructionTemplateId?: string;
  generationType?: string;
  targetModel?: string;
  geoPromptIds?: string[];
  createdBy?: string;
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

export const getGeoAnalysisTasks = (params: GeoAnalysisTaskQuery = {}) =>
  apiRequest<PaginatedResponse<GeoAnalysisTask>>(`/api/geo-analysis-tasks${toQueryString(params)}`);

export const createGeoAnalysisTask = (payload: CreateGeoAnalysisTaskPayload) =>
  apiRequest<GeoAnalysisTask>("/api/geo-analysis-tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getGeoAnalysisTask = (id: string) =>
  apiRequest<GeoAnalysisTaskDetail>(`/api/geo-analysis-tasks/${id}`);

export const updateGeoAnalysisTask = (id: string, payload: UpdateGeoAnalysisTaskPayload) =>
  apiRequest<GeoAnalysisTask>(`/api/geo-analysis-tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const runGeoAnalysisTask = (id: string) =>
  apiRequest<GeoAnalysisTaskDetail>(`/api/geo-analysis-tasks/${id}/run`, {
    method: "POST"
  });

export const convertAnalysisPrompts = (id: string, payload: ConvertAnalysisPromptsPayload) =>
  apiRequest<ConvertAnalysisPromptsResult>(`/api/geo-analysis-tasks/${id}/convert-prompts`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const createAnalysisContentTask = (id: string, payload: CreateAnalysisContentTaskPayload) =>
  apiRequest<ContentTaskDetail>(`/api/geo-analysis-tasks/${id}/create-content-task`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
