import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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
import { buildModelInclusionRecordsCsv } from "./utils/csv-export.util";
import { deriveHitLevel, type GeoHitLevel } from "./utils/derive-hit-level.util";
import {
  normalizeCreateModelInclusionRecord,
  normalizeImportModelInclusionRecordRow,
  normalizeQueryModelInclusionRecords,
  normalizeQueryModelInclusionSummary,
  normalizeQueryUncoveredPrompts,
  trimOptional,
  type NormalizedCreateModelInclusionRecord,
  type NormalizedImportModelInclusionRecord,
  type NormalizedQueryModelInclusionRecords,
  type NormalizedQueryModelInclusionSummary,
  type NormalizedQueryUncoveredPrompts
} from "./utils/normalize-model-inclusion-record";
import { calculateRate } from "./utils/summary-rate.util";
import { PrismaService } from "../../prisma/prisma.service";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const MAX_EXPORT_ROWS = 5000;

type ModelInclusionRecordWithPrompt = ModelInclusionRecord & {
  geoPrompt: GeoPrompt;
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
  createdAt: Date;
  geoPrompt: ModelInclusionGeoPromptResponse;
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
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(query: QueryModelInclusionRecordsDto): Promise<ModelInclusionRecordListResponse> {
    const normalized = normalizeQueryModelInclusionRecords(query);
    const where = this.buildRecordWhere(normalized);

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

  async create(input: CreateModelInclusionRecordDto): Promise<ModelInclusionRecordResponse> {
    const normalized = normalizeCreateModelInclusionRecord(input);
    const geoPrompt = await this.findActiveGeoPromptById(normalized.geoPromptId);
    const createdById = await this.resolveCreatedById(normalized.createdBy);
    const created = await this.createRecord(normalized, geoPrompt.id, createdById);
    await this.refreshLatestCoverageStatus(geoPrompt.id);

    return this.toRecordResponse({
      ...created,
      geoPrompt
    });
  }

  async importRecords(
    input: ImportModelInclusionRecordsDto
  ): Promise<ImportModelInclusionRecordsResponse> {
    const createdItems: ModelInclusionRecordResponse[] = [];
    const failedRows: FailedModelInclusionImportRow[] = [];

    for (const [index, row] of input.rows.entries()) {
      const rowIndex = index + 1;

      try {
        const normalized = normalizeImportModelInclusionRecordRow(row);
        const geoPrompt = await this.resolveImportGeoPrompt(normalized);
        const createdById = await this.resolveCreatedById(normalized.createdBy);
        const created = await this.createRecord(normalized, geoPrompt.id, createdById);
        await this.refreshLatestCoverageStatus(geoPrompt.id);
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

  async exportCsv(query: QueryModelInclusionRecordsDto): Promise<string> {
    const normalized = normalizeQueryModelInclusionRecords(query, 1, MAX_EXPORT_ROWS);
    const records = await this.findRecordsForExport(normalized);
    return buildModelInclusionRecordsCsv(records);
  }

  async findUncoveredPrompts(
    query: QueryUncoveredPromptsDto
  ): Promise<UncoveredGeoPromptListResponse> {
    const normalized = normalizeQueryUncoveredPrompts(query);
    const where = this.buildUncoveredPromptWhere(normalized);

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

  async getSummary(query: QueryModelInclusionSummaryDto): Promise<ModelInclusionSummaryResponse> {
    const normalized = normalizeQueryModelInclusionSummary(query);
    const where = this.buildSummaryWhere(normalized);
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
    createdById: string
  ): Promise<ModelInclusionRecord> {
    return this.prisma.modelInclusionRecord.create({
      data: {
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
        }
      }
    });
  }

  private buildRecordWhere(
    query: NormalizedQueryModelInclusionRecords
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
    if (query.checkedFrom || query.checkedTo) {
      where.checkedAt = {
        ...(query.checkedFrom ? { gte: query.checkedFrom } : {}),
        ...(query.checkedTo ? { lte: query.checkedTo } : {})
      };
    }

    return where;
  }

  private buildUncoveredPromptWhere(
    query: NormalizedQueryUncoveredPrompts
  ): Prisma.GeoPromptWhereInput {
    const inclusionWhere: Prisma.ModelInclusionRecordWhereInput = {};

    if (query.model) {
      inclusionWhere.model = query.model;
    }
    if (query.checkedFrom || query.checkedTo) {
      inclusionWhere.checkedAt = {
        ...(query.checkedFrom ? { gte: query.checkedFrom } : {}),
        ...(query.checkedTo ? { lte: query.checkedTo } : {})
      };
    }

    return {
      deletedAt: null,
      trackEnabled: query.trackEnabled,
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(query.promptType ? { type: query.promptType } : {}),
      ...(query.userIntent ? { userIntent: query.userIntent } : {}),
      inclusionRecords: {
        none: inclusionWhere
      }
    };
  }

  private buildSummaryWhere(
    query: NormalizedQueryModelInclusionSummary
  ): Prisma.ModelInclusionRecordWhereInput {
    return {
      geoPrompt: {
        deletedAt: null,
        ...(query.productLine ? { productLine: query.productLine } : {})
      },
      ...(query.model ? { model: query.model } : {}),
      ...(query.checkedFrom || query.checkedTo
        ? {
            checkedAt: {
              ...(query.checkedFrom ? { gte: query.checkedFrom } : {}),
              ...(query.checkedTo ? { lte: query.checkedTo } : {})
            }
          }
        : {})
    };
  }

  private async findRecordsForExport(
    query: NormalizedQueryModelInclusionRecords
  ): Promise<ModelInclusionRecordWithPrompt[]> {
    const records = await this.prisma.modelInclusionRecord.findMany({
      where: this.buildRecordWhere(query),
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

  private async findActiveGeoPromptById(id: string): Promise<GeoPrompt> {
    const geoPrompt = await this.prisma.geoPrompt.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!geoPrompt) {
      throw new BadRequestException(`GEO prompt not found or deleted: ${id}`);
    }

    return geoPrompt;
  }

  private async resolveImportGeoPrompt(
    row: NormalizedImportModelInclusionRecord
  ): Promise<GeoPrompt> {
    if (row.geoPromptId) {
      return this.findActiveGeoPromptById(row.geoPromptId);
    }

    const promptText = row.promptText;

    if (!promptText) {
      throw new BadRequestException("promptText is required when geoPromptId is missing");
    }

    const geoPrompt = await this.prisma.geoPrompt.findFirst({
      where: {
        promptText,
        deletedAt: null
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

  private async refreshLatestCoverageStatus(geoPromptId: string): Promise<void> {
    const latestRecord = await this.prisma.modelInclusionRecord.findFirst({
      where: {
        geoPromptId,
        geoPrompt: {
          deletedAt: null
        }
      },
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
