import type { GeoPrompt, GeoPromptType } from "./geo-prompts";
import type { InstructionTemplate } from "./instructions";
import type { KnowledgeBase } from "./knowledge";
import { apiRequest } from "./http";

export type TaskStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";
export type ContentScopeType = "all" | "product_line" | "selected_files";
export type PublishStatus = "publish_ready" | "needs_review" | "not_recommended";

export type ContentKnowledgeScope =
  | {
      type: "all";
    }
  | {
      type: "product_line";
      productLineId: string;
      summary?: string;
    }
  | {
      type: "selected_files";
      selectedKnowledgeFileIds: string[];
      summary?: string;
    };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ContentTask = {
  id: string;
  companyId?: string;
  name: string;
  productLine?: string;
  productLineId?: string;
  knowledgeBaseId?: string | null;
  knowledgeScope?: ContentKnowledgeScope;
  instructionTemplateId?: string | null;
  generationType: string;
  targetModel?: string;
  status: TaskStatus;
  provider?: string;
  model?: string;
  primaryItem?: PrimaryContentItem;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentItem = {
  id: string;
  companyId?: string;
  taskId: string;
  geoPromptId?: string | null;
  title: string;
  body: string;
  geoOptimizationPoints: string[];
  suggestedPublishChannel?: string;
  status: string;
  publishStatus?: PublishStatus;
  qualityGateResult?: QualityGateResult;
  qualityCheckedAt?: string;
  publishPackage?: ArticlePublishPackage;
  publishPackageGeneratedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type PrimaryContentItem = Pick<
  ContentItem,
  | "id"
  | "title"
  | "status"
  | "publishStatus"
  | "qualityGateResult"
  | "qualityCheckedAt"
  | "publishPackageGeneratedAt"
  | "errorMessage"
  | "updatedAt"
>;

export type RelatedKnowledgeBase = Pick<
  KnowledgeBase,
  "id" | "name" | "productLine" | "description" | "status"
>;

export type RelatedInstructionTemplate = Pick<
  InstructionTemplate,
  "id" | "name" | "instructionType" | "contentType" | "targetModel"
>;

export type RelatedGeoPrompt = {
  id: string;
  type: GeoPromptType;
  promptText: string;
  productLine?: string;
  scenario?: string;
};

export type AiCallLog = {
  id: string;
  provider: string;
  model: string;
  purpose: string;
  relatedType?: string;
  relatedId?: string;
  status: "pending" | "succeeded" | "failed";
  createdAt: string;
};

export type ContentTaskDetail = {
  task: ContentTask;
  items: ContentItem[];
  knowledgeBase?: RelatedKnowledgeBase;
  instructionTemplate?: RelatedInstructionTemplate;
  prompts: RelatedGeoPrompt[];
  aiCallLogs: AiCallLog[];
};

export type ContentTaskQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  productLine?: string;
  status?: TaskStatus;
  generationType?: string;
  targetModel?: string;
  createdBy?: string;
};

export type ContentItemQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  taskId?: string;
  geoPromptId?: string;
  status?: string;
};

export type CreateContentTaskPayload = {
  name: string;
  productLine?: string;
  productLineId?: string;
  knowledgeBaseId?: string;
  instructionTemplateId?: string;
  generationType: string;
  targetModel?: string;
  provider?: string;
  model?: string;
  scopeType?: ContentScopeType;
  selectedKnowledgeFileIds?: string[];
  geoPromptIds: string[];
};

export type UpdateContentItemPayload = {
  title?: string;
  body?: string;
  geoOptimizationPoints?: string[];
  suggestedPublishChannel?: string;
  status?: string;
};

export type DeleteContentItemResult = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: string;
};

export type ContentQualityRiskType =
  | "unsupported_claim"
  | "parameter_risk"
  | "protocol_risk"
  | "certification_risk"
  | "over_marketing"
  | "brand_expression"
  | "geo_structure"
  | "knowledge_gap";

export type ContentQualitySeverity = "low" | "medium" | "high";
export type ContentQualityLevel = "good" | "needs_review" | "risky";

export type ContentQualityRiskItem = {
  type: ContentQualityRiskType;
  severity: ContentQualitySeverity;
  text: string;
  reason: string;
  suggestion: string;
};

export type ContentQualityCheckPayload = {
  provider?: string;
  model?: string;
  checkMode?: string;
};

export type ContentQualityCheckResult = {
  score: number;
  level: ContentQualityLevel;
  summary: string;
  riskItems: ContentQualityRiskItem[];
  positiveItems: string[];
  publishReadiness: {
    canPublish: boolean;
    needsHumanReview: boolean;
    suggestedAction: string;
  };
  publishStatus?: PublishStatus;
  qualityGateResult?: QualityGateResult;
  qualityCheckedAt?: string;
};

export type QualityGateLevel = "low" | "medium" | "high";

export type QualityGateTextHit = {
  word: string;
  field: "title" | "body";
  snippet: string;
};

export type QualityGateResult = {
  version: "article_quality_gate_v1";
  checkedAt: string;
  provider: string;
  model?: string;
  score: number;
  level: QualityGateLevel;
  publishStatus: PublishStatus;
  riskItems: ContentQualityRiskItem[];
  positiveItems: string[];
  manualReviewItems: string[];
  forbiddenWordHits: QualityGateTextHit[];
  aiStyleIssues: QualityGateTextHit[];
  factBoundaryIssues: QualityGateTextHit[];
  scopeSummary: {
    knowledgeBaseId?: string | null;
    scopeType: ContentScopeType;
    selectedFileCount: number;
    productLineId?: string | null;
  };
  recommendation: string;
};

export type OptimizeContentItemForPublishPayload = {
  provider?: string;
  model?: string;
  targetChannel?: string;
  optimizationGoal?: string;
};

export type PublishOptimizationResult = {
  title: string;
  body: string;
  changes: string[];
  warnings: string[];
};

export type PublishSourceType = "original" | "optimized";
export type PublishFormatStyle = "general" | "website" | "zhihu_baijiahao" | "wechat";

export type FormatContentItemForPublishPayload = {
  sourceType?: PublishSourceType;
  optimizedTitle?: string;
  optimizedBody?: string;
  formatStyle?: PublishFormatStyle;
  includeGeoNotes?: boolean;
  includeWarnings?: boolean;
};

export type PublishFormatResult = {
  title: string;
  html: string;
  markdown: string;
  plainText: string;
  style: PublishFormatStyle;
  copyTips: string[];
};

export type ArticlePublishPackage = {
  titles: {
    shortTitle: string;
    standardTitle: string;
    searchTitle: string;
    platformTitles: {
      baijiahao: string;
      toutiao: string;
      zhihu: string;
      xiaohongshu: string;
      douyin: string;
      generic: string;
    };
  };
  summary: string;
  keywords: {
    primaryKeywords: string[];
    longTailKeywords: string[];
    platformTags: string[];
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  evidence: Array<{
    knowledgeBaseName?: string;
    fileName?: string;
    productLineName?: string;
    scopeType?: string;
    sourceNote?: string;
  }>;
  riskTips: string[];
  manualCheckItems: string[];
};

export type PublishPackageExportFormat = "markdown" | "txt";
export type ContentItemExportType = "review" | "publish";
export type ContentItemExportFormat = "markdown" | "txt";

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

export const getContentTasks = (params: ContentTaskQuery = {}) =>
  apiRequest<PaginatedResponse<ContentTask>>(`/api/content-tasks${toQueryString(params)}`);

export const createContentTask = (payload: CreateContentTaskPayload) =>
  apiRequest<ContentTaskDetail>("/api/content-tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getContentTask = (id: string) =>
  apiRequest<ContentTaskDetail>(`/api/content-tasks/${id}`);

export const retryContentTask = (id: string) =>
  apiRequest<ContentTaskDetail>(`/api/content-tasks/${id}/retry`, {
    method: "POST"
  });

export const archiveContentTask = (id: string) =>
  apiRequest<ContentTask>(`/api/content-tasks/${id}/archive`, {
    method: "POST"
  });

export const getContentItems = (params: ContentItemQuery = {}) =>
  apiRequest<PaginatedResponse<ContentItem>>(`/api/content-items${toQueryString(params)}`);

export const updateContentItem = (id: string, payload: UpdateContentItemPayload) =>
  apiRequest<ContentItem>(`/api/content-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteContentItem = (id: string) =>
  apiRequest<DeleteContentItemResult>(`/api/content-items/${id}`, {
    method: "DELETE"
  });

export const exportContentItem = (
  id: string,
  options: {
    type?: ContentItemExportType;
    format?: ContentItemExportFormat;
  } = {}
) =>
  apiRequest<string>(
    `/api/content-items/${id}/export${toQueryString({
      type: options.type,
      format: options.format
    })}`
  );

export const generateContentItemPublishPackage = (id: string) =>
  apiRequest<ContentItem>(`/api/content-items/${id}/publish-package`, {
    method: "POST"
  });

export const exportContentItemPublishPackage = (
  id: string,
  format: PublishPackageExportFormat
) => apiRequest<string>(`/api/content-items/${id}/publish-package/export?format=${format}`);

export const qualityCheckContentItem = (id: string, payload: ContentQualityCheckPayload = {}) =>
  apiRequest<ContentQualityCheckResult>(`/api/content-items/${id}/quality-check`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const fixRiskWordsAndRecheckContentItem = (id: string) =>
  apiRequest<ContentItem>(`/api/content-items/${id}/risk-word-fix`, {
    method: "POST"
  });

export const optimizeContentItemForPublish = (
  id: string,
  payload: OptimizeContentItemForPublishPayload = {}
) =>
  apiRequest<PublishOptimizationResult>(`/api/content-items/${id}/optimize-for-publish`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const formatContentItemForPublish = (
  id: string,
  payload: FormatContentItemForPublishPayload = {}
) =>
  apiRequest<PublishFormatResult>(`/api/content-items/${id}/format-for-publish`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export type { GeoPrompt };
