import { apiGet } from "./http";

export type LogsViewerPagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type LogsViewerMetadataSummaryValue =
  | string
  | number
  | boolean
  | null
  | { itemCount: number }
  | { keyCount: number; keys: string[] };

export type LogsViewerMetadataSummary = Record<string, LogsViewerMetadataSummaryValue>;

export type LogsViewerOperationLogQuery = {
  page?: number;
  pageSize?: number;
  moduleKey?: string;
  action?: string;
  success?: boolean;
  userId?: string;
  startDate?: string;
  endDate?: string;
};

export type LogsViewerAiUsageRecordQuery = {
  page?: number;
  pageSize?: number;
  moduleKey?: string;
  action?: string;
  provider?: string;
  isMock?: boolean;
  success?: boolean;
  userId?: string;
  startDate?: string;
  endDate?: string;
};

export type LogsViewerAiCallLogQuery = {
  page?: number;
  pageSize?: number;
  provider?: string;
  purpose?: string;
  status?: string;
  relatedType?: string;
  createdById?: string;
  startDate?: string;
  endDate?: string;
};

export type LogsViewerOperationLogItem = {
  id: string;
  createdAt: string;
  companyId: string | null;
  userId: string | null;
  userName: string | null;
  departmentId: string | null;
  moduleKey: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetTitle: string | null;
  success: boolean;
  errorSummary: string | null;
  hasIp: boolean;
  hasUserAgent: boolean;
  metadataKeys: string[];
};

export type LogsViewerOperationLogDetail = LogsViewerOperationLogItem & {
  metadataSummary: LogsViewerMetadataSummary;
};

export type LogsViewerAiUsageRecordItem = {
  id: string;
  createdAt: string;
  companyId: string | null;
  userId: string | null;
  userName: string | null;
  departmentId: string | null;
  moduleKey: string;
  action: string;
  provider: string;
  model: string | null;
  isMock: boolean;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  success: boolean;
  errorSummary: string | null;
  metadataSummary: LogsViewerMetadataSummary;
};

export type LogsViewerAiUsageRecordDetail = LogsViewerAiUsageRecordItem;

export type LogsViewerAiCallLogItem = {
  id: string;
  createdAt: string;
  companyId: string | null;
  createdById: string | null;
  createdByName: string | null;
  provider: string;
  model: string;
  purpose: string;
  relatedType: string | null;
  relatedId: string | null;
  tokenInput: number | null;
  tokenOutput: number | null;
  status: string;
  isMockInferred: boolean;
  requestCountLabel: string;
};

export type LogsViewerAiCallLogDetail = LogsViewerAiCallLogItem;

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

export const getLogsViewerOperationLogs = (query: LogsViewerOperationLogQuery = {}) =>
  apiGet<LogsViewerPagedResponse<LogsViewerOperationLogItem>>(
    `/api/logs-viewer/operation-logs${toQueryString(query)}`
  );

export const getLogsViewerOperationLogDetail = (id: string) =>
  apiGet<LogsViewerOperationLogDetail>(`/api/logs-viewer/operation-logs/${id}`);

export const getLogsViewerAiUsageRecords = (query: LogsViewerAiUsageRecordQuery = {}) =>
  apiGet<LogsViewerPagedResponse<LogsViewerAiUsageRecordItem>>(
    `/api/logs-viewer/ai-usage-records${toQueryString(query)}`
  );

export const getLogsViewerAiUsageRecordDetail = (id: string) =>
  apiGet<LogsViewerAiUsageRecordDetail>(`/api/logs-viewer/ai-usage-records/${id}`);

export const getLogsViewerAiCallLogs = (query: LogsViewerAiCallLogQuery = {}) =>
  apiGet<LogsViewerPagedResponse<LogsViewerAiCallLogItem>>(
    `/api/logs-viewer/ai-call-logs${toQueryString(query)}`
  );

export const getLogsViewerAiCallLogDetail = (id: string) =>
  apiGet<LogsViewerAiCallLogDetail>(`/api/logs-viewer/ai-call-logs/${id}`);
