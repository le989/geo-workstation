import { apiGet } from "./http";

export type UsageQuery = {
  moduleKey?: string;
  action?: string;
  userId?: string;
  departmentId?: string;
  companyId?: string;
  isMock?: boolean;
  success?: boolean;
  startDate?: string;
  endDate?: string;
};

export type UsageTrendQuery = UsageQuery & {
  granularity?: "day" | "week" | "month";
};

export type UsageLedgerQuery = UsageQuery & {
  provider?: string;
  model?: string;
};

export type UsageLedgerRecordsQuery = UsageLedgerQuery & {
  page?: number;
  pageSize?: number;
};

export type UsageSummary = {
  totalRequests: number;
  totalTokens: number;
  mockRequests: number;
  realRequests: number;
  successCount: number;
  failureCount: number;
};

export type UsageBreakdownItem = UsageSummary & {
  key: string;
  moduleKey?: string;
  userId?: string | null;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
};

export type UsageBreakdownResponse = {
  items: UsageBreakdownItem[];
};

export type UsageTrendItem = UsageSummary & {
  period: string;
};

export type UsageTrendResponse = {
  items: UsageTrendItem[];
};

export type AiUsageTokenSummary = {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  tokenKnownCalls: number;
  tokenUnknownCalls: number;
  usageUnknownCount: number;
  knownPromptTokens: number;
  knownCompletionTokens: number;
  knownTotalTokens: number;
};

export type AiUsageCompanySummaryItem = AiUsageTokenSummary & {
  key: string;
  companyId: string | null;
  companyName: string | null;
};

export type AiUsageProviderSummaryItem = AiUsageTokenSummary & {
  key: string;
  provider: string;
  model: string | null;
};

export type AiUsageModuleSummaryItem = AiUsageTokenSummary & {
  key: string;
  moduleKey: string;
  action: string;
};

export type AiUsageUserSummaryItem = AiUsageTokenSummary & {
  key: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
};

export type AiUsageDepartmentSummaryItem = AiUsageTokenSummary & {
  key: string;
  departmentId: string | null;
  departmentName: string | null;
};

export type AiUsageSummary = {
  range: {
    startDate: string;
    endDate: string | null;
  };
  overview: AiUsageTokenSummary;
  byCompany: AiUsageCompanySummaryItem[];
  byProvider: AiUsageProviderSummaryItem[];
  byModule: AiUsageModuleSummaryItem[];
  byUser: AiUsageUserSummaryItem[];
  byDepartment: AiUsageDepartmentSummaryItem[];
};

export type UsageLedgerSummary = {
  totalRequestCount: number;
  realRequestCount: number;
  mockRequestCount: number;
  successRequestCount: number;
  failureRequestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  realPromptTokens: number;
  realCompletionTokens: number;
  realTotalTokens: number;
  mockPromptTokens: number;
  mockCompletionTokens: number;
  mockTotalTokens: number;
  usageUnknownCount: number;
  uniqueProviderCount: number;
  uniqueModelCount: number;
  uniqueUserCount: number;
  recordCount: number;
};

export type UsageByProviderItem = {
  provider: string;
  requestCount: number;
  realRequestCount: number;
  mockRequestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  realTotalTokens: number;
  mockTotalTokens: number;
  successRequestCount: number;
  failureRequestCount: number;
  usageUnknownCount: number;
  modelCount: number;
  recordCount: number;
};

export type UsageByProviderResponse = {
  items: UsageByProviderItem[];
};

export type UsageByModelItem = {
  provider: string;
  model: string | null;
  requestCount: number;
  realRequestCount: number;
  mockRequestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  realTotalTokens: number;
  mockTotalTokens: number;
  successRequestCount: number;
  failureRequestCount: number;
  usageUnknownCount: number;
  recordCount: number;
};

export type UsageByModelResponse = {
  items: UsageByModelItem[];
};

export type UsageLedgerRecordItem = {
  id: string;
  logId: string;
  createdAt: string;
  companyId: string | null;
  departmentId: string | null;
  userId: string | null;
  userName: string | null;
  moduleKey: string;
  action: string;
  provider: string;
  model: string | null;
  isMock: boolean;
  success: boolean;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  usageUnknown: boolean;
  errorSummary: string | null;
};

export type UsageLedgerRecordsResponse = {
  items: UsageLedgerRecordItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type OperationLogQuery = {
  moduleKey?: string;
  action?: string;
  userId?: string;
  departmentId?: string;
  companyId?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type OperationLog = {
  id: string;
  companyId?: string | null;
  userId?: string | null;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  moduleKey: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetTitle?: string | null;
  success: boolean;
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  metadata?: unknown;
  createdAt: string;
};

export type OperationLogListResponse = {
  items: OperationLog[];
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

const buildUsageQuery = (query: UsageQuery = {}) =>
  toQueryString({
    moduleKey: query.moduleKey,
    action: query.action,
    userId: query.userId,
    departmentId: query.departmentId,
    companyId: query.companyId,
    isMock: query.isMock,
    success: query.success,
    startDate: query.startDate,
    endDate: query.endDate
  });

const buildUsageLedgerQuery = (query: UsageLedgerQuery = {}) =>
  toQueryString({
    moduleKey: query.moduleKey,
    action: query.action,
    userId: query.userId,
    departmentId: query.departmentId,
    companyId: query.companyId,
    provider: query.provider,
    model: query.model,
    isMock: query.isMock,
    success: query.success,
    startDate: query.startDate,
    endDate: query.endDate
  });

export const getUsageSummary = (query: UsageQuery = {}) =>
  apiGet<UsageSummary>(`/api/usage/summary${buildUsageQuery(query)}`);

export const getUsageTrends = (query: UsageTrendQuery = {}) =>
  apiGet<UsageTrendResponse>(
    `/api/usage/trends${toQueryString({
      ...query,
      granularity: query.granularity
    })}`
  );

export const getUsageByUser = (query: UsageQuery = {}) =>
  apiGet<UsageBreakdownResponse>(`/api/usage/by-user${buildUsageQuery(query)}`);

export const getUsageByDepartment = (query: UsageQuery = {}) =>
  apiGet<UsageBreakdownResponse>(`/api/usage/by-department${buildUsageQuery(query)}`);

export const getUsageByModule = (query: UsageQuery = {}) =>
  apiGet<UsageBreakdownResponse>(`/api/usage/by-module${buildUsageQuery(query)}`);

export const getAiUsageSummary = (query: UsageQuery = {}) =>
  apiGet<AiUsageSummary>(`/api/usage/ai-summary${buildUsageQuery(query)}`);

export const getUsageLedgerSummary = (query: UsageLedgerQuery = {}) =>
  apiGet<UsageLedgerSummary>(`/api/usage/ledger-summary${buildUsageLedgerQuery(query)}`);

export const getUsageByProvider = (query: UsageLedgerQuery = {}) =>
  apiGet<UsageByProviderResponse>(`/api/usage/by-provider${buildUsageLedgerQuery(query)}`);

export const getUsageByModel = (query: UsageLedgerQuery = {}) =>
  apiGet<UsageByModelResponse>(`/api/usage/by-model${buildUsageLedgerQuery(query)}`);

export const getUsageLedgerRecords = (query: UsageLedgerRecordsQuery = {}) =>
  apiGet<UsageLedgerRecordsResponse>(
    `/api/usage/ledger-records${toQueryString({
      moduleKey: query.moduleKey,
      action: query.action,
      userId: query.userId,
      departmentId: query.departmentId,
      companyId: query.companyId,
      provider: query.provider,
      model: query.model,
      isMock: query.isMock,
      success: query.success,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );

export const getOperationLogs = (query: OperationLogQuery = {}) =>
  apiGet<OperationLogListResponse>(
    `/api/operation-logs${toQueryString({
      moduleKey: query.moduleKey,
      action: query.action,
      userId: query.userId,
      departmentId: query.departmentId,
      companyId: query.companyId,
      success: query.success,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );
