import { apiGet, apiRequest } from "./http";
import type {
  KnowledgeApplicableModule,
  KnowledgeFile,
  KnowledgeMaterialType,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel
} from "./knowledge";

export type AftersalesAnswerStatus =
  | "answered"
  | "no_reliable_source"
  | "needs_clarification"
  | "failed";
export type AftersalesConversationStatus = "active" | "archived";
export type AftersalesFeedbackStatus = "none" | "pending" | "handled" | "no_action";
export type AftersalesFeedbackErrorType =
  | "citation_wrong"
  | "answer_incomplete"
  | "answer_wrong"
  | "knowledge_missing"
  | "question_unclear"
  | "other";

export type AftersalesCitedSource = {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  fileId: string;
  fileTitle: string;
  chunkId: string;
  materialType: KnowledgeMaterialType;
  snippet: string;
};

export type AftersalesQuestionRecord = {
  id: string;
  companyId: string;
  userId: string;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  conversationId?: string | null;
  sequence?: number | null;
  question: string;
  answer: string;
  answerStatus: AftersalesAnswerStatus;
  citedSources: AftersalesCitedSource[];
  usedMaterialTypes: KnowledgeMaterialType[];
  isAnswered: boolean;
  hasReliableSource: boolean;
  isMock: boolean;
  aiUsageRecordId?: string | null;
  feedbackStatus: AftersalesFeedbackStatus;
  createdAt: string;
  updatedAt: string;
};

export type AskAftersalesQuestionPayload = {
  question: string;
};

export type AskAftersalesQuestionResult = {
  recordId: string;
  answer: string;
  answerStatus: AftersalesAnswerStatus;
  isAnswered: boolean;
  hasReliableSource: boolean;
  citedSources: AftersalesCitedSource[];
  usedMaterialTypes: KnowledgeMaterialType[];
  isMock: boolean;
  aiUsage?: {
    provider: string;
    model: string;
    isMock: boolean;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requestCount: number;
  };
};

export type AftersalesConversation = {
  id: string;
  companyId: string;
  userId: string;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  title: string;
  status: AftersalesConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
};

export type AftersalesConversationListQuery = {
  keyword?: string;
  mineOnly?: boolean;
  status?: AftersalesConversationStatus | "all";
  scope?: "mine" | "all";
  page?: number;
  pageSize?: number;
};

export type AftersalesConversationListResponse = {
  items: AftersalesConversation[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type AftersalesConversationDetail = {
  conversation: AftersalesConversation;
  records: AftersalesQuestionRecord[];
};

export type AskAftersalesConversationResult = AskAftersalesQuestionResult & {
  conversationId: string;
  question: string;
  createdAt: string;
  sequence?: number | null;
};

export type AftersalesQuestionRecordQuery = {
  answerStatus?: AftersalesAnswerStatus;
  hasReliableSource?: boolean;
  startDate?: string;
  endDate?: string;
  userId?: string;
  departmentId?: string;
  page?: number;
  pageSize?: number;
};

export type AftersalesQuestionRecordListResponse = {
  items: AftersalesQuestionRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type SubmitAftersalesFeedbackPayload = {
  errorType: AftersalesFeedbackErrorType;
  correctionText: string;
  description?: string;
};

export type SubmitAftersalesFeedbackResult = {
  feedbackId: string;
  status: AftersalesFeedbackStatus;
  recordId: string;
  feedbackStatus: AftersalesFeedbackStatus;
};

export type AftersalesFeedbackQuery = {
  status?: Exclude<AftersalesFeedbackStatus, "none">;
  errorType?: AftersalesFeedbackErrorType;
  startDate?: string;
  endDate?: string;
  userId?: string;
  departmentId?: string;
  page?: number;
  pageSize?: number;
};

export type AftersalesFeedbackListItem = {
  feedbackId: string;
  status: Exclude<AftersalesFeedbackStatus, "none">;
  errorType: AftersalesFeedbackErrorType;
  correctionTextPreview: string;
  descriptionPreview?: string | null;
  questionPreview: string;
  answerPreview: string;
  conversationId?: string | null;
  conversationTitle?: string | null;
  questionRecordId: string;
  userId: string;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  handledAt?: string | null;
  citedSourcesSummary?: {
    count: number;
    chunkIds: string[];
    fileIds: string[];
  };
  createdAt: string;
  updatedAt: string;
};

export type AftersalesFeedbackListResponse = {
  items: AftersalesFeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AftersalesFeedbackDetail = AftersalesFeedbackListItem & {
  correctionText: string;
  description?: string | null;
  question: string;
  answer: string;
  citedSources: AftersalesCitedSource[];
  handleNote?: string | null;
  handledById?: string | null;
  handledByName?: string | null;
  convertedKnowledgeDraft?: {
    id: string;
    knowledgeBaseId: string;
    title: string;
    materialType: KnowledgeMaterialType;
    materialTopic?: string;
    sourceDescription?: string;
    trustLevel: KnowledgeTrustLevel;
    reviewStatus: KnowledgeReviewStatus;
    createdAt: string;
  } | null;
};

export type ConvertFeedbackKnowledgeDraftPayload = {
  knowledgeBaseId: string;
  title: string;
  materialType?: KnowledgeMaterialType;
  materialTopic?: string;
  content: string;
  sourceDescription?: string;
  applicableModules?: KnowledgeApplicableModule[];
  allowedDepartmentIds?: string[];
};

export type ConvertFeedbackKnowledgeDraftResult = {
  feedbackId: string;
  knowledgeFile: KnowledgeFile;
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

export const askAftersalesQuestion = (payload: AskAftersalesQuestionPayload) =>
  apiRequest<AskAftersalesQuestionResult>("/api/aftersales-qa/ask", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getAftersalesConversations = (
  query: AftersalesConversationListQuery = {}
) =>
  apiGet<AftersalesConversationListResponse>(
    `/api/aftersales-qa/conversations${toQueryString({
      keyword: query.keyword,
      mineOnly: query.mineOnly,
      status: query.status,
      scope: query.scope,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );

export const createAftersalesConversation = (payload: { title?: string } = {}) =>
  apiRequest<AftersalesConversation>("/api/aftersales-qa/conversations", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getAftersalesConversation = (id: string) =>
  apiGet<AftersalesConversationDetail>(`/api/aftersales-qa/conversations/${id}`);

export const updateAftersalesConversation = (id: string, payload: { title: string }) =>
  apiRequest<AftersalesConversation>(`/api/aftersales-qa/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const updateAftersalesConversationStatus = (
  id: string,
  payload: { status: AftersalesConversationStatus }
) =>
  apiRequest<AftersalesConversation>(`/api/aftersales-qa/conversations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const askAftersalesConversation = (id: string, payload: AskAftersalesQuestionPayload) =>
  apiRequest<AskAftersalesConversationResult>(`/api/aftersales-qa/conversations/${id}/ask`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getAftersalesQuestionRecords = (
  query: AftersalesQuestionRecordQuery = {}
) =>
  apiGet<AftersalesQuestionRecordListResponse>(
    `/api/aftersales-qa/records${toQueryString({
      answerStatus: query.answerStatus,
      hasReliableSource: query.hasReliableSource,
      startDate: query.startDate,
      endDate: query.endDate,
      userId: query.userId,
      departmentId: query.departmentId,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );

export const getAftersalesQuestionRecord = (id: string) =>
  apiGet<AftersalesQuestionRecord>(`/api/aftersales-qa/records/${id}`);

export const submitAftersalesFeedback = (
  recordId: string,
  payload: SubmitAftersalesFeedbackPayload
) =>
  apiRequest<SubmitAftersalesFeedbackResult>(`/api/aftersales-qa/records/${recordId}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getAftersalesFeedbacks = (query: AftersalesFeedbackQuery = {}) =>
  apiGet<AftersalesFeedbackListResponse>(
    `/api/aftersales-qa/feedbacks${toQueryString({
      status: query.status,
      errorType: query.errorType,
      startDate: query.startDate,
      endDate: query.endDate,
      userId: query.userId,
      departmentId: query.departmentId,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );

export const getAftersalesFeedback = (id: string) =>
  apiGet<AftersalesFeedbackDetail>(`/api/aftersales-qa/feedbacks/${id}`);

export const convertFeedbackToKnowledgeDraft = (
  id: string,
  payload: ConvertFeedbackKnowledgeDraftPayload
) =>
  apiRequest<ConvertFeedbackKnowledgeDraftResult>(
    `/api/aftersales-qa/feedbacks/${id}/convert-to-knowledge-draft`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

export const updateAftersalesFeedbackStatus = (
  id: string,
  payload: {
    status: Exclude<AftersalesFeedbackStatus, "none">;
    handleNote?: string;
  }
) =>
  apiRequest<SubmitAftersalesFeedbackResult>(`/api/aftersales-qa/feedbacks/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
