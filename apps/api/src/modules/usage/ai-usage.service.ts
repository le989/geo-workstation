import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import type { AiUsageRecord, Prisma } from "@prisma/client";
import { getCurrentCompanyId, getEffectiveRole, type ResourceAccessContext } from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";
import { sanitizeErrorMessage, sanitizeMetadata } from "./usage-sanitizer";
import type {
  QueryUsageDto,
  QueryUsageLedgerDto,
  QueryUsageLedgerRecordsDto,
  QueryUsageLedgerTrendDto,
  QueryUsageListDto,
  QueryUsageTrendDto
} from "./dto/query-usage.dto";

export type RecordAiUsageInput = {
  companyId?: string | null;
  userId?: string | null;
  departmentId?: string | null;
  moduleKey: string;
  action: string;
  provider: string;
  model?: string | null;
  isMock?: boolean;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  requestCount?: number | null;
  success?: boolean;
  errorMessage?: unknown;
  metadata?: unknown;
  latencyMs?: number | null;
  errorType?: string | null;
  providerReturnedUsage?: boolean | null;
  usageUnknown?: boolean | null;
  createdAt?: Date;
};

export type UsageSummaryResponse = {
  totalRequests: number;
  totalTokens: number;
  mockRequests: number;
  realRequests: number;
  successCount: number;
  failureCount: number;
};

export type UsageBreakdownItem = UsageSummaryResponse & {
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

export type UsageTrendResponse = {
  items: Array<UsageSummaryResponse & { period: string }>;
};

export type UsageRecordListResponse = {
  items: AiUsageRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type UsageLedgerSummaryResponse = {
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

export type UsageLedgerTrendItem = {
  date: string;
  requestCount: number;
  realRequestCount: number;
  mockRequestCount: number;
  totalTokens: number;
  realTotalTokens: number;
  mockTotalTokens: number;
  successRequestCount: number;
  failureRequestCount: number;
  usageUnknownCount: number;
  recordCount: number;
};

export type UsageLedgerTrendResponse = {
  items: UsageLedgerTrendItem[];
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
  createdAt: Date;
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

type AiUsageRecordWithUser = AiUsageRecord & {
  user?: { name: string } | null;
};

type AiUsageRecordWithDepartment = AiUsageRecord & {
  department?: { name: string } | null;
};

type AiUsageRecordForAiSummary = AiUsageRecord & {
  company?: { name: string } | null;
  user?: { name: string; email: string } | null;
  department?: { name: string } | null;
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

export type AiUsageSummaryResponse = {
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

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async recordUsage(
    input: RecordAiUsageInput,
    context?: ResourceAccessContext
  ): Promise<AiUsageRecord | null> {
    try {
      const isMock = input.isMock ?? (input.provider === "mock" || input.provider === "stub");
      const promptTokens = isMock ? 0 : this.toNonNegativeInt(input.promptTokens);
      const completionTokens = isMock ? 0 : this.toNonNegativeInt(input.completionTokens);
      const totalTokens = isMock
        ? 0
        : this.toNonNegativeInt(input.totalTokens ?? promptTokens + completionTokens);
      const metadata = this.buildUsageMetadata(input, isMock);

      return await this.prisma.aiUsageRecord.create({
        data: {
          companyId: input.companyId ?? context?.currentCompany.id ?? null,
          userId: input.userId ?? context?.user.id ?? null,
          departmentId:
            input.departmentId ??
            context?.currentMembership?.departmentId ??
            context?.currentCompany.department?.id ??
            null,
          moduleKey: input.moduleKey,
          action: input.action,
          provider: input.provider,
          model: input.model ?? null,
          isMock,
          promptTokens,
          completionTokens,
          totalTokens,
          requestCount: Math.max(this.toNonNegativeInt(input.requestCount ?? 1), 1),
          success: input.success ?? true,
          errorMessage: sanitizeErrorMessage(input.errorMessage) ?? null,
          metadata: sanitizeMetadata(metadata),
          ...(input.createdAt ? { createdAt: input.createdAt } : {})
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to record AI usage: ${sanitizeErrorMessage(error) ?? "unknown"}`);
      return null;
    }
  }

  async querySummary(
    query: QueryUsageDto,
    context: ResourceAccessContext
  ): Promise<UsageSummaryResponse> {
    const records = await this.findVisibleRecords(query, context);

    return this.summarize(records);
  }

  async queryByModule(
    query: QueryUsageDto,
    context: ResourceAccessContext
  ): Promise<UsageBreakdownResponse> {
    const records = await this.findVisibleRecords(query, context);

    return {
      items: this.groupRecords(records, (record) => record.moduleKey).map(([moduleKey, items]) => ({
        key: moduleKey,
        moduleKey,
        ...this.summarize(items)
      }))
    };
  }

  async queryByUser(
    query: QueryUsageDto,
    context: ResourceAccessContext
  ): Promise<UsageBreakdownResponse> {
    const records = (await this.findVisibleRecords(query, context, {
      user: true
    })) as AiUsageRecordWithUser[];

    return {
      items: this.groupRecords(records, (record) => record.userId ?? "system").map(([key, items]) => ({
        key,
        userId: items[0]?.userId ?? null,
        userName: items[0]?.user?.name ?? (items[0]?.userId ? null : "系统任务"),
        ...this.summarize(items)
      }))
    };
  }

  async queryByDepartment(
    query: QueryUsageDto,
    context: ResourceAccessContext
  ): Promise<UsageBreakdownResponse> {
    const records = (await this.findVisibleRecords(query, context, {
      department: true
    })) as AiUsageRecordWithDepartment[];

    return {
      items: this.groupRecords(records, (record) => record.departmentId ?? "unassigned").map(
        ([key, items]) => ({
          key,
          departmentId: items[0]?.departmentId ?? null,
          departmentName: items[0]?.department?.name ?? (items[0]?.departmentId ? null : "未绑定部门"),
          ...this.summarize(items)
        })
      )
    };
  }

  async queryTrend(
    query: QueryUsageTrendDto,
    context: ResourceAccessContext
  ): Promise<UsageTrendResponse> {
    const granularity = query.granularity ?? "day";
    const records = await this.findVisibleRecords(query, context);

    return {
      items: this.groupRecords(records, (record) => this.formatPeriod(record.createdAt, granularity)).map(
        ([period, items]) => ({
          period,
          ...this.summarize(items)
        })
      )
    };
  }

  async queryRecords(
    query: QueryUsageListDto,
    context: ResourceAccessContext
  ): Promise<UsageRecordListResponse> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const where = this.buildWhere(query, context);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.aiUsageRecord.count({ where }),
      this.prisma.aiUsageRecord.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async queryAiSummary(
    query: QueryUsageDto,
    context: ResourceAccessContext
  ): Promise<AiUsageSummaryResponse> {
    const range = this.resolveAiSummaryRange(query);
    const records = (await this.prisma.aiUsageRecord.findMany({
      where: this.buildWhere(
        {
          ...query,
          isMock: false,
          startDate: range.startDate,
          endDate: range.endDate ?? undefined
        },
        context
      ),
      include: {
        company: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        },
        department: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    })) as AiUsageRecordForAiSummary[];

    return {
      range,
      overview: this.summarizeAiUsage(records),
      byCompany: this.groupRecords(records, (record) => record.companyId ?? "unknown-company").map(
        ([key, items]) => ({
          key,
          companyId: items[0]?.companyId ?? null,
          companyName: items[0]?.company?.name ?? (items[0]?.companyId ? null : "未知公司"),
          ...this.summarizeAiUsage(items)
        })
      ),
      byProvider: this.groupRecords(
        records,
        (record) => `${record.provider}::${record.model ?? "unknown-model"}`
      ).map(([key, items]) => ({
        key,
        provider: items[0]?.provider ?? "unknown",
        model: items[0]?.model ?? null,
        ...this.summarizeAiUsage(items)
      })),
      byModule: this.groupRecords(
        records,
        (record) => `${record.moduleKey}::${record.action}`
      ).map(([key, items]) => ({
        key,
        moduleKey: items[0]?.moduleKey ?? "unknown",
        action: items[0]?.action ?? "unknown",
        ...this.summarizeAiUsage(items)
      })),
      byUser: this.groupRecords(records, (record) => record.userId ?? "system").map(
        ([key, items]) => ({
          key,
          userId: items[0]?.userId ?? null,
          userName: items[0]?.user?.name ?? (items[0]?.userId ? null : "系统任务"),
          userEmail: items[0]?.user?.email ?? null,
          ...this.summarizeAiUsage(items)
        })
      ),
      byDepartment: this.groupRecords(
        records,
        (record) => record.departmentId ?? "unassigned"
      ).map(([key, items]) => ({
        key,
        departmentId: items[0]?.departmentId ?? null,
        departmentName: items[0]?.department?.name ?? (items[0]?.departmentId ? null : "未绑定部门"),
        ...this.summarizeAiUsage(items)
      }))
    };
  }

  async queryLedgerSummary(
    query: QueryUsageLedgerDto,
    context: ResourceAccessContext
  ): Promise<UsageLedgerSummaryResponse> {
    const records = await this.findLedgerRecords(query, context);

    return this.summarizeLedgerUsage(records);
  }

  async queryLedgerTrends(
    query: QueryUsageLedgerTrendDto,
    context: ResourceAccessContext
  ): Promise<UsageLedgerTrendResponse> {
    const granularity = query.granularity ?? "day";
    const records = await this.findLedgerRecords(query, context);

    return {
      items: this.groupRecords(records, (record) => this.formatPeriod(record.createdAt, granularity)).map(
        ([date, items]) => {
          const summary = this.summarizeLedgerUsage(items);

          return {
            date,
            requestCount: summary.totalRequestCount,
            realRequestCount: summary.realRequestCount,
            mockRequestCount: summary.mockRequestCount,
            totalTokens: summary.totalTokens,
            realTotalTokens: summary.realTotalTokens,
            mockTotalTokens: summary.mockTotalTokens,
            successRequestCount: summary.successRequestCount,
            failureRequestCount: summary.failureRequestCount,
            usageUnknownCount: summary.usageUnknownCount,
            recordCount: summary.recordCount
          };
        }
      )
    };
  }

  async queryUsageByProvider(
    query: QueryUsageLedgerDto,
    context: ResourceAccessContext
  ): Promise<UsageByProviderResponse> {
    const records = await this.findLedgerRecords(query, context);

    return {
      items: this.groupRecords(records, (record) => record.provider).map(([provider, items]) => {
        const summary = this.summarizeLedgerUsage(items);

        return {
          provider,
          requestCount: summary.totalRequestCount,
          realRequestCount: summary.realRequestCount,
          mockRequestCount: summary.mockRequestCount,
          promptTokens: summary.promptTokens,
          completionTokens: summary.completionTokens,
          totalTokens: summary.totalTokens,
          realTotalTokens: summary.realTotalTokens,
          mockTotalTokens: summary.mockTotalTokens,
          successRequestCount: summary.successRequestCount,
          failureRequestCount: summary.failureRequestCount,
          usageUnknownCount: summary.usageUnknownCount,
          modelCount: this.countUnique(items, (record) => record.model),
          recordCount: summary.recordCount
        };
      })
    };
  }

  async queryUsageByModel(
    query: QueryUsageLedgerDto,
    context: ResourceAccessContext
  ): Promise<UsageByModelResponse> {
    const records = await this.findLedgerRecords(query, context);

    return {
      items: this.groupRecords(records, (record) => `${record.provider}::${record.model ?? ""}`).map(
        ([, items]) => {
          const summary = this.summarizeLedgerUsage(items);

          return {
            provider: items[0]?.provider ?? "unknown",
            model: items[0]?.model ?? null,
            requestCount: summary.totalRequestCount,
            realRequestCount: summary.realRequestCount,
            mockRequestCount: summary.mockRequestCount,
            promptTokens: summary.promptTokens,
            completionTokens: summary.completionTokens,
            totalTokens: summary.totalTokens,
            realTotalTokens: summary.realTotalTokens,
            mockTotalTokens: summary.mockTotalTokens,
            successRequestCount: summary.successRequestCount,
            failureRequestCount: summary.failureRequestCount,
            usageUnknownCount: summary.usageUnknownCount,
            recordCount: summary.recordCount
          };
        }
      )
    };
  }

  async queryLedgerRecords(
    query: QueryUsageLedgerRecordsDto,
    context: ResourceAccessContext
  ): Promise<UsageLedgerRecordsResponse> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const where = this.buildLedgerWhere(query, context);
    const [total, records] = await this.prisma.$transaction([
      this.prisma.aiUsageRecord.count({ where }),
      this.prisma.aiUsageRecord.findMany({
        where,
        include: {
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: (records as AiUsageRecordWithUser[]).map((record) =>
        this.toUsageLedgerRecordItem(record)
      ),
      total,
      page,
      pageSize
    };
  }

  private async findVisibleRecords(
    query: QueryUsageDto,
    context: ResourceAccessContext,
    include?: Prisma.AiUsageRecordInclude
  ) {
    return this.prisma.aiUsageRecord.findMany({
      where: this.buildWhere(query, context),
      include,
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  private async findLedgerRecords(
    query: QueryUsageLedgerDto,
    context: ResourceAccessContext
  ): Promise<AiUsageRecord[]> {
    return this.prisma.aiUsageRecord.findMany({
      where: this.buildLedgerWhere(query, context),
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  private buildLedgerWhere(
    query: QueryUsageLedgerDto,
    context: ResourceAccessContext
  ): Prisma.AiUsageRecordWhereInput {
    const where = this.buildWhere(query, context);

    if (query.provider) {
      where.provider = query.provider;
    }
    if (query.model) {
      where.model = query.model;
    }

    return where;
  }

  private buildWhere(
    query: QueryUsageDto,
    context: ResourceAccessContext
  ): Prisma.AiUsageRecordWhereInput {
    this.assertCanQuery(context);
    const where: Prisma.AiUsageRecordWhereInput = {};

    if (getEffectiveRole(context) === "company_admin") {
      where.companyId = getCurrentCompanyId(context);
    } else if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.moduleKey) {
      where.moduleKey = query.moduleKey;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }
    if (query.isMock !== undefined) {
      where.isMock = query.isMock;
    }
    if (query.success !== undefined) {
      where.success = query.success;
    }

    const createdAt = this.buildDateRange(query.startDate, query.endDate);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private summarizeLedgerUsage(records: AiUsageRecord[]): UsageLedgerSummaryResponse {
    const providerKeys = new Set<string>();
    const modelKeys = new Set<string>();
    const userKeys = new Set<string>();

    const summary = records.reduce<UsageLedgerSummaryResponse>(
      (ledgerSummary, record) => {
        ledgerSummary.recordCount += 1;
        ledgerSummary.totalRequestCount += record.requestCount;
        ledgerSummary.promptTokens += record.promptTokens;
        ledgerSummary.completionTokens += record.completionTokens;
        ledgerSummary.totalTokens += record.totalTokens;

        if (record.provider) {
          providerKeys.add(record.provider);
        }
        if (record.model) {
          modelKeys.add(record.model);
        }
        if (record.userId) {
          userKeys.add(record.userId);
        }

        if (record.isMock) {
          ledgerSummary.mockRequestCount += record.requestCount;
          ledgerSummary.mockPromptTokens += record.promptTokens;
          ledgerSummary.mockCompletionTokens += record.completionTokens;
          ledgerSummary.mockTotalTokens += record.totalTokens;
        } else {
          ledgerSummary.realRequestCount += record.requestCount;
          ledgerSummary.realPromptTokens += record.promptTokens;
          ledgerSummary.realCompletionTokens += record.completionTokens;
          ledgerSummary.realTotalTokens += record.totalTokens;
        }

        if (record.success) {
          ledgerSummary.successRequestCount += record.requestCount;
        } else {
          ledgerSummary.failureRequestCount += record.requestCount;
        }

        // 用量未知只按记录数标记，不根据模型或 Provider 反推 Token。
        if (this.isLedgerUsageUnknown(record)) {
          ledgerSummary.usageUnknownCount += 1;
        }

        return ledgerSummary;
      },
      {
        totalRequestCount: 0,
        realRequestCount: 0,
        mockRequestCount: 0,
        successRequestCount: 0,
        failureRequestCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        realPromptTokens: 0,
        realCompletionTokens: 0,
        realTotalTokens: 0,
        mockPromptTokens: 0,
        mockCompletionTokens: 0,
        mockTotalTokens: 0,
        usageUnknownCount: 0,
        uniqueProviderCount: 0,
        uniqueModelCount: 0,
        uniqueUserCount: 0,
        recordCount: 0
      }
    );

    summary.uniqueProviderCount = providerKeys.size;
    summary.uniqueModelCount = modelKeys.size;
    summary.uniqueUserCount = userKeys.size;

    return summary;
  }

  private toUsageLedgerRecordItem(record: AiUsageRecordWithUser): UsageLedgerRecordItem {
    return {
      id: record.id,
      logId: record.id,
      createdAt: record.createdAt,
      companyId: record.companyId,
      departmentId: record.departmentId,
      userId: record.userId,
      userName: record.user?.name ?? (record.userId ? null : "系统任务"),
      moduleKey: record.moduleKey,
      action: record.action,
      provider: record.provider,
      model: record.model,
      isMock: record.isMock,
      success: record.success,
      requestCount: record.requestCount,
      promptTokens: record.promptTokens,
      completionTokens: record.completionTokens,
      totalTokens: record.totalTokens,
      usageUnknown: this.isLedgerUsageUnknown(record),
      errorSummary: this.toErrorSummary(record.errorMessage)
    };
  }

  private assertCanQuery(context: ResourceAccessContext): void {
    const role = getEffectiveRole(context);

    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("当前角色无权查看 AI 使用统计");
    }
  }

  private summarize(records: Pick<AiUsageRecord, "requestCount" | "totalTokens" | "isMock" | "success">[]): UsageSummaryResponse {
    return records.reduce<UsageSummaryResponse>(
      (summary, record) => {
        summary.totalRequests += record.requestCount;
        summary.totalTokens += record.totalTokens;
        if (record.isMock) {
          summary.mockRequests += record.requestCount;
        } else {
          summary.realRequests += record.requestCount;
        }
        if (record.success) {
          summary.successCount += record.requestCount;
        } else {
          summary.failureCount += record.requestCount;
        }
        return summary;
      },
      {
        totalRequests: 0,
        totalTokens: 0,
        mockRequests: 0,
        realRequests: 0,
        successCount: 0,
        failureCount: 0
      }
    );
  }

  private summarizeAiUsage(records: AiUsageRecord[]): AiUsageTokenSummary {
    const summary = records.reduce<AiUsageTokenSummary>(
      (result, record) => {
        const requestCount = record.requestCount;
        const usageUnknown = this.isUsageUnknown(record);

        result.totalCalls += requestCount;
        if (record.success) {
          result.successCount += requestCount;
        } else {
          result.failureCount += requestCount;
        }

        if (usageUnknown) {
          result.tokenUnknownCalls += requestCount;
          result.usageUnknownCount += requestCount;
        } else {
          result.tokenKnownCalls += requestCount;
          result.knownPromptTokens += record.promptTokens;
          result.knownCompletionTokens += record.completionTokens;
          result.knownTotalTokens += record.totalTokens;
        }

        return result;
      },
      {
        totalCalls: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        tokenKnownCalls: 0,
        tokenUnknownCalls: 0,
        usageUnknownCount: 0,
        knownPromptTokens: 0,
        knownCompletionTokens: 0,
        knownTotalTokens: 0
      }
    );

    summary.successRate = summary.totalCalls > 0 ? summary.successCount / summary.totalCalls : 0;

    return summary;
  }

  private isUsageUnknown(record: AiUsageRecord): boolean {
    const metadata = this.getMetadataObject(record.metadata);

    if (metadata.usageUnknown === true || metadata.providerReturnedUsage === false) {
      return true;
    }
    if (metadata.usageUnknown === false || metadata.providerReturnedUsage === true) {
      return false;
    }

    return record.promptTokens + record.completionTokens + record.totalTokens === 0;
  }

  private isLedgerUsageUnknown(record: AiUsageRecord): boolean {
    if (record.isMock) {
      return false;
    }

    const metadata = this.getMetadataObject(record.metadata);

    if (metadata.usageUnknown === true || metadata.providerReturnedUsage === false) {
      return true;
    }
    if (metadata.usageUnknown === false || metadata.providerReturnedUsage === true) {
      return false;
    }

    return record.promptTokens + record.completionTokens + record.totalTokens === 0;
  }

  private resolveAiSummaryRange(query: QueryUsageDto): { startDate: string; endDate: string | null } {
    if (query.startDate || query.endDate) {
      return {
        startDate: query.startDate ?? this.toDateString(this.daysAgo(30)),
        endDate: query.endDate ?? null
      };
    }

    return {
      startDate: this.toDateString(this.daysAgo(30)),
      endDate: null
    };
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  private groupRecords<T extends AiUsageRecord>(
    records: T[],
    getKey: (record: T) => string
  ): Array<[string, T[]]> {
    const grouped = new Map<string, T[]>();

    for (const record of records) {
      const key = getKey(record);
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }

    return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  }

  private countUnique<T extends AiUsageRecord>(
    records: T[],
    getValue: (record: T) => string | null
  ): number {
    const values = new Set<string>();

    for (const record of records) {
      const value = getValue(record);
      if (value) {
        values.add(value);
      }
    }

    return values.size;
  }

  private getMetadataObject(metadata: Prisma.JsonValue | null): Record<string, unknown> {
    return metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  }

  private toErrorSummary(errorMessage: string | null): string | null {
    const sanitized = sanitizeErrorMessage(errorMessage);

    if (!sanitized) {
      return null;
    }

    // 账本页只展示排查摘要，敏感头和密钥字段名也不向前端透出。
    const ledgerSafeSummary = sanitized
      .replace(/Authorization(?:\s*[:=]\s*\S+)?/gi, "[secret_redacted]")
      .replace(/API\s*key(?:\s+\[[^\]]+\]|\s*[:=]\s*\S+)?/gi, "[secret_redacted]")
      .replace(/Bearer\s+\S+/gi, "[secret_redacted]");

    return ledgerSafeSummary.length > 160
      ? `${ledgerSafeSummary.slice(0, 157)}...`
      : ledgerSafeSummary;
  }

  private buildDateRange(
    startDate?: string,
    endDate?: string
  ): Prisma.DateTimeFilter | undefined {
    const range: Prisma.DateTimeFilter = {};
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if (start && !Number.isNaN(start.getTime())) {
      range.gte = start;
    }
    if (end && !Number.isNaN(end.getTime())) {
      range.lte = end;
    }

    return Object.keys(range).length ? range : undefined;
  }

  private formatPeriod(date: Date, granularity: "day" | "week" | "month"): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");

    if (granularity === "month") {
      return `${year}-${month}`;
    }

    if (granularity === "week") {
      const week = this.getUtcWeek(date);
      return `${year}-W${String(week).padStart(2, "0")}`;
    }

    return `${year}-${month}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  private getUtcWeek(date: Date): number {
    const firstDay = Date.UTC(date.getUTCFullYear(), 0, 1);
    const currentDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.ceil(((currentDay - firstDay) / 86400000 + 1) / 7);
  }

  private buildUsageMetadata(
    input: RecordAiUsageInput,
    isMock: boolean
  ): Record<string, unknown> | undefined {
    const base: Record<string, unknown> =
      input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? { ...(input.metadata as Record<string, unknown>) }
        : input.metadata === undefined
          ? {}
          : { details: input.metadata };

    if (input.latencyMs !== undefined && input.latencyMs !== null) {
      base.latencyMs = this.toNonNegativeInt(input.latencyMs);
    }
    if (input.errorType) {
      base.errorType = input.errorType;
    }

    if (!isMock) {
      const hasUsageInput =
        input.promptTokens !== undefined ||
        input.completionTokens !== undefined ||
        input.totalTokens !== undefined;
      const providerReturnedUsage = input.providerReturnedUsage ?? hasUsageInput;
      const usageUnknown = input.usageUnknown ?? !providerReturnedUsage;

      base.providerReturnedUsage = providerReturnedUsage;
      base.usageUnknown = usageUnknown;
    }

    return Object.keys(base).length > 0 ? base : undefined;
  }

  private toNonNegativeInt(value: number | null | undefined): number {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) {
      return 0;
    }

    return Math.max(Math.trunc(Number(value)), 0);
  }
}
