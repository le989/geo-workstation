import { apiRequest } from "./http";
import type { ResourceVisibility } from "./geo-prompts";

export type ParseStatus = "pending" | "parsing" | "succeeded" | "failed";
export type KnowledgeMaterialType =
  | "product_material"
  | "aftersales_material"
  | "company_trust_material"
  | "content_reference_material"
  | "internal_process_material"
  | "customer_case_material";
export type KnowledgeReviewStatus = "pending" | "approved" | "disabled";
export type KnowledgeTrustLevel = "high" | "medium" | "low";
export type KnowledgeOfficialCitationStatus = "citable" | "not_citable";
export type KnowledgeApplicableModule =
  | "internal-search"
  | "geo-content"
  | "aftersales-qa"
  | "geo-analysis";

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type KnowledgeBase = {
  id: string;
  name: string;
  productLine?: string;
  description?: string;
  status: string;
  companyId?: string;
  visibility: ResourceVisibility;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunk = {
  id: string;
  knowledgeBaseId: string;
  fileId?: string | null;
  title: string;
  content: string;
  sourceType: string;
  productLine?: string;
  materialType?: string;
  materialTopic?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeFile = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  companyId?: string;
  sourceType: string;
  materialType: KnowledgeMaterialType;
  materialTopic?: string;
  applicableModules: KnowledgeApplicableModule[];
  sourceDescription?: string;
  trustLevel: KnowledgeTrustLevel;
  reviewStatus: KnowledgeReviewStatus;
  allowedDepartmentIds: string[];
  parseStatus: ParseStatus;
  errorMessage?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBaseDetail = {
  knowledgeBase: KnowledgeBase;
  filesCount: number;
  chunksCount: number;
  latestChunks: KnowledgeChunk[];
};

export type KnowledgeFileDetail = {
  knowledgeFile: KnowledgeFile;
  chunksCount: number;
  latestChunks: KnowledgeChunk[];
};

export type KnowledgeBaseQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  productLine?: string;
  status?: string;
  createdBy?: string;
};

export type KnowledgeChunkQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sourceType?: string;
  productLine?: string;
  materialType?: string;
  tags?: string[];
};

export type KnowledgeFileQuery = {
  page?: number;
  pageSize?: number;
  parseStatus?: ParseStatus;
  fileType?: string;
  search?: string;
  materialType?: string;
  materialTopic?: string;
  reviewStatus?: KnowledgeReviewStatus;
  trustLevel?: KnowledgeTrustLevel;
  applicableModule?: KnowledgeApplicableModule;
  officialCitationStatus?: KnowledgeOfficialCitationStatus;
};

export type CreateKnowledgeBasePayload = {
  name: string;
  productLine?: string;
  description?: string;
  status?: string;
  createdBy?: string;
};

export type UpdateKnowledgeBasePayload = Partial<CreateKnowledgeBasePayload>;

export type TextImportPayload = {
  title: string;
  content: string;
  sourceType?: string;
  productLine?: string;
  materialType?: string;
  tags?: string[];
  createdBy?: string;
};

export type KnowledgeMaterialMetadataPayload = {
  title?: string;
  materialType?: string;
  materialTopic?: string;
  applicableModules?: KnowledgeApplicableModule[];
  sourceDescription?: string;
  trustLevel?: KnowledgeTrustLevel;
  reviewStatus?: KnowledgeReviewStatus;
  allowedDepartmentIds?: string[];
};

export type ManualKnowledgeMaterialPayload = KnowledgeMaterialMetadataPayload & {
  title: string;
  content: string;
  tags?: string[];
  createdBy?: string;
};

export type UpdateKnowledgeChunkPayload = {
  title?: string;
  content?: string;
  sourceType?: string;
  productLine?: string;
  materialType?: string;
  tags?: string[];
};

export type UploadKnowledgeFileExtraFields = {
  title?: string;
  materialType?: string;
  materialTopic?: string;
  applicableModules?: KnowledgeApplicableModule[];
  sourceDescription?: string;
  trustLevel?: KnowledgeTrustLevel;
  reviewStatus?: KnowledgeReviewStatus;
  allowedDepartmentIds?: string[];
  tags?: string[];
  createdBy?: string;
};

export type UploadKnowledgeFileResult = {
  knowledgeFile: KnowledgeFile;
  parseStatus: ParseStatus;
  createdChunksCount: number;
  createdChunks: KnowledgeChunk[];
  errorMessage?: string;
};

export type ReparseKnowledgeFilePayload = {
  materialType?: string;
  tags?: string[];
};

export type DeleteKnowledgeBaseResult = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: string;
};

export type DeleteKnowledgeChunkResult = DeleteKnowledgeBaseResult;
export type DeleteKnowledgeFileResult = DeleteKnowledgeBaseResult;

const toQueryString = (
  params: Record<string, string | number | boolean | string[] | undefined>
) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        searchParams.set(key, value.join(","));
      }
      continue;
    }

    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const getKnowledgeBases = (params: KnowledgeBaseQuery = {}) =>
  apiRequest<PaginatedResponse<KnowledgeBase>>(`/api/knowledge-bases${toQueryString(params)}`);

export const createKnowledgeBase = (payload: CreateKnowledgeBasePayload) =>
  apiRequest<KnowledgeBase>("/api/knowledge-bases", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getKnowledgeBase = (id: string) =>
  apiRequest<KnowledgeBaseDetail>(`/api/knowledge-bases/${id}`);

export const updateKnowledgeBase = (id: string, payload: UpdateKnowledgeBasePayload) =>
  apiRequest<KnowledgeBase>(`/api/knowledge-bases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteKnowledgeBase = (id: string) =>
  apiRequest<DeleteKnowledgeBaseResult>(`/api/knowledge-bases/${id}`, {
    method: "DELETE"
  });

export const textImportKnowledge = (id: string, payload: TextImportPayload) =>
  apiRequest<KnowledgeChunk>(`/api/knowledge-bases/${id}/text-import`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const createManualKnowledgeMaterial = (
  id: string,
  payload: ManualKnowledgeMaterialPayload
) =>
  apiRequest<UploadKnowledgeFileResult>(`/api/knowledge-bases/${id}/manual-materials`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getKnowledgeChunks = (knowledgeBaseId: string, params: KnowledgeChunkQuery = {}) =>
  apiRequest<PaginatedResponse<KnowledgeChunk>>(
    `/api/knowledge-bases/${knowledgeBaseId}/chunks${toQueryString(params)}`
  );

export const updateKnowledgeChunk = (id: string, payload: UpdateKnowledgeChunkPayload) =>
  apiRequest<KnowledgeChunk>(`/api/knowledge-chunks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteKnowledgeChunk = (id: string) =>
  apiRequest<DeleteKnowledgeChunkResult>(`/api/knowledge-chunks/${id}`, {
    method: "DELETE"
  });

export const uploadKnowledgeFile = (
  knowledgeBaseId: string,
  file: File,
  extraFields: UploadKnowledgeFileExtraFields = {}
) => {
  const formData = new FormData();
  formData.set("file", file);

  if (extraFields.title) {
    formData.set("title", extraFields.title);
  }

  if (extraFields.materialType) {
    formData.set("materialType", extraFields.materialType);
  }

  if (extraFields.materialTopic) {
    formData.set("materialTopic", extraFields.materialTopic);
  }

  if (extraFields.applicableModules && extraFields.applicableModules.length > 0) {
    formData.set("applicableModules", extraFields.applicableModules.join(","));
  }

  if (extraFields.sourceDescription) {
    formData.set("sourceDescription", extraFields.sourceDescription);
  }

  if (extraFields.trustLevel) {
    formData.set("trustLevel", extraFields.trustLevel);
  }

  if (extraFields.reviewStatus) {
    formData.set("reviewStatus", extraFields.reviewStatus);
  }

  if (extraFields.allowedDepartmentIds && extraFields.allowedDepartmentIds.length > 0) {
    formData.set("allowedDepartmentIds", extraFields.allowedDepartmentIds.join(","));
  }

  if (extraFields.tags && extraFields.tags.length > 0) {
    formData.set("tags", extraFields.tags.join(","));
  }

  if (extraFields.createdBy) {
    formData.set("createdBy", extraFields.createdBy);
  }

  return apiRequest<UploadKnowledgeFileResult>(`/api/knowledge-bases/${knowledgeBaseId}/files`, {
    method: "POST",
    body: formData
  });
};

export const getKnowledgeFiles = (knowledgeBaseId: string, params: KnowledgeFileQuery = {}) =>
  apiRequest<PaginatedResponse<KnowledgeFile>>(
    `/api/knowledge-bases/${knowledgeBaseId}/files${toQueryString(params)}`
  );

export const getKnowledgeFile = (id: string) =>
  apiRequest<KnowledgeFileDetail>(`/api/knowledge-files/${id}`);

export const reparseKnowledgeFile = (id: string, payload: ReparseKnowledgeFilePayload = {}) =>
  apiRequest<UploadKnowledgeFileResult>(`/api/knowledge-files/${id}/reparse`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateKnowledgeFileMetadata = (
  id: string,
  payload: KnowledgeMaterialMetadataPayload
) =>
  apiRequest<KnowledgeFile>(`/api/knowledge-files/${id}/metadata`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteKnowledgeFile = (id: string) =>
  apiRequest<DeleteKnowledgeFileResult>(`/api/knowledge-files/${id}`, {
    method: "DELETE"
  });
