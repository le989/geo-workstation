import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import type { OperationLog, Prisma } from "@prisma/client";
import { getCurrentCompanyId, getEffectiveRole, type ResourceAccessContext } from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";
import type { QueryOperationLogsDto } from "./dto/query-operation-logs.dto";
import { sanitizeErrorMessage, sanitizeMetadata } from "./usage-sanitizer";

export type RecordOperationInput = {
  companyId?: string | null;
  userId?: string | null;
  departmentId?: string | null;
  moduleKey: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetTitle?: string | null;
  success?: boolean;
  errorMessage?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  createdAt?: Date;
};

export type OperationLogResponse = {
  id: string;
  companyId: string | null;
  userId: string | null;
  userName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  moduleKey: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetTitle: string | null;
  success: boolean;
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Prisma.JsonValue;
  createdAt: Date;
};

export type OperationLogListResponse = {
  items: OperationLogResponse[];
  total: number;
  page: number;
  pageSize: number;
};

type OperationLogWithRelations = OperationLog & {
  user?: { name: string } | null;
  department?: { name: string } | null;
};

@Injectable()
export class OperationLogsService {
  private readonly logger = new Logger(OperationLogsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async recordOperation(
    input: RecordOperationInput,
    context?: ResourceAccessContext
  ): Promise<void> {
    try {
      await this.prisma.operationLog.create({
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
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          targetTitle: input.targetTitle ?? null,
          success: input.success ?? true,
          errorMessage: sanitizeErrorMessage(input.errorMessage) ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          metadata: sanitizeMetadata(input.metadata),
          ...(input.createdAt ? { createdAt: input.createdAt } : {})
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to record operation log: ${sanitizeErrorMessage(error) ?? "unknown"}`);
    }
  }

  async queryLogs(
    query: QueryOperationLogsDto,
    context: ResourceAccessContext
  ): Promise<OperationLogListResponse> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const where = this.buildWhere(query, context);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.operationLog.count({ where }),
      this.prisma.operationLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true
            }
          },
          department: {
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
      items: items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize
    };
  }

  private buildWhere(
    query: QueryOperationLogsDto,
    context: ResourceAccessContext
  ): Prisma.OperationLogWhereInput {
    this.assertCanQuery(context);
    const where: Prisma.OperationLogWhereInput = {};

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
      throw new ForbiddenException("当前角色无权查看操作日志");
    }
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

  private toResponse(log: OperationLogWithRelations): OperationLogResponse {
    return {
      id: log.id,
      companyId: log.companyId,
      userId: log.userId,
      userName: log.user?.name ?? null,
      departmentId: log.departmentId,
      departmentName: log.department?.name ?? null,
      moduleKey: log.moduleKey,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      targetTitle: log.targetTitle,
      success: log.success,
      errorMessage: log.errorMessage ?? undefined,
      ip: log.ip ?? undefined,
      userAgent: log.userAgent ?? undefined,
      metadata: log.metadata ?? undefined,
      createdAt: log.createdAt
    };
  }
}
