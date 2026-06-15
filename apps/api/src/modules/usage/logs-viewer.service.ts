import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AiCallLog, AiUsageRecord, OperationLog, Prisma } from "@prisma/client";

import {
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";
import {
  QueryLogsViewerAiCallLogsDto,
  QueryLogsViewerAiUsageRecordsDto,
  QueryLogsViewerOperationLogsDto
} from "./dto/query-logs-viewer.dto";
import { sanitizeErrorPreview } from "./usage-sanitizer";

const ERROR_SUMMARY_LENGTH = 160;
const REQUEST_COUNT_LABEL = "一条调用流水=1";
const MOCK_PROVIDERS = new Set(["mock", "stub"]);
const SENSITIVE_TEXT_LABEL_PATTERN = /\b(?:authorization|api[_ -]?key|cookie|password)\b/gi;

const HIDDEN_METADATA_KEYS = new Set([
  "password",
  "passwordhash",
  "jwt",
  "jwtsecret",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secret",
  "authorization",
  "cookie",
  "databaseurl",
  "storagepath",
  "absolutepath",
  "localpath",
  "prompt",
  "systemprompt",
  "userprompt",
  "prompttext",
  "rawanswer",
  "rawresponse",
  "airesponse",
  "response",
  "responsebody",
  "body",
  "content",
  "rawcontent",
  "originaltext",
  "requestbody",
  "headers",
  "requestheaders",
  "providerpayload"
]);

const OPERATION_METADATA_SUMMARY_KEYS = new Set([
  "safeCount",
  "changedFields",
  "fieldCount",
  "wordCountRange",
  "candidateCount",
  "riskCount",
  "evidenceCount",
  "qualityGrade",
  "score",
  "fixedCount",
  "warningCount",
  "status",
  "publishStatus",
  "requestCount",
  "successCount",
  "failedCount",
  "usageUnknown",
  "providerReturnedUsage",
  "latencyMs",
  "errorType"
]);

const AI_USAGE_METADATA_SUMMARY_KEYS = new Set([
  "usageUnknown",
  "providerReturnedUsage",
  "latencyMs",
  "errorType"
]);

type JsonSummaryValue =
  | string
  | number
  | boolean
  | null
  | { itemCount: number }
  | { keyCount: number; keys: string[] };

type MetadataSummary = Record<string, JsonSummaryValue>;

type PageQuery = {
  page?: number;
  pageSize?: number;
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type OperationLogWithRelations = OperationLog & {
  user?: { name: string } | null;
};

type AiUsageRecordWithRelations = AiUsageRecord & {
  user?: { name: string } | null;
};

type AiCallLogWithRelations = AiCallLog & {
  createdBy?: { name: string } | null;
};

export type LogsViewerOperationLogItem = {
  id: string;
  createdAt: Date;
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
  metadataSummary: MetadataSummary;
};

export type LogsViewerAiUsageRecordItem = {
  id: string;
  createdAt: Date;
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
  metadataSummary: MetadataSummary;
};

export type LogsViewerAiCallLogItem = {
  id: string;
  createdAt: Date;
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
  status: AiCallLog["status"];
  isMockInferred: boolean;
  requestCountLabel: string;
};

@Injectable()
export class LogsViewerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async queryOperationLogs(
    query: QueryLogsViewerOperationLogsDto,
    context: ResourceAccessContext
  ): Promise<PagedResponse<LogsViewerOperationLogItem>> {
    const { page, pageSize } = this.resolvePagination(query);
    const where = this.buildOperationLogWhere(query, context);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.operationLog.count({ where }),
      this.prisma.operationLog.findMany({
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
      items: items.map((item) => this.toOperationLogListItem(item)),
      total,
      page,
      pageSize
    };
  }

  async getOperationLogDetail(
    id: string,
    context: ResourceAccessContext
  ): Promise<LogsViewerOperationLogDetail> {
    this.assertCanQuery(context);
    const log = await this.prisma.operationLog.findFirst({
      where: this.withCompanyScope<Prisma.OperationLogWhereInput>({ id }, context),
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!log) {
      throw new NotFoundException("操作审计日志不存在或无权查看");
    }

    return this.toOperationLogDetail(log);
  }

  async queryAiUsageRecords(
    query: QueryLogsViewerAiUsageRecordsDto,
    context: ResourceAccessContext
  ): Promise<PagedResponse<LogsViewerAiUsageRecordItem>> {
    const { page, pageSize } = this.resolvePagination(query);
    const where = this.buildAiUsageRecordWhere(query, context);
    const [total, items] = await this.prisma.$transaction([
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
      items: items.map((item) => this.toAiUsageRecordItem(item)),
      total,
      page,
      pageSize
    };
  }

  async getAiUsageRecordDetail(
    id: string,
    context: ResourceAccessContext
  ): Promise<LogsViewerAiUsageRecordItem> {
    this.assertCanQuery(context);
    const record = await this.prisma.aiUsageRecord.findFirst({
      where: this.withCompanyScope<Prisma.AiUsageRecordWhereInput>({ id }, context),
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!record) {
      throw new NotFoundException("AI 业务消耗记录不存在或无权查看");
    }

    return this.toAiUsageRecordItem(record);
  }

  async queryAiCallLogs(
    query: QueryLogsViewerAiCallLogsDto,
    context: ResourceAccessContext
  ): Promise<PagedResponse<LogsViewerAiCallLogItem>> {
    const { page, pageSize } = this.resolvePagination(query);
    const where = this.buildAiCallLogWhere(query, context);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.aiCallLog.count({ where }),
      this.prisma.aiCallLog.findMany({
        where,
        include: {
          createdBy: {
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
      items: items.map((item) => this.toAiCallLogItem(item)),
      total,
      page,
      pageSize
    };
  }

  async getAiCallLogDetail(
    id: string,
    context: ResourceAccessContext
  ): Promise<LogsViewerAiCallLogItem> {
    this.assertCanQuery(context);
    const log = await this.prisma.aiCallLog.findFirst({
      where: this.withCompanyScope<Prisma.AiCallLogWhereInput>({ id }, context),
      include: {
        createdBy: {
          select: {
            name: true
          }
        }
      }
    });

    if (!log) {
      throw new NotFoundException("AI 接口调用日志不存在或无权查看");
    }

    return this.toAiCallLogItem(log);
  }

  private buildOperationLogWhere(
    query: QueryLogsViewerOperationLogsDto,
    context: ResourceAccessContext
  ): Prisma.OperationLogWhereInput {
    this.assertCanQuery(context);
    const where = this.withCompanyScope<Prisma.OperationLogWhereInput>({}, context);

    if (query.moduleKey) {
      where.moduleKey = query.moduleKey;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.success !== undefined) {
      where.success = query.success;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    const createdAt = this.buildDateRange(query.startDate, query.endDate);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private buildAiUsageRecordWhere(
    query: QueryLogsViewerAiUsageRecordsDto,
    context: ResourceAccessContext
  ): Prisma.AiUsageRecordWhereInput {
    this.assertCanQuery(context);
    const where = this.withCompanyScope<Prisma.AiUsageRecordWhereInput>({}, context);

    if (query.moduleKey) {
      where.moduleKey = query.moduleKey;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.provider) {
      where.provider = query.provider;
    }
    if (query.isMock !== undefined) {
      where.isMock = query.isMock;
    }
    if (query.success !== undefined) {
      where.success = query.success;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    const createdAt = this.buildDateRange(query.startDate, query.endDate);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private buildAiCallLogWhere(
    query: QueryLogsViewerAiCallLogsDto,
    context: ResourceAccessContext
  ): Prisma.AiCallLogWhereInput {
    this.assertCanQuery(context);
    const where = this.withCompanyScope<Prisma.AiCallLogWhereInput>({}, context);

    if (query.provider) {
      where.provider = query.provider;
    }
    if (query.purpose) {
      where.purpose = query.purpose;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.relatedType) {
      where.relatedType = query.relatedType;
    }
    if (query.createdById) {
      where.createdById = query.createdById;
    }
    const createdAt = this.buildDateRange(query.startDate, query.endDate);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private toOperationLogListItem(log: OperationLogWithRelations): LogsViewerOperationLogItem {
    return {
      id: log.id,
      createdAt: log.createdAt,
      companyId: log.companyId,
      userId: log.userId,
      userName: log.user?.name ?? null,
      departmentId: log.departmentId,
      moduleKey: log.moduleKey,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      targetTitle: log.targetTitle,
      success: log.success,
      errorSummary: this.toErrorSummary(log.errorMessage),
      hasIp: Boolean(log.ip),
      hasUserAgent: Boolean(log.userAgent),
      metadataKeys: this.getSafeMetadataKeys(log.metadata)
    };
  }

  private toOperationLogDetail(log: OperationLogWithRelations): LogsViewerOperationLogDetail {
    return {
      ...this.toOperationLogListItem(log),
      metadataSummary: this.toMetadataSummary(log.metadata, OPERATION_METADATA_SUMMARY_KEYS)
    };
  }

  private toAiUsageRecordItem(record: AiUsageRecordWithRelations): LogsViewerAiUsageRecordItem {
    return {
      id: record.id,
      createdAt: record.createdAt,
      companyId: record.companyId,
      userId: record.userId,
      userName: record.user?.name ?? null,
      departmentId: record.departmentId,
      moduleKey: record.moduleKey,
      action: record.action,
      provider: record.provider,
      model: record.model,
      isMock: record.isMock,
      promptTokens: record.promptTokens,
      completionTokens: record.completionTokens,
      totalTokens: record.totalTokens,
      requestCount: record.requestCount,
      success: record.success,
      errorSummary: this.toErrorSummary(record.errorMessage),
      metadataSummary: this.toMetadataSummary(record.metadata, AI_USAGE_METADATA_SUMMARY_KEYS)
    };
  }

  private toAiCallLogItem(log: AiCallLogWithRelations): LogsViewerAiCallLogItem {
    return {
      id: log.id,
      createdAt: log.createdAt,
      companyId: log.companyId,
      createdById: log.createdById,
      createdByName: log.createdBy?.name ?? null,
      provider: log.provider,
      model: log.model,
      purpose: log.purpose,
      relatedType: log.relatedType,
      relatedId: log.relatedId,
      tokenInput: log.tokenInput,
      tokenOutput: log.tokenOutput,
      status: log.status,
      isMockInferred: MOCK_PROVIDERS.has(log.provider),
      requestCountLabel: REQUEST_COUNT_LABEL
    };
  }

  private assertCanQuery(context: ResourceAccessContext): void {
    const role = getEffectiveRole(context);

    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("当前角色无权查看日志与审计");
    }
  }

  private withCompanyScope<T extends object>(
    where: T,
    context: ResourceAccessContext
  ): T & { companyId?: string } {
    if (getEffectiveRole(context) === "company_admin") {
      return {
        ...where,
        companyId: getCurrentCompanyId(context)
      } as T & { companyId: string };
    }

    return where as T & { companyId?: string };
  }

  private resolvePagination(query: PageQuery): { page: number; pageSize: number } {
    return {
      page: Math.max(query.page ?? 1, 1),
      pageSize: Math.min(Math.max(query.pageSize ?? 20, 1), 100)
    };
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

  private toErrorSummary(errorMessage?: string | null): string | null {
    const sanitized = this.toViewerSafeText(errorMessage);

    if (!sanitized) {
      return null;
    }

    return this.truncateText(sanitized, ERROR_SUMMARY_LENGTH);
  }

  private getSafeMetadataKeys(metadata: Prisma.JsonValue | null): string[] {
    const objectValue = this.toPlainObject(metadata);

    if (!objectValue) {
      return [];
    }

    // 只暴露非敏感 key，避免通过 key 名暗示 prompt、正文、密钥等原始内容存在。
    return Object.keys(objectValue)
      .filter((key) => !this.isHiddenMetadataKey(key))
      .sort((left, right) => left.localeCompare(right));
  }

  private toMetadataSummary(
    metadata: Prisma.JsonValue | null,
    allowedKeys: Set<string>
  ): MetadataSummary {
    const objectValue = this.toPlainObject(metadata);

    if (!objectValue) {
      return {};
    }

    return Object.entries(objectValue).reduce<MetadataSummary>((summary, [key, value]) => {
      if (this.isHiddenMetadataKey(key) || !allowedKeys.has(key)) {
        return summary;
      }

      const nextValue = this.toSummaryValue(value);
      if (nextValue !== undefined) {
        summary[key] = nextValue;
      }

      return summary;
    }, {});
  }

  private toPlainObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private toSummaryValue(value: unknown): JsonSummaryValue | undefined {
    if (value === null) {
      return null;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const sanitized = this.toViewerSafeText(value);
      return sanitized ? this.truncateText(sanitized, ERROR_SUMMARY_LENGTH) : undefined;
    }
    if (Array.isArray(value)) {
      return {
        itemCount: value.length
      };
    }
    if (typeof value === "object") {
      const safeKeys = Object.keys(value as Record<string, unknown>)
        .filter((key) => !this.isHiddenMetadataKey(key))
        .sort((left, right) => left.localeCompare(right));

      return {
        keyCount: safeKeys.length,
        keys: safeKeys.slice(0, 20)
      };
    }

    return undefined;
  }

  private isHiddenMetadataKey(key: string): boolean {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

    return HIDDEN_METADATA_KEYS.has(normalizedKey);
  }

  private truncateText(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }

  private toViewerSafeText(value: unknown): string | undefined {
    const sanitized = sanitizeErrorPreview(value);

    // 日志查看接口面向浏览器，再额外隐藏敏感请求头和密钥字段名。
    return sanitized?.replace(SENSITIVE_TEXT_LABEL_PATTERN, "[secret_redacted]");
  }
}
