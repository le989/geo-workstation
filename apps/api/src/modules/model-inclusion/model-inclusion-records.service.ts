import { BadRequestException, ForbiddenException, Inject, Injectable, Optional } from "@nestjs/common";
import {
  GeoPromptType,
  Prisma,
  RecordMethod,
  UserIntent,
  UserRole,
  UserStatus,
  type GeoPrompt,
  type ModelInclusionRecord
} from "@prisma/client";
import type { CreateModelInclusionRecordDto } from "./dto/create-model-inclusion-record.dto";
import type {
  ImportModelInclusionRecordRow,
  ImportModelInclusionRecordsDto
} from "./dto/import-model-inclusion-records.dto";
import type { QueryModelInclusionRecordsDto } from "./dto/query-model-inclusion-records.dto";
import type { QueryModelInclusionSummaryDto } from "./dto/query-model-inclusion-summary.dto";
import type { QueryUncoveredPromptsDto } from "./dto/query-uncovered-prompts.dto";
import type { UpdateModelInclusionRecordDto } from "./dto/update-model-inclusion-record.dto";
import type { VoidModelInclusionRecordDto } from "./dto/void-model-inclusion-record.dto";
import type { WebSearchCheckDto } from "./dto/web-search-check.dto";
import { buildModelInclusionRecordsCsv } from "./utils/csv-export.util";
import { deriveHitLevel, type GeoHitLevel } from "./utils/derive-hit-level.util";
import { analyzeGeoHitFromAnswer } from "./utils/analyze-geo-hit.util";
import {
  normalizeCreateModelInclusionRecord,
  normalizeImportModelInclusionRecordRow,
  normalizeQueryModelInclusionRecords,
  normalizeQueryModelInclusionSummary,
  normalizeQueryUncoveredPrompts,
  normalizeUpdateModelInclusionRecord,
  trimOptional,
  type NormalizedCreateModelInclusionRecord,
  type NormalizedImportModelInclusionRecord,
  type NormalizedQueryModelInclusionRecords,
  type NormalizedQueryModelInclusionSummary,
  type NormalizedQueryUncoveredPrompts,
  type NormalizedUpdateModelInclusionRecord
} from "./utils/normalize-model-inclusion-record";
import { calculateRate } from "./utils/summary-rate.util";
import {
  classifyProviderError,
  formatProviderError,
  getProviderRetryCount,
  type ProviderErrorCategory,
  KimiWebSearchProvider
} from "./providers/kimi-web-search.provider";
import { AliyunBailianWebSearchProvider } from "./providers/aliyun-bailian-web-search.provider";
import { VolcengineWebSearchProvider } from "./providers/volcengine-web-search.provider";
import { PrismaService } from "../../prisma/prisma.service";
import {
  buildResourceReadWhere,
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { buildOwnerCompanyReadWhere } from "../auth/owner-company-policy";
import { AiUsageService } from "../usage/ai-usage.service";
import { OperationLogsService } from "../usage/operation-logs.service";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const MAX_EXPORT_ROWS = 5000;

type ModelInclusionRecordWithPrompt = ModelInclusionRecord & {
  geoPrompt: GeoPrompt;
};

type ProjectProfileContext = {
  brandName?: string;
  companyName?: string;
  websiteUrl?: string;
};

export type ModelInclusionGeoPromptResponse = {
  id: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent;
};

export type ModelInclusionRecordResponse = {
  id: string;
  geoPromptId: string;
  model: string;
  platform?: string;
  entryPoint?: string;
  detectionMethod?: string;
  deviceType?: string;
  isWebSearchEnabled: boolean;
  isLoggedIn: boolean;
  checkedAt: Date;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition: number | null;
  citedOfficialSite: boolean;
  citedContentAsset: boolean;
  competitorMentioned: boolean;
  hitLevel?: string;
  answerSummary?: string;
  rawAnswer?: string;
  citations?: unknown;
  searchResults?: unknown;
  screenshotPath?: string;
  errorMessage?: string;
  competitors: string[];
  recordMethod: RecordMethod;
  createdBy: string;
  updatedBy?: string;
  voidedAt?: Date;
  voidedByUserId?: string;
  voidReason?: string;
  restoredAt?: Date;
  restoredByUserId?: string;
  createdAt: Date;
  geoPrompt: ModelInclusionGeoPromptResponse;
  retryCount?: number;
  errorCategory?: ProviderErrorCategory;
};

export type ModelInclusionRecordListResponse = {
  items: ModelInclusionRecordResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type FailedModelInclusionImportRow = {
  rowIndex: number;
  row: ImportModelInclusionRecordRow;
  errors: string[];
};

export type ImportModelInclusionRecordsResponse = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdItems: ModelInclusionRecordResponse[];
  failedRows: FailedModelInclusionImportRow[];
};

export type FailedWebSearchCheckItem = {
  geoPromptId: string;
  promptText?: string;
  errorMessage: string;
  errorCategory: ProviderErrorCategory;
  retryCount: number;
  record?: ModelInclusionRecordResponse;
};

type WebSearchProviderName =
  | "kimi_web_search"
  | "volcengine_web_search"
  | "aliyun_bailian_web_search";

type WebSearchProviderRuntime = {
  provider: WebSearchProviderName;
  model: string;
  platform: string;
  search: (input: { promptText: string; model?: string } & ProjectProfileContext) => Promise<{
    finalAnswer: string;
    rawAnswer?: string;
    citations: unknown[];
    searchResults: unknown[];
    retryCount?: number;
  }>;
};

export type WebSearchCheckResponse = {
  provider: WebSearchProviderName;
  successCount: number;
  failedCount: number;
  createdItems: ModelInclusionRecordResponse[];
  failedItems: FailedWebSearchCheckItem[];
};

export type UncoveredGeoPromptResponse = {
  geoPromptId: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent;
  priority: number;
  trackEnabled: boolean;
  latestCoverageStatus?: string;
};

export type UncoveredGeoPromptListResponse = {
  items: UncoveredGeoPromptResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type ModelInclusionSummaryResponse = {
  totalRecords: number;
  mentionedCount: number;
  notMentionedCount: number;
  recommendedCount: number;
  notRecommendedCount: number;
  citedOfficialSiteCount: number;
  citedContentAssetCount: number;
  competitorMentionedCount: number;
  webSearchEnabledCount: number;
  loggedInCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  citedOfficialSiteRate: number;
  citedContentAssetRate: number;
  competitorMentionRate: number;
  modelDistribution: Record<string, number>;
  platformDistribution: Record<string, number>;
  entryPointDistribution: Record<string, number>;
  hitLevelDistribution: Record<string, number>;
  productLineDistribution: Record<string, number>;
};

@Injectable()
export class ModelInclusionRecordsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KimiWebSearchProvider) private readonly kimiWebSearchProvider: KimiWebSearchProvider,
    @Inject(VolcengineWebSearchProvider)
    private readonly volcengineWebSearchProvider: VolcengineWebSearchProvider,
    @Inject(AliyunBailianWebSearchProvider)
    private readonly aliyunBailianWebSearchProvider: AliyunBailianWebSearchProvider,
    @Optional()
    @Inject(AiUsageService)
    private readonly aiUsageService?: AiUsageService,
    @Optional()
    @Inject(OperationLogsService)
    private readonly operationLogsService?: OperationLogsService
  ) {}

  async findMany(
    query: QueryModelInclusionRecordsDto,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecordListResponse> {
    const normalized = normalizeQueryModelInclusionRecords(query);
    const where = this.buildRecordWhere(normalized, context);

    if (normalized.search) {
      const allItems = await this.prisma.modelInclusionRecord.findMany({
        where,
        include: {
          geoPrompt: true
        },
        orderBy: {
          checkedAt: "desc"
        }
      });
      const filteredItems = allItems.filter((item) =>
        this.recordMatchesSearch(item, normalized.search)
      );
      const pageItems = filteredItems.slice(
        (normalized.page - 1) * normalized.pageSize,
        normalized.page * normalized.pageSize
      );

      return {
        items: pageItems.map((item) => this.toRecordResponse(item)),
        total: filteredItems.length,
        page: normalized.page,
        pageSize: normalized.pageSize
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.modelInclusionRecord.findMany({
        where,
        include: {
          geoPrompt: true
        },
        orderBy: {
          checkedAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.modelInclusionRecord.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toRecordResponse(item)),
      total,
      page: normalized.page,
      pageSize: normalized.pageSize
    };
  }

  async create(
    input: CreateModelInclusionRecordDto,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecordResponse> {
    this.assertCanCreate(context);
    const normalized = normalizeCreateModelInclusionRecord(input);
    const geoPrompt = await this.findActiveGeoPromptById(normalized.geoPromptId, context);
    const createdById = context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
    const created = await this.createRecord(normalized, geoPrompt.id, createdById, context);
    await this.refreshLatestCoverageStatus(geoPrompt.id, context);

    return this.toRecordResponse({
      ...created,
      geoPrompt
    });
  }

  async updateRecord(
    id: string,
    input: UpdateModelInclusionRecordDto | Record<string, unknown>,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecordResponse> {
    const record = await this.findRecordForManageById(id, context);

    if (record.voidedAt) {
      throw new BadRequestException("已作废记录需恢复后再编辑");
    }

    const normalized = normalizeUpdateModelInclusionRecord(input);

    if (!this.hasUpdateRecordFields(normalized)) {
      throw new BadRequestException("至少需要提交一个可编辑结果字段");
    }

    const data = this.buildUpdateRecordData(normalized, context);
    const updated = await this.prisma.modelInclusionRecord.update({
      where: {
        id
      },
      data,
      include: {
        geoPrompt: true
      }
    });
    await this.refreshLatestCoverageStatus(updated.geoPromptId, context);

    return this.toRecordResponse(updated);
  }

  async voidRecord(
    id: string,
    input: VoidModelInclusionRecordDto | Record<string, unknown>,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecordResponse> {
    const record = await this.findRecordForManageById(id, context);
    const voidReason = trimOptional(input.voidReason);

    if (!voidReason) {
      throw new BadRequestException("作废原因不能为空");
    }

    if (record.voidedAt) {
      throw new BadRequestException("当前记录已作废，不能重复作废");
    }

    if (!context) {
      throw new ForbiddenException("当前登录态无权维护 AI 模型覆盖记录");
    }

    const actorId = context.user.id;
    const updated = await this.prisma.modelInclusionRecord.update({
      where: {
        id
      },
      data: {
        voidedAt: new Date(),
        voidReason,
        voidedBy: {
          connect: {
            id: actorId
          }
        },
        restoredAt: null,
        restoredBy: {
          disconnect: true
        },
        updatedBy: context
          ? {
              connect: {
                id: context.user.id
              }
            }
          : undefined
      },
      include: {
        geoPrompt: true
      }
    });
    await this.refreshLatestCoverageStatus(updated.geoPromptId, context);

    return this.toRecordResponse(updated);
  }

  async restoreRecord(
    id: string,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecordResponse> {
    const record = await this.findRecordForManageById(id, context);

    if (!record.voidedAt) {
      throw new BadRequestException("当前记录未作废，无需恢复");
    }

    if (!context) {
      throw new ForbiddenException("当前登录态无权维护 AI 模型覆盖记录");
    }

    const actorId = context.user.id;
    const updated = await this.prisma.modelInclusionRecord.update({
      where: {
        id
      },
      data: {
        voidedAt: null,
        voidReason: null,
        voidedBy: {
          disconnect: true
        },
        restoredAt: new Date(),
        restoredBy: {
          connect: {
            id: actorId
          }
        },
        updatedBy: context
          ? {
              connect: {
                id: context.user.id
              }
            }
          : undefined
      },
      include: {
        geoPrompt: true
      }
    });
    await this.refreshLatestCoverageStatus(updated.geoPromptId, context);

    return this.toRecordResponse(updated);
  }

  async importRecords(
    input: ImportModelInclusionRecordsDto,
    context?: ResourceAccessContext
  ): Promise<ImportModelInclusionRecordsResponse> {
    this.assertCanImportModelInclusion(context);
    const createdItems: ModelInclusionRecordResponse[] = [];
    const failedRows: FailedModelInclusionImportRow[] = [];

    for (const [index, row] of input.rows.entries()) {
      const rowIndex = index + 1;

      try {
        const normalized = normalizeImportModelInclusionRecordRow(row);
        const geoPrompt = await this.resolveImportGeoPrompt(normalized, context);
        const createdById =
          context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
        const created = await this.createRecord(normalized, geoPrompt.id, createdById, context);
        await this.refreshLatestCoverageStatus(geoPrompt.id, context);
        createdItems.push(
          this.toRecordResponse({
            ...created,
            geoPrompt
          })
        );
      } catch (error) {
        failedRows.push({
          rowIndex,
          row,
          errors: [error instanceof Error ? error.message : "Import row failed"]
        });
      }
    }

    return {
      totalRows: input.rows.length,
      successCount: createdItems.length,
      failedCount: failedRows.length,
      createdItems,
      failedRows
    };
  }

  async webSearchCheck(
    input: WebSearchCheckDto,
    context?: ResourceAccessContext
  ): Promise<WebSearchCheckResponse> {
    this.assertCanRunWebSearch(context);
    const startedAt = Date.now();
    const uniquePromptIds = [...new Set(input.geoPromptIds)].slice(0, input.limit ?? 20);
    const providerRuntime = this.resolveWebSearchProvider(input);
    const profile = await this.resolveProjectProfileContext(context);
    const brandContext = {
      brandName: input.brandName ?? profile.brandName,
      companyName: input.companyName ?? profile.companyName,
      websiteUrl: input.websiteUrl ?? profile.websiteUrl
    };
    const createdItems: ModelInclusionRecordResponse[] = [];
    const failedItems: FailedWebSearchCheckItem[] = [];
    const createdById = context?.user.id ?? (await this.resolveCreatedById());
    const model = providerRuntime.model;

    for (const geoPromptId of uniquePromptIds) {
      let geoPrompt: GeoPrompt | null = null;

      try {
        geoPrompt = await this.findActiveGeoPromptById(geoPromptId, context);
        const searchResult = await providerRuntime.search({
          promptText: geoPrompt.promptText,
          model,
          ...brandContext
        });
        const analysis = analyzeGeoHitFromAnswer({
          promptText: geoPrompt.promptText,
          answer: searchResult.rawAnswer ?? searchResult.finalAnswer,
          ...brandContext,
          citations: searchResult.citations,
          searchResults: searchResult.searchResults
        });
        const created = await this.createRecord(
          {
            geoPromptId: geoPrompt.id,
            model,
            platform: providerRuntime.platform,
            entryPoint: input.entryPoint ?? "web_search_api",
            detectionMethod: "web_search",
            deviceType: "api",
            isWebSearchEnabled: true,
            isLoggedIn: input.isLoggedIn ?? false,
            checkedAt: new Date(),
            brandMentioned: analysis.brandMentioned,
            brandRecommended: analysis.brandRecommended,
            rankingPosition: analysis.rankingPosition,
            citedOfficialSite: analysis.citedOfficialSite,
            citedContentAsset: analysis.citedContentAsset,
            competitorMentioned: analysis.competitorMentioned,
            hitLevel: analysis.hitLevel,
            answerSummary: analysis.answerSummary,
            rawAnswer: analysis.rawAnswer,
            citations: analysis.citations as Prisma.InputJsonValue,
            searchResults: analysis.searchResults as Prisma.InputJsonValue,
            screenshotPath: undefined,
            errorMessage: undefined,
            competitors: analysis.competitors,
            recordMethod: RecordMethod.api,
            createdBy: undefined
          },
          geoPrompt.id,
          createdById,
          context
        );
        await this.refreshLatestCoverageStatus(geoPrompt.id, context);
        createdItems.push({
          ...this.toRecordResponse({
            ...created,
            geoPrompt
          }),
          retryCount: searchResult.retryCount ?? 0
        });
      } catch (error) {
        const errorCategory = classifyProviderError(error);
        const retryCount = getProviderRetryCount(error);
        const errorMessage = formatProviderError(error);
        const providerCitations = this.extractProviderErrorJsonArray(error, "citations");
        const providerSearchResults = this.extractProviderErrorJsonArray(error, "searchResults");
        let failureRecord: ModelInclusionRecordResponse | undefined;

        if (geoPrompt) {
          const created = await this.createRecord(
            {
              geoPromptId: geoPrompt.id,
              model,
              platform: providerRuntime.platform,
              entryPoint: input.entryPoint ?? "web_search_api",
              detectionMethod: "web_search",
              deviceType: "api",
              isWebSearchEnabled: true,
              isLoggedIn: input.isLoggedIn ?? false,
              checkedAt: new Date(),
              brandMentioned: false,
              brandRecommended: false,
              rankingPosition: undefined,
              citedOfficialSite: false,
              citedContentAsset: false,
              competitorMentioned: false,
              hitLevel: "unclear",
              answerSummary: undefined,
              rawAnswer: undefined,
              citations: providerCitations as Prisma.InputJsonValue,
              searchResults: providerSearchResults as Prisma.InputJsonValue,
              screenshotPath: undefined,
              errorMessage,
              competitors: [],
              recordMethod: RecordMethod.api,
              createdBy: undefined
            },
            geoPrompt.id,
            createdById,
            context
          );
          await this.refreshLatestCoverageStatus(geoPrompt.id, context);
          failureRecord = {
            ...this.toRecordResponse({
              ...created,
              geoPrompt
            }),
            retryCount,
            errorCategory
          };
        }

        failedItems.push({
          geoPromptId,
          promptText: geoPrompt?.promptText,
          errorMessage,
          errorCategory,
          retryCount,
          record: failureRecord
        });
      }
    }

    await this.recordWebSearchCheckLogs(
      providerRuntime,
      createdItems,
      failedItems,
      Date.now() - startedAt,
      context
    );

    return {
      provider: providerRuntime.provider,
      successCount: createdItems.length,
      failedCount: failedItems.length,
      createdItems,
      failedItems
    };
  }

  private resolveWebSearchProvider(input: WebSearchCheckDto): WebSearchProviderRuntime {
    if (input.provider === "kimi_web_search") {
      return {
        provider: "kimi_web_search",
        model: input.model?.trim() || process.env.KIMI_MODEL || "kimi-k2.6",
        platform: "Kimi",
        search: (searchInput) => this.kimiWebSearchProvider.search(searchInput)
      };
    }

    if (input.provider === "volcengine_web_search") {
      return {
        provider: "volcengine_web_search",
        model:
          input.model?.trim() ||
          process.env.VOLCENGINE_WEB_SEARCH_MODEL ||
          "doubao-seed-1-6-250615",
        platform: "豆包 / 火山方舟",
        search: (searchInput) => this.volcengineWebSearchProvider.search(searchInput)
      };
    }

    if (input.provider === "aliyun_bailian_web_search") {
      return {
        provider: "aliyun_bailian_web_search",
        model: input.model?.trim() || process.env.ALIYUN_BAILIAN_MODEL || "qwen3-max",
        platform: "通义千问 / 阿里云百炼",
        search: (searchInput) => this.aliyunBailianWebSearchProvider.search(searchInput)
      };
    }

    throw new BadRequestException(`Unsupported web search provider: ${input.provider}`);
  }

  private extractProviderErrorJsonArray(
    error: unknown,
    field: "citations" | "searchResults"
  ): unknown[] {
    const value = (error as { citations?: unknown; searchResults?: unknown })?.[field];
    return Array.isArray(value) ? value : [];
  }

  async exportCsv(
    query: QueryModelInclusionRecordsDto,
    context?: ResourceAccessContext
  ): Promise<string> {
    this.assertCanExportModelInclusion(context);
    const normalized = normalizeQueryModelInclusionRecords(query, 1, MAX_EXPORT_ROWS);
    const records = await this.findRecordsForExport(normalized, context);
    const csv = buildModelInclusionRecordsCsv(records);

    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "model-inclusion-records",
        action: "export",
        targetType: "model_inclusion_records",
        success: true,
        metadata: {
          recordCount: records.length,
          model: normalized.model,
          platform: normalized.platform,
          entryPoint: normalized.entryPoint
        }
      },
      context
    );

    return csv;
  }

  private async recordWebSearchCheckLogs(
    providerRuntime: WebSearchProviderRuntime,
    createdItems: ModelInclusionRecordResponse[],
    failedItems: FailedWebSearchCheckItem[],
    latencyMs: number,
    context?: ResourceAccessContext
  ): Promise<void> {
    if (createdItems.length > 0) {
      await this.aiUsageService?.recordUsage(
        {
          moduleKey: "model-inclusion-records",
          action: "web_search_check",
          provider: providerRuntime.provider,
          model: providerRuntime.model,
          isMock: false,
          requestCount: 1,
          success: true,
          latencyMs,
          providerReturnedUsage: false,
          usageUnknown: true,
          metadata: {
            successCount: createdItems.length,
            failedCount: failedItems.length
          }
        },
        context
      );
    }

    if (failedItems.length > 0) {
      await this.aiUsageService?.recordUsage(
        {
          moduleKey: "model-inclusion-records",
          action: "web_search_check",
          provider: providerRuntime.provider,
          model: providerRuntime.model,
          isMock: false,
          requestCount: 1,
          success: false,
          errorMessage: failedItems[0]?.errorMessage,
          latencyMs,
          errorType: failedItems[0]?.errorCategory,
          providerReturnedUsage: false,
          usageUnknown: true,
          metadata: {
            successCount: createdItems.length,
            failedCount: failedItems.length,
            errorCategory: failedItems[0]?.errorCategory
          }
        },
        context
      );
    }

    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "model-inclusion-records",
        action: "web_search_check",
        targetType: "model_inclusion_records",
        success: failedItems.length === 0,
        errorMessage: failedItems[0]?.errorMessage,
        metadata: {
          provider: providerRuntime.provider,
          model: providerRuntime.model,
          successCount: createdItems.length,
          failedCount: failedItems.length
        }
      },
      context
    );
  }

  async findUncoveredPrompts(
    query: QueryUncoveredPromptsDto,
    context?: ResourceAccessContext
  ): Promise<UncoveredGeoPromptListResponse> {
    const normalized = normalizeQueryUncoveredPrompts(query);
    const where = this.buildUncoveredPromptWhere(normalized, context);

    const [items, total] = await Promise.all([
      this.prisma.geoPrompt.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.geoPrompt.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toUncoveredPromptResponse(item)),
      total,
      page: normalized.page,
      pageSize: normalized.pageSize
    };
  }

  async getSummary(
    query: QueryModelInclusionSummaryDto,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionSummaryResponse> {
    const normalized = normalizeQueryModelInclusionSummary(query);
    const where = this.buildSummaryWhere(normalized, context);
    const records = await this.prisma.modelInclusionRecord.findMany({
      where,
      include: {
        geoPrompt: true
      }
    });
    const totalRecords = records.length;
    const mentionedCount = records.filter((record) => record.brandMentioned).length;
    const recommendedCount = records.filter((record) => record.brandRecommended).length;
    const citedOfficialSiteCount = records.filter((record) => record.citedOfficialSite).length;
    const citedContentAssetCount = records.filter((record) => record.citedContentAsset).length;
    const competitorMentionedCount = records.filter((record) => record.competitorMentioned).length;
    const webSearchEnabledCount = records.filter((record) => record.isWebSearchEnabled).length;
    const loggedInCount = records.filter((record) => record.isLoggedIn).length;

    return {
      totalRecords,
      mentionedCount,
      notMentionedCount: totalRecords - mentionedCount,
      recommendedCount,
      notRecommendedCount: totalRecords - recommendedCount,
      citedOfficialSiteCount,
      citedContentAssetCount,
      competitorMentionedCount,
      webSearchEnabledCount,
      loggedInCount,
      brandMentionRate: calculateRate(mentionedCount, totalRecords),
      brandRecommendRate: calculateRate(recommendedCount, totalRecords),
      citedOfficialSiteRate: calculateRate(citedOfficialSiteCount, totalRecords),
      citedContentAssetRate: calculateRate(citedContentAssetCount, totalRecords),
      competitorMentionRate: calculateRate(competitorMentionedCount, totalRecords),
      modelDistribution: this.buildModelDistribution(records),
      platformDistribution: this.buildOptionalDistribution(records, (record) => record.platform),
      entryPointDistribution: this.buildOptionalDistribution(
        records,
        (record) => record.entryPoint
      ),
      hitLevelDistribution: this.buildOptionalDistribution(records, (record) =>
        this.resolveHitLevel(record)
      ),
      productLineDistribution: this.buildProductLineDistribution(records)
    };
  }

  private async createRecord(
    input: NormalizedCreateModelInclusionRecord | NormalizedImportModelInclusionRecord,
    geoPromptId: string,
    createdById: string,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecord> {
    return this.prisma.modelInclusionRecord.create({
      data: {
        ...(context
          ? {
              company: {
                connect: {
                  id: getCurrentCompanyId(context)
                }
              }
            }
          : {}),
        geoPrompt: {
          connect: {
            id: geoPromptId
          }
        },
        model: input.model,
        platform: input.platform,
        entryPoint: input.entryPoint,
        detectionMethod: input.detectionMethod,
        deviceType: input.deviceType,
        isWebSearchEnabled: input.isWebSearchEnabled,
        isLoggedIn: input.isLoggedIn,
        checkedAt: input.checkedAt,
        brandMentioned: input.brandMentioned,
        brandRecommended: input.brandRecommended,
        rankingPosition: input.rankingPosition,
        citedOfficialSite: input.citedOfficialSite,
        citedContentAsset: input.citedContentAsset,
        competitorMentioned: input.competitorMentioned,
        hitLevel: input.hitLevel,
        answerSummary: input.answerSummary,
        rawAnswer: input.rawAnswer,
        citations: input.citations,
        searchResults: input.searchResults,
        screenshotPath: input.screenshotPath,
        errorMessage: input.errorMessage,
        competitors: input.competitors as Prisma.InputJsonValue,
        recordMethod: input.recordMethod,
        createdBy: {
          connect: {
            id: createdById
          }
        },
        ...(context
          ? {
              updatedBy: {
                connect: {
                  id: context.user.id
                }
              }
            }
          : {})
      }
    });
  }

  private buildUpdateRecordData(
    input: NormalizedUpdateModelInclusionRecord,
    context?: ResourceAccessContext
  ): Prisma.ModelInclusionRecordUpdateInput {
    const data: Prisma.ModelInclusionRecordUpdateInput = {};

    if (input.checkedAt !== undefined) {
      data.checkedAt = input.checkedAt;
    }
    if (input.brandMentioned !== undefined) {
      data.brandMentioned = input.brandMentioned;
    }
    if (input.brandRecommended !== undefined) {
      data.brandRecommended = input.brandRecommended;
    }
    if (input.rankingPosition !== undefined) {
      data.rankingPosition = input.rankingPosition;
    }
    if (input.citedOfficialSite !== undefined) {
      data.citedOfficialSite = input.citedOfficialSite;
    }
    if (input.citedContentAsset !== undefined) {
      data.citedContentAsset = input.citedContentAsset;
    }
    if (input.competitorMentioned !== undefined) {
      data.competitorMentioned = input.competitorMentioned;
    }
    if (input.hitLevel !== undefined) {
      data.hitLevel = input.hitLevel;
    }
    if (input.answerSummary !== undefined) {
      data.answerSummary = input.answerSummary;
    }
    if (input.rawAnswer !== undefined) {
      data.rawAnswer = input.rawAnswer;
    }
    if (input.citations !== undefined) {
      data.citations = input.citations;
    }
    if (input.searchResults !== undefined) {
      data.searchResults = input.searchResults;
    }
    if (input.screenshotPath !== undefined) {
      data.screenshotPath = input.screenshotPath;
    }
    if (input.errorMessage !== undefined) {
      data.errorMessage = input.errorMessage;
    }
    if (input.competitors !== undefined) {
      data.competitors = input.competitors as Prisma.InputJsonValue;
    }
    if (context) {
      data.updatedBy = {
        connect: {
          id: context.user.id
        }
      };
    }

    return data;
  }

  private hasUpdateRecordFields(input: NormalizedUpdateModelInclusionRecord): boolean {
    return Object.keys(input).length > 0;
  }

  private buildRecordWhere(
    query: NormalizedQueryModelInclusionRecords,
    context?: ResourceAccessContext
  ): Prisma.ModelInclusionRecordWhereInput {
    const promptWhere: Prisma.GeoPromptWhereInput = {
      deletedAt: null
    };

    if (query.productLine) {
      promptWhere.productLine = query.productLine;
    }
    if (query.promptType) {
      promptWhere.type = query.promptType;
    }
    if (query.userIntent) {
      promptWhere.userIntent = query.userIntent;
    }

    const where: Prisma.ModelInclusionRecordWhereInput = {
      geoPrompt: promptWhere
    };

    if (query.geoPromptId) {
      where.geoPromptId = query.geoPromptId;
    }
    if (query.model) {
      where.model = query.model;
    }
    if (query.platform) {
      where.platform = query.platform;
    }
    if (query.entryPoint) {
      where.entryPoint = query.entryPoint;
    }
    if (query.detectionMethod) {
      where.detectionMethod = query.detectionMethod;
    }
    if (query.deviceType) {
      where.deviceType = query.deviceType;
    }
    if (query.isWebSearchEnabled !== undefined) {
      where.isWebSearchEnabled = query.isWebSearchEnabled;
    }
    if (query.isLoggedIn !== undefined) {
      where.isLoggedIn = query.isLoggedIn;
    }
    if (query.brandMentioned !== undefined) {
      where.brandMentioned = query.brandMentioned;
    }
    if (query.brandRecommended !== undefined) {
      where.brandRecommended = query.brandRecommended;
    }
    if (query.citedOfficialSite !== undefined) {
      where.citedOfficialSite = query.citedOfficialSite;
    }
    if (query.citedContentAsset !== undefined) {
      where.citedContentAsset = query.citedContentAsset;
    }
    if (query.competitorMentioned !== undefined) {
      where.competitorMentioned = query.competitorMentioned;
    }
    if (query.hitLevel) {
      where.hitLevel = query.hitLevel;
    }
    if (query.recordMethod) {
      where.recordMethod = query.recordMethod;
    }
    if (query.createdBy) {
      where.createdById = query.createdBy;
    }
    this.applyVoidStatusFilter(where, query.voidStatus);
    if (query.checkedFrom || query.checkedTo) {
      where.checkedAt = {
        ...(query.checkedFrom ? { gte: query.checkedFrom } : {}),
        ...(query.checkedTo ? { lte: query.checkedTo } : {})
      };
    }

    return this.withRecordScope(where, context);
  }

  private buildUncoveredPromptWhere(
    query: NormalizedQueryUncoveredPrompts,
    context?: ResourceAccessContext
  ): Prisma.GeoPromptWhereInput {
    const inclusionWhere: Prisma.ModelInclusionRecordWhereInput = this.withRecordScope(
      {
        voidedAt: null
      },
      context
    );

    if (query.model) {
      inclusionWhere.model = query.model;
    }
    if (query.checkedFrom || query.checkedTo) {
      inclusionWhere.checkedAt = {
        ...(query.checkedFrom ? { gte: query.checkedFrom } : {}),
        ...(query.checkedTo ? { lte: query.checkedTo } : {})
      };
    }

    const baseWhere: Prisma.GeoPromptWhereInput = {
      deletedAt: null,
      trackEnabled: query.trackEnabled,
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(query.promptType ? { type: query.promptType } : {}),
      ...(query.userIntent ? { userIntent: query.userIntent } : {})
    };

    return {
      AND: [
        baseWhere,
        ...(context ? [buildResourceReadWhere(context)] : []),
        {
          inclusionRecords: {
            none: inclusionWhere
          }
        }
      ]
    };
  }

  private buildSummaryWhere(
    query: NormalizedQueryModelInclusionSummary,
    context?: ResourceAccessContext
  ): Prisma.ModelInclusionRecordWhereInput {
    return this.withRecordScope(
      {
        geoPrompt: {
          deletedAt: null,
          ...(query.productLine ? { productLine: query.productLine } : {})
        },
        ...(query.model ? { model: query.model } : {}),
        voidedAt: null,
        ...(query.checkedFrom || query.checkedTo
          ? {
              checkedAt: {
                ...(query.checkedFrom ? { gte: query.checkedFrom } : {}),
                ...(query.checkedTo ? { lte: query.checkedTo } : {})
              }
            }
          : {})
      },
      context
    );
  }

  private withRecordScope(
    where: Prisma.ModelInclusionRecordWhereInput,
    context?: ResourceAccessContext
  ): Prisma.ModelInclusionRecordWhereInput {
    if (!context) {
      return where;
    }

    return {
      AND: [
        buildOwnerCompanyReadWhere(context) as Prisma.ModelInclusionRecordWhereInput,
        where
      ]
    };
  }

  private applyVoidStatusFilter(
    where: Prisma.ModelInclusionRecordWhereInput,
    voidStatus: "normal" | "voided" | "all"
  ): void {
    if (voidStatus === "normal") {
      where.voidedAt = null;
      return;
    }

    if (voidStatus === "voided") {
      where.voidedAt = {
        not: null
      };
    }
  }

  private async findRecordForManageById(
    id: string,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecordWithPrompt> {
    if (!context) {
      throw new ForbiddenException("当前登录态无权维护 AI 模型覆盖记录");
    }

    const record = await this.prisma.modelInclusionRecord.findUnique({
      where: {
        id
      },
      include: {
        geoPrompt: true
      }
    });

    if (!record) {
      throw new BadRequestException("AI 模型覆盖记录不存在");
    }

    this.assertCanManageRecord(context, record);

    return record;
  }

  private assertCanManageRecord(
    context: ResourceAccessContext,
    record: Pick<ModelInclusionRecord, "companyId">
  ): void {
    const role = getEffectiveRole(context);

    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("当前角色无权维护 AI 模型覆盖记录");
    }

    if (role === "company_admin" && record.companyId !== getCurrentCompanyId(context)) {
      throw new ForbiddenException("无权操作其他公司的 AI 模型覆盖记录");
    }
  }

  private assertCanCreate(context?: ResourceAccessContext): void {
    if (context && getEffectiveRole(context) === "viewer") {
      throw new ForbiddenException("当前角色无权新增 AI 收录记录");
    }
  }

  private assertCanImportModelInclusion(context?: ResourceAccessContext): void {
    if (!context) {
      return;
    }

    const role = getEffectiveRole(context);

    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("无权导入 AI 收录记录");
    }
  }

  private assertCanExportModelInclusion(context?: ResourceAccessContext): void {
    if (context && getEffectiveRole(context) === "viewer") {
      throw new ForbiddenException("当前角色无权导出 AI 收录记录");
    }
  }

  private assertCanRunWebSearch(context?: ResourceAccessContext): void {
    if (context) {
      const role = getEffectiveRole(context);

      if (role !== "platform_admin" && role !== "company_admin") {
        throw new ForbiddenException("当前角色无权发起 AI 收录检测");
      }
    }
  }

  private async findRecordsForExport(
    query: NormalizedQueryModelInclusionRecords,
    context?: ResourceAccessContext
  ): Promise<ModelInclusionRecordWithPrompt[]> {
    const records = await this.prisma.modelInclusionRecord.findMany({
      where: this.buildRecordWhere(query, context),
      include: {
        geoPrompt: true
      },
      orderBy: {
        checkedAt: "desc"
      },
      take: MAX_EXPORT_ROWS
    });

    if (!query.search) {
      return records;
    }

    return records.filter((record) => this.recordMatchesSearch(record, query.search));
  }

  private recordMatchesSearch(
    record: ModelInclusionRecordWithPrompt,
    search: string | undefined
  ): boolean {
    if (!search) {
      return true;
    }

    const normalized = search.toLowerCase();
    const competitors = this.jsonArrayToStringArray(record.competitors).join(" ").toLowerCase();

    return (
      record.model.toLowerCase().includes(normalized) ||
      (record.platform ?? "").toLowerCase().includes(normalized) ||
      (record.entryPoint ?? "").toLowerCase().includes(normalized) ||
      (record.rawAnswer ?? "").toLowerCase().includes(normalized) ||
      (record.errorMessage ?? "").toLowerCase().includes(normalized) ||
      (record.answerSummary ?? "").toLowerCase().includes(normalized) ||
      competitors.includes(normalized)
    );
  }

  private async findActiveGeoPromptById(
    id: string,
    context?: ResourceAccessContext
  ): Promise<GeoPrompt> {
    const geoPrompt = await this.prisma.geoPrompt.findFirst({
      where: {
        AND: [
          {
            id,
            deletedAt: null
          },
          ...(context ? [buildResourceReadWhere(context)] : [])
        ]
      }
    });

    if (!geoPrompt) {
      throw new BadRequestException(`GEO prompt not found or deleted: ${id}`);
    }

    return geoPrompt;
  }

  private async resolveProjectProfileContext(
    context?: ResourceAccessContext
  ): Promise<ProjectProfileContext> {
    const profile = await this.prisma.projectProfile.findFirst({
      where: context
        ? {
            companyId: getCurrentCompanyId(context)
          }
        : undefined,
      orderBy: {
        createdAt: "asc"
      },
      select: {
        brandName: true,
        companyName: true,
        websiteUrl: true
      }
    });

    return {
      brandName: profile?.brandName ?? undefined,
      companyName: profile?.companyName ?? undefined,
      websiteUrl: profile?.websiteUrl ?? undefined
    };
  }

  private async resolveImportGeoPrompt(
    row: NormalizedImportModelInclusionRecord,
    context?: ResourceAccessContext
  ): Promise<GeoPrompt> {
    if (row.geoPromptId) {
      return this.findActiveGeoPromptById(row.geoPromptId, context);
    }

    const promptText = row.promptText;

    if (!promptText) {
      throw new BadRequestException("promptText is required when geoPromptId is missing");
    }

    const geoPrompt = await this.prisma.geoPrompt.findFirst({
      where: {
        AND: [
          {
            promptText,
            deletedAt: null
          },
          ...(context ? [buildResourceReadWhere(context)] : [])
        ]
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!geoPrompt) {
      throw new BadRequestException(`GEO prompt not found by promptText: ${promptText}`);
    }

    return geoPrompt;
  }

  private async refreshLatestCoverageStatus(
    geoPromptId: string,
    context?: ResourceAccessContext
  ): Promise<void> {
    const latestRecord = await this.prisma.modelInclusionRecord.findFirst({
      where: this.withRecordScope(
        {
          geoPromptId,
          voidedAt: null,
          geoPrompt: {
            deletedAt: null
          }
        },
        context
      ),
      orderBy: [
        {
          checkedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    if (!latestRecord) {
      await this.prisma.geoPrompt.update({
        where: {
          id: geoPromptId
        },
        data: {
          latestCoverageStatus: null
        }
      });
      return;
    }

    await this.prisma.geoPrompt.update({
      where: {
        id: geoPromptId
      },
      data: {
        latestCoverageStatus: this.resolveCoverageStatus(latestRecord)
      }
    });
  }

  private resolveCoverageStatus(record: ModelInclusionRecord): string {
    if (record.brandMentioned && record.brandRecommended) {
      return "recommended";
    }

    if (record.brandMentioned) {
      return "mentioned";
    }

    return "not_mentioned";
  }

  private toRecordResponse(record: ModelInclusionRecordWithPrompt): ModelInclusionRecordResponse {
    return {
      id: record.id,
      geoPromptId: record.geoPromptId,
      model: record.model,
      platform: record.platform ?? undefined,
      entryPoint: record.entryPoint ?? undefined,
      detectionMethod: record.detectionMethod ?? undefined,
      deviceType: record.deviceType ?? undefined,
      isWebSearchEnabled: record.isWebSearchEnabled,
      isLoggedIn: record.isLoggedIn,
      checkedAt: record.checkedAt,
      brandMentioned: record.brandMentioned,
      brandRecommended: record.brandRecommended,
      rankingPosition: record.rankingPosition,
      citedOfficialSite: record.citedOfficialSite,
      citedContentAsset: record.citedContentAsset,
      competitorMentioned: record.competitorMentioned,
      hitLevel: this.resolveHitLevel(record),
      answerSummary: record.answerSummary ?? undefined,
      rawAnswer: record.rawAnswer ?? undefined,
      citations: record.citations ?? undefined,
      searchResults: record.searchResults ?? undefined,
      screenshotPath: record.screenshotPath ?? undefined,
      errorMessage: record.errorMessage ?? undefined,
      competitors: this.jsonArrayToStringArray(record.competitors),
      recordMethod: record.recordMethod,
      createdBy: record.createdById,
      updatedBy: record.updatedById ?? undefined,
      voidedAt: record.voidedAt ?? undefined,
      voidedByUserId: record.voidedByUserId ?? undefined,
      voidReason: record.voidReason ?? undefined,
      restoredAt: record.restoredAt ?? undefined,
      restoredByUserId: record.restoredByUserId ?? undefined,
      createdAt: record.createdAt,
      geoPrompt: {
        id: record.geoPrompt.id,
        promptText: record.geoPrompt.promptText,
        type: record.geoPrompt.type,
        productLine: record.geoPrompt.productLine ?? undefined,
        userIntent: record.geoPrompt.userIntent
      }
    };
  }

  private toUncoveredPromptResponse(prompt: GeoPrompt): UncoveredGeoPromptResponse {
    return {
      geoPromptId: prompt.id,
      promptText: prompt.promptText,
      type: prompt.type,
      productLine: prompt.productLine ?? undefined,
      userIntent: prompt.userIntent,
      priority: prompt.priority,
      trackEnabled: prompt.trackEnabled,
      latestCoverageStatus: prompt.latestCoverageStatus ?? undefined
    };
  }

  private buildModelDistribution(records: ModelInclusionRecord[]): Record<string, number> {
    return records.reduce<Record<string, number>>((distribution, record) => {
      distribution[record.model] = (distribution[record.model] ?? 0) + 1;
      return distribution;
    }, {});
  }

  private buildOptionalDistribution(
    records: ModelInclusionRecord[],
    pickValue: (record: ModelInclusionRecord) => string | null | undefined
  ): Record<string, number> {
    return records.reduce<Record<string, number>>((distribution, record) => {
      const value = pickValue(record);

      if (!value) {
        return distribution;
      }

      distribution[value] = (distribution[value] ?? 0) + 1;
      return distribution;
    }, {});
  }

  private buildProductLineDistribution(
    records: ModelInclusionRecordWithPrompt[]
  ): Record<string, number> {
    return records.reduce<Record<string, number>>((distribution, record) => {
      const productLine = record.geoPrompt.productLine ?? "未设置产品线";
      distribution[productLine] = (distribution[productLine] ?? 0) + 1;
      return distribution;
    }, {});
  }

  private jsonArrayToStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => String(item));
  }

  private resolveHitLevel(record: ModelInclusionRecord): GeoHitLevel {
    if (record.hitLevel) {
      return record.hitLevel as GeoHitLevel;
    }

    return deriveHitLevel({
      brandMentioned: record.brandMentioned,
      brandRecommended: record.brandRecommended,
      citedOfficialSite: record.citedOfficialSite,
      citedContentAsset: record.citedContentAsset,
      competitorMentioned: record.competitorMentioned
    });
  }

  private async resolveCreatedById(createdBy?: string): Promise<string> {
    const normalizedCreatedBy = trimOptional(createdBy);

    if (normalizedCreatedBy) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: normalizedCreatedBy
        },
        select: {
          id: true
        }
      });

      if (!user) {
        throw new BadRequestException(
          `createdBy must reference an existing user: ${normalizedCreatedBy}`
        );
      }

      return user.id;
    }

    const geoOperator = await this.prisma.user.findFirst({
      where: {
        role: UserRole.geo_operator,
        status: UserStatus.active
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    });

    if (geoOperator) {
      return geoOperator.id;
    }

    const systemOperator = await this.prisma.user.upsert({
      where: {
        email: SYSTEM_GEO_OPERATOR_EMAIL
      },
      create: {
        email: SYSTEM_GEO_OPERATOR_EMAIL,
        name: "System GEO Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      },
      update: {
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });

    return systemOperator.id;
  }
}
