import { apiRequest } from "./http";

export type GeoPromptType = "base" | "distilled" | "brand" | "scene";
export type ResourceVisibility = "PRIVATE" | "COMPANY" | "PLATFORM";

export type UserIntent =
  | "selection"
  | "purchase"
  | "manufacturer_recommendation"
  | "domestic_alternative"
  | "comparison"
  | "troubleshooting"
  | "application_solution"
  | "brand_verification";

export type GeoPrompt = {
  id: string;
  type: GeoPromptType;
  baseWord?: string;
  promptText: string;
  productLine?: string;
  scenario?: string;
  userIntent: UserIntent;
  priority: number;
  targetModels: string[];
  source?: string;
  trackEnabled: boolean;
  latestCoverageStatus?: string;
  companyId?: string;
  visibility: ResourceVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type GeoPromptQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: GeoPromptType;
  productLine?: string;
  userIntent?: UserIntent;
  priority?: number;
  trackEnabled?: boolean;
  latestCoverageStatus?: string;
  createdBy?: string;
};

export type CreateGeoPromptPayload = {
  type: GeoPromptType;
  baseWord?: string;
  promptText: string;
  productLine?: string;
  scenario?: string;
  userIntent: UserIntent;
  priority?: number;
  targetModels?: string[];
  source?: string;
  trackEnabled?: boolean;
  latestCoverageStatus?: string;
  createdBy?: string;
};

export type UpdateGeoPromptPayload = Partial<CreateGeoPromptPayload>;

export type BulkImportGeoPromptRow = CreateGeoPromptPayload;

export type BulkImportGeoPromptsPayload = {
  rows: BulkImportGeoPromptRow[];
  createdBy?: string;
};

export type DuplicateGeoPromptRow = {
  rowIndex: number;
  promptText: string;
  reason: "duplicate_in_batch" | "duplicate_in_database";
};

export type FailedGeoPromptRow = {
  rowIndex: number;
  row: Record<string, unknown>;
  errors: string[];
};

export type BulkImportGeoPromptsResult = {
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  failedCount: number;
  skippedCount: number;
  createdItems: GeoPrompt[];
  duplicateRows: DuplicateGeoPromptRow[];
  failedRows: FailedGeoPromptRow[];
};

export type DeleteGeoPromptResult = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: string;
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

export const getGeoPrompts = (params: GeoPromptQuery = {}) =>
  apiRequest<PaginatedResponse<GeoPrompt>>(`/api/geo-prompts${toQueryString(params)}`);

export const createGeoPrompt = (payload: CreateGeoPromptPayload) =>
  apiRequest<GeoPrompt>("/api/geo-prompts", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateGeoPrompt = (id: string, payload: UpdateGeoPromptPayload) =>
  apiRequest<GeoPrompt>(`/api/geo-prompts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteGeoPrompt = (id: string) =>
  apiRequest<DeleteGeoPromptResult>(`/api/geo-prompts/${id}`, {
    method: "DELETE"
  });

export const bulkImportGeoPrompts = (payload: BulkImportGeoPromptsPayload) =>
  apiRequest<BulkImportGeoPromptsResult>("/api/geo-prompts/bulk-import", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const exportGeoPrompts = (params: GeoPromptQuery = {}) =>
  apiRequest<string>(`/api/geo-prompts/export${toQueryString(params)}`);
