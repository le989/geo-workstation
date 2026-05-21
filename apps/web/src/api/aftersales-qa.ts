import { apiGet, apiRequest } from "./http";
import type { KnowledgeMaterialType } from "./knowledge";

export type AftersalesAnswerStatus =
  | "answered"
  | "no_reliable_source"
  | "needs_clarification"
  | "failed";
export type AftersalesConversationStatus = "active" | "archived";

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
  feedbackStatus: string;
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
