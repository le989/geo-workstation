import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import type { AiUsageRecord, Prisma } from "@prisma/client";
import { getCurrentCompanyId, getEffectiveRole, type ResourceAccessContext } from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";
import { sanitizeErrorMessage, sanitizeMetadata } from "./usage-sanitizer";
import type { QueryUsageDto, QueryUsageListDto, QueryUsageTrendDto } from "./dto/query-usage.dto";

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

type AiUsageRecordWithUser = AiUsageRecord & {
  user?: { name: string } | null;
};

type AiUsageRecordWithDepartment = AiUsageRecord & {
  department?: { name: string } | null;
};

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async recordUsage(input: RecordAiUsageInput, context?: ResourceAccessContext): Promise<void> {
    try {
      const isMock = input.isMock ?? (input.provider === "mock" || input.provider === "stub");
      const promptTokens = isMock ? 0 : this.toNonNegativeInt(input.promptTokens);
      const completionTokens = isMock ? 0 : this.toNonNegativeInt(input.completionTokens);
      const totalTokens = isMock
        ? 0
        : this.toNonNegativeInt(input.totalTokens ?? promptTokens + completionTokens);

      await this.prisma.aiUsageRecord.create({
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
          metadata: sanitizeMetadata(input.metadata),
          ...(input.createdAt ? { createdAt: input.createdAt } : {})
        }
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record AI usage: ${error instanceof Error ? error.message : String(error)}`
      );
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

  private toNonNegativeInt(value: number | null | undefined): number {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) {
      return 0;
    }

    return Math.max(Math.trunc(Number(value)), 0);
  }
}
