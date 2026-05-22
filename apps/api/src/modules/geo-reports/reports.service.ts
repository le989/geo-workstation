import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  GeoPromptType,
  TaskStatus,
  UserIntent,
  type GeoPrompt,
  type KnowledgeBase,
  type ModelInclusionRecord,
  type Prisma
} from "@prisma/client";
import type { ExportReportDto } from "./dto/export-report.dto";
import type { QueryContentCoverageReportDto } from "./dto/query-content-coverage-report.dto";
import type { QueryGeoHitSummaryReportDto } from "./dto/query-geo-hit-summary-report.dto";
import type { QueryGeoOverviewReportDto } from "./dto/query-geo-overview-report.dto";
import type { QueryKnowledgeCoverageReportDto } from "./dto/query-knowledge-coverage-report.dto";
import type { QueryModelCoverageReportDto } from "./dto/query-model-coverage-report.dto";
import type { QueryOptimizationSuggestionsDto } from "./dto/query-optimization-suggestions.dto";
import type { QueryPromptCoverageReportDto } from "./dto/query-prompt-coverage-report.dto";
import { PrismaService } from "../../prisma/prisma.service";
import type { ResourceAccessContext } from "../auth/auth-policy";
import { deriveHitLevel } from "../model-inclusion/utils/derive-hit-level.util";
import { OperationLogsService } from "../usage/operation-logs.service";
import {
  assertCanExportReports,
  buildReportKnowledgeWhere,
  buildReportOwnerWhere,
  buildReportPromptWhere,
  mergeAndWhere
} from "./reports-scope";
import { groupCount } from "./utils/group-count.util";
import {
  type OptimizationSuggestion,
  sortOptimizationSuggestions
} from "./utils/optimization-suggestion.util";
import { calculateRate } from "./utils/rate.util";
import { buildDateRangeFilter } from "./utils/report-date-range.util";
import { buildMetricCsv, buildRowsCsv } from "./utils/report-csv-export.util";

const HIGH_PRIORITY_THRESHOLD = 4;
const DEFAULT_SUGGESTION_LIMIT = 50;
const DEFAULT_PROMPT_LIMIT = 20;

type DateRangeQuery = {
  from?: Date;
  to?: Date;
};

type ProductLineQuery = {
  productLine?: string;
};

type PromptFilterQuery = ProductLineQuery & {
  promptType?: string;
  userIntent?: string;
  trackEnabled?: boolean;
  priority?: number;
};

type ModelFilterQuery = ProductLineQuery &
  DateRangeQuery & {
    model?: string;
    platform?: string;
    entryPoint?: string;
    promptType?: string;
  };

type GeoHitSummaryQuery = ProductLineQuery &
  DateRangeQuery & {
    platform?: string;
    entryPoint?: string;
    latestOnly?: boolean;
    priority?: number;
    trackEnabled?: boolean;
  };

type ContentFilterQuery = ProductLineQuery &
  DateRangeQuery & {
    generationType?: string;
    status?: string;
  };

type KnowledgeFilterQuery = ProductLineQuery &
  DateRangeQuery & {
    materialType?: string;
  };

type ModelInclusionRecordWithPrompt = ModelInclusionRecord & {
  geoPrompt: GeoPrompt;
};

export type ReportPromptSummary = {
  geoPromptId: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: string;
  priority: number;
  trackEnabled: boolean;
  latestCoverageStatus?: string;
};

export type ModelCoveragePromptSummary = {
  geoPromptId: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: string;
  model: string;
  checkedAt: Date;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition: number | null;
  citedOfficialSite: boolean;
  citedContentAsset: boolean;
  competitorMentioned: boolean;
  hitLevel?: string;
  platform?: string;
  entryPoint?: string;
};

export type GeoOverviewReport = {
  promptTotal: number;
  basePromptCount: number;
  distilledPromptCount: number;
  brandPromptCount: number;
  scenePromptCount: number;
  trackedPromptCount: number;
  highPriorityPromptCount: number;
  knowledgeBaseCount: number;
  knowledgeChunkCount: number;
  contentTaskCount: number;
  contentItemCount: number;
  modelInclusionRecordCount: number;
  brandMentionedCount: number;
  brandRecommendedCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  citedOfficialSiteCount: number;
  citedOfficialSiteRate: number;
  citedContentAssetCount: number;
  citedContentAssetRate: number;
  competitorMentionedCount: number;
  competitorMentionRate: number;
  uncoveredTrackedPromptCount: number;
  failedContentTaskCount: number;
};

export type PromptCoverageReport = {
  totalPrompts: number;
  trackedPrompts: number;
  promptsWithRecords: number;
  promptsWithoutRecords: number;
  coverageRate: number;
  byType: Record<string, number>;
  byProductLine: Record<string, number>;
  byUserIntent: Record<string, number>;
  byLatestCoverageStatus: Record<string, number>;
  highPriorityUncoveredPrompts: ReportPromptSummary[];
};

export type ModelCoverageReport = {
  totalRecords: number;
  modelDistribution: Record<string, number>;
  mentionedByModel: Record<string, number>;
  recommendedByModel: Record<string, number>;
  citedOfficialSiteByModel: Record<string, number>;
  citedContentAssetByModel: Record<string, number>;
  competitorMentionedByModel: Record<string, number>;
  brandMentionRateByModel: Record<string, number>;
  brandRecommendRateByModel: Record<string, number>;
  hitLevelDistribution: Record<string, number>;
  platformDistribution: Record<string, number>;
  entryPointDistribution: Record<string, number>;
  topRecommendedPrompts: ModelCoveragePromptSummary[];
  notMentionedPrompts: ModelCoveragePromptSummary[];
};

export type GeoHitOverallStatus =
  | "all_recommended"
  | "all_mentioned"
  | "partial_hit"
  | "not_mentioned"
  | "competitor_only"
  | "unclear"
  | "unchecked";

export type GeoHitSummaryOverview = {
  promptCount: number;
  checkedPromptCount: number;
  recordCount: number;
  latestRecordCount: number;
  brandMentionedCount: number;
  brandRecommendedCount: number;
  citedOfficialSiteCount: number;
  citedContentAssetCount: number;
  competitorMentionedCount: number;
  notMentionedCount: number;
  unclearCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  officialSiteCitationRate: number;
  competitorMentionRate: number;
  notMentionedRate: number;
};

export type GeoHitComparisonItem = {
  platform?: string;
  entryPoint?: string;
  recordCount: number;
  brandMentionRate: number;
  brandRecommendRate: number;
  notMentionedRate: number;
  competitorMentionRate: number;
  hitLevelDistribution: Record<string, number>;
};

export type GeoHitPromptMatrixResult = {
  platform: string;
  entryPoint: string;
  hitLevel: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  citedOfficialSite: boolean;
  competitorMentioned: boolean;
  checkedAt: Date;
};

export type GeoHitPromptMatrixItem = {
  geoPromptId: string;
  promptText: string;
  productLine?: string;
  priority: number;
  results: GeoHitPromptMatrixResult[];
  overallStatus: GeoHitOverallStatus;
};

export type GeoHitOptimizationSuggestion = {
  type:
    | "not_mentioned"
    | "kimi_gap"
    | "mentioned_not_recommended"
    | "competitor_without_brand"
    | "unclear_results";
  priority: "high" | "medium" | "low";
  geoPromptId: string;
  promptText: string;
  reason: string;
  suggestedAction: string;
};

export type GeoHitSummaryReport = {
  overview: GeoHitSummaryOverview;
  platformComparison: GeoHitComparisonItem[];
  entryPointComparison: GeoHitComparisonItem[];
  promptMatrix: GeoHitPromptMatrixItem[];
  optimizationSuggestions: GeoHitOptimizationSuggestion[];
};

export type ContentCoverageReport = {
  contentTaskCount: number;
  contentItemCount: number;
  succeededTaskCount: number;
  failedTaskCount: number;
  contentItemsByGenerationType: Record<string, number>;
  contentItemsByProductLine: Record<string, number>;
  contentItemsByStatus: Record<string, number>;
  promptsWithContent: number;
  promptsWithoutContent: number;
  highPriorityPromptsWithoutContent: ReportPromptSummary[];
};

export type KnowledgeCoverageReport = {
  knowledgeBaseCount: number;
  knowledgeFileCount: number;
  knowledgeChunkCount: number;
  chunksByProductLine: Record<string, number>;
  chunksByMaterialType: Record<string, number>;
  filesByParseStatus: Record<string, number>;
  productLinesWithoutKnowledge: string[];
};

export type OptimizationSuggestionsReport = {
  items: OptimizationSuggestion[];
};

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(OperationLogsService)
    private readonly operationLogsService?: OperationLogsService
  ) {}

  async getGeoOverview(
    query: QueryGeoOverviewReportDto,
    context: ResourceAccessContext
  ): Promise<GeoOverviewReport> {
    const promptWhere = this.buildPromptWhere(query, context);
    const recordWhere = this.buildModelRecordWhere(query, context);
    const assetQuery = {
      productLine: query.productLine
    };
    const contentTaskWhere = this.buildContentTaskWhere(assetQuery, context);
    const contentItemWhere = this.buildContentItemWhere(assetQuery, context);
    const knowledgeBaseWhere = this.buildKnowledgeBaseWhere(assetQuery, context);
    const knowledgeChunkWhere = this.buildKnowledgeChunkWhere(assetQuery, context);

    const [
      prompts,
      knowledgeBaseCount,
      knowledgeChunkCount,
      contentTaskCount,
      contentItemCount,
      failedContentTaskCount,
      modelRecords,
      uncoveredTrackedPromptCount
    ] = await Promise.all([
      this.prisma.geoPrompt.findMany({
        where: promptWhere
      }),
      this.prisma.knowledgeBase.count({
        where: knowledgeBaseWhere
      }),
      this.prisma.knowledgeChunk.count({
        where: knowledgeChunkWhere
      }),
      this.prisma.contentTask.count({
        where: contentTaskWhere
      }),
      this.prisma.contentItem.count({
        where: contentItemWhere
      }),
      this.prisma.contentTask.count({
        where: {
          ...contentTaskWhere,
          status: TaskStatus.failed
        }
      }),
      this.prisma.modelInclusionRecord.findMany({
        where: recordWhere
      }),
      this.prisma.geoPrompt.count({
        where: {
          ...promptWhere,
          trackEnabled: true,
          inclusionRecords: {
            none: this.buildNestedModelRecordWhere(query, context)
          }
        }
      })
    ]);

    const promptTypeCounts = groupCount(prompts, (prompt) => prompt.type, "unknown");
    const totalRecords = modelRecords.length;
    const brandMentionedCount = modelRecords.filter((record) => record.brandMentioned).length;
    const brandRecommendedCount = modelRecords.filter((record) => record.brandRecommended).length;
    const citedOfficialSiteCount = modelRecords.filter((record) => record.citedOfficialSite).length;
    const citedContentAssetCount = modelRecords.filter((record) => record.citedContentAsset).length;
    const competitorMentionedCount = modelRecords.filter(
      (record) => record.competitorMentioned
    ).length;

    return {
      promptTotal: prompts.length,
      basePromptCount: promptTypeCounts[GeoPromptType.base] ?? 0,
      distilledPromptCount: promptTypeCounts[GeoPromptType.distilled] ?? 0,
      brandPromptCount: promptTypeCounts[GeoPromptType.brand] ?? 0,
      scenePromptCount: promptTypeCounts[GeoPromptType.scene] ?? 0,
      trackedPromptCount: prompts.filter((prompt) => prompt.trackEnabled).length,
      highPriorityPromptCount: prompts.filter(
        (prompt) => prompt.priority >= HIGH_PRIORITY_THRESHOLD
      ).length,
      knowledgeBaseCount,
      knowledgeChunkCount,
      contentTaskCount,
      contentItemCount,
      modelInclusionRecordCount: totalRecords,
      brandMentionedCount,
      brandRecommendedCount,
      brandMentionRate: calculateRate(brandMentionedCount, totalRecords),
      brandRecommendRate: calculateRate(brandRecommendedCount, totalRecords),
      citedOfficialSiteCount,
      citedOfficialSiteRate: calculateRate(citedOfficialSiteCount, totalRecords),
      citedContentAssetCount,
      citedContentAssetRate: calculateRate(citedContentAssetCount, totalRecords),
      competitorMentionedCount,
      competitorMentionRate: calculateRate(competitorMentionedCount, totalRecords),
      uncoveredTrackedPromptCount,
      failedContentTaskCount
    };
  }

  async getPromptCoverage(
    query: QueryPromptCoverageReportDto,
    context: ResourceAccessContext
  ): Promise<PromptCoverageReport> {
    const promptWhere = this.buildPromptWhere(query, context);
    const prompts = await this.prisma.geoPrompt.findMany({
      where: promptWhere,
      orderBy: [
        {
          priority: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });
    const promptIds = new Set(prompts.map((prompt) => prompt.id));
    const records = await this.prisma.modelInclusionRecord.findMany({
      where: this.buildModelRecordWhere(query, context),
      select: {
        geoPromptId: true
      }
    });
    const promptIdsWithRecords = new Set(
      records.map((record) => record.geoPromptId).filter((id) => promptIds.has(id))
    );
    const highPriorityUncoveredPrompts = prompts
      .filter(
        (prompt) =>
          prompt.priority >= HIGH_PRIORITY_THRESHOLD && !promptIdsWithRecords.has(prompt.id)
      )
      .slice(0, DEFAULT_PROMPT_LIMIT)
      .map((prompt) => this.toPromptSummary(prompt));

    return {
      totalPrompts: prompts.length,
      trackedPrompts: prompts.filter((prompt) => prompt.trackEnabled).length,
      promptsWithRecords: promptIdsWithRecords.size,
      promptsWithoutRecords: prompts.length - promptIdsWithRecords.size,
      coverageRate: calculateRate(promptIdsWithRecords.size, prompts.length),
      byType: groupCount(prompts, (prompt) => prompt.type, "unknown"),
      byProductLine: groupCount(prompts, (prompt) => prompt.productLine, "未设置产品线"),
      byUserIntent: groupCount(prompts, (prompt) => prompt.userIntent, "unknown"),
      byLatestCoverageStatus: groupCount(
        prompts,
        (prompt) => prompt.latestCoverageStatus,
        "not_checked"
      ),
      highPriorityUncoveredPrompts
    };
  }

  async getModelCoverage(
    query: QueryModelCoverageReportDto,
    context: ResourceAccessContext
  ): Promise<ModelCoverageReport> {
    const records = await this.prisma.modelInclusionRecord.findMany({
      where: this.buildModelRecordWhere(query, context),
      include: {
        geoPrompt: true
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

    const modelDistribution = groupCount(records, (record) => record.model, "unknown");
    const mentionedByModel = this.groupModelBooleanCount(records, "brandMentioned");
    const recommendedByModel = this.groupModelBooleanCount(records, "brandRecommended");
    const citedOfficialSiteByModel = this.groupModelBooleanCount(records, "citedOfficialSite");
    const citedContentAssetByModel = this.groupModelBooleanCount(records, "citedContentAsset");
    const competitorMentionedByModel = this.groupModelBooleanCount(records, "competitorMentioned");

    return {
      totalRecords: records.length,
      modelDistribution,
      mentionedByModel,
      recommendedByModel,
      citedOfficialSiteByModel,
      citedContentAssetByModel,
      competitorMentionedByModel,
      brandMentionRateByModel: this.buildModelRates(mentionedByModel, modelDistribution),
      brandRecommendRateByModel: this.buildModelRates(recommendedByModel, modelDistribution),
      hitLevelDistribution: groupCount(
        records,
        (record) => this.resolveHitLevel(record),
        "unclear"
      ),
      platformDistribution: groupCount(records, (record) => record.platform, "未设置平台"),
      entryPointDistribution: groupCount(records, (record) => record.entryPoint, "未设置入口"),
      topRecommendedPrompts: records
        .filter((record) => record.brandRecommended)
        .sort(this.compareRecommendedRecords)
        .slice(0, DEFAULT_PROMPT_LIMIT)
        .map((record) => this.toModelCoveragePromptSummary(record)),
      notMentionedPrompts: records
        .filter((record) => !record.brandMentioned)
        .slice(0, DEFAULT_PROMPT_LIMIT)
        .map((record) => this.toModelCoveragePromptSummary(record))
    };
  }

  async getGeoHitSummary(
    query: QueryGeoHitSummaryReportDto,
    context: ResourceAccessContext
  ): Promise<GeoHitSummaryReport> {
    const promptWhere = this.buildGeoHitSummaryPromptWhere(query, context);
    const recordWhere = this.buildGeoHitSummaryRecordWhere(query, context);
    const latestOnly = query.latestOnly ?? true;
    const [prompts, records] = await Promise.all([
      this.prisma.geoPrompt.findMany({
        where: promptWhere,
        orderBy: [
          {
            priority: "desc"
          },
          {
            createdAt: "desc"
          }
        ]
      }),
      this.prisma.modelInclusionRecord.findMany({
        where: recordWhere,
        include: {
          geoPrompt: true
        },
        orderBy: [
          {
            checkedAt: "desc"
          },
          {
            createdAt: "desc"
          }
        ]
      })
    ]);
    const recordsForStats = latestOnly ? this.selectLatestGeoHitRecords(records) : records;
    const checkedPromptIds = new Set(recordsForStats.map((record) => record.geoPromptId));
    const brandMentionedCount = recordsForStats.filter((record) => record.brandMentioned).length;
    const brandRecommendedCount = recordsForStats.filter(
      (record) => record.brandRecommended
    ).length;
    const citedOfficialSiteCount = recordsForStats.filter(
      (record) => record.citedOfficialSite
    ).length;
    const citedContentAssetCount = recordsForStats.filter(
      (record) => record.citedContentAsset
    ).length;
    const competitorMentionedCount = recordsForStats.filter(
      (record) => record.competitorMentioned
    ).length;
    const notMentionedCount = recordsForStats.filter((record) =>
      this.isNotMentionedRecord(record)
    ).length;
    const unclearCount = recordsForStats.filter(
      (record) => this.resolveHitLevel(record) === "unclear"
    ).length;
    const latestRecordCount = recordsForStats.length;
    const promptMatrix = this.buildGeoHitPromptMatrix(prompts, recordsForStats);

    return {
      overview: {
        promptCount: prompts.length,
        checkedPromptCount: checkedPromptIds.size,
        recordCount: records.length,
        latestRecordCount,
        brandMentionedCount,
        brandRecommendedCount,
        citedOfficialSiteCount,
        citedContentAssetCount,
        competitorMentionedCount,
        notMentionedCount,
        unclearCount,
        brandMentionRate: calculateRate(brandMentionedCount, latestRecordCount),
        brandRecommendRate: calculateRate(brandRecommendedCount, latestRecordCount),
        officialSiteCitationRate: calculateRate(citedOfficialSiteCount, latestRecordCount),
        competitorMentionRate: calculateRate(competitorMentionedCount, latestRecordCount),
        notMentionedRate: calculateRate(notMentionedCount, latestRecordCount)
      },
      platformComparison: this.buildGeoHitComparison(recordsForStats, "platform"),
      entryPointComparison: this.buildGeoHitComparison(recordsForStats, "entryPoint"),
      promptMatrix,
      optimizationSuggestions: this.buildGeoHitOptimizationSuggestions(promptMatrix)
    };
  }

  async getContentCoverage(
    query: QueryContentCoverageReportDto,
    context: ResourceAccessContext
  ): Promise<ContentCoverageReport> {
    const tasks = await this.prisma.contentTask.findMany({
      where: this.buildContentTaskWhere(query, context)
    });
    const contentItems = await this.prisma.contentItem.findMany({
      where: this.buildContentItemWhere(query, context),
      include: {
        task: true,
        geoPrompt: true
      }
    });
    const prompts = await this.prisma.geoPrompt.findMany({
      where: this.buildPromptWhere({
        productLine: query.productLine
      }, context),
      orderBy: [
        {
          priority: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });
    const promptsWithContentIds = new Set(
      contentItems
        .filter((item) => item.geoPrompt?.deletedAt === null)
        .map((item) => item.geoPromptId)
        .filter((geoPromptId): geoPromptId is string => Boolean(geoPromptId))
    );
    const highPriorityPromptsWithoutContent = prompts
      .filter(
        (prompt) =>
          prompt.priority >= HIGH_PRIORITY_THRESHOLD && !promptsWithContentIds.has(prompt.id)
      )
      .slice(0, DEFAULT_PROMPT_LIMIT)
      .map((prompt) => this.toPromptSummary(prompt));

    return {
      contentTaskCount: tasks.length,
      contentItemCount: contentItems.length,
      succeededTaskCount: tasks.filter((task) => task.status === TaskStatus.succeeded).length,
      failedTaskCount: tasks.filter((task) => task.status === TaskStatus.failed).length,
      contentItemsByGenerationType: groupCount(
        contentItems,
        (item) => item.task.generationType,
        "unknown"
      ),
      contentItemsByProductLine: groupCount(
        contentItems,
        (item) => item.task.productLine,
        "未设置产品线"
      ),
      contentItemsByStatus: groupCount(contentItems, (item) => item.status, "unknown"),
      promptsWithContent: promptsWithContentIds.size,
      promptsWithoutContent: Math.max(prompts.length - promptsWithContentIds.size, 0),
      highPriorityPromptsWithoutContent
    };
  }

  async getKnowledgeCoverage(
    query: QueryKnowledgeCoverageReportDto,
    context: ResourceAccessContext
  ): Promise<KnowledgeCoverageReport> {
    const [knowledgeBases, knowledgeFiles, knowledgeChunks, prompts] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        where: this.buildKnowledgeBaseWhere(query, context)
      }),
      this.prisma.knowledgeFile.findMany({
        where: this.buildKnowledgeFileWhere(query, context),
        include: {
          knowledgeBase: true
        }
      }),
      this.prisma.knowledgeChunk.findMany({
        where: this.buildKnowledgeChunkWhere(query, context),
        include: {
          knowledgeBase: true
        }
      }),
      this.prisma.geoPrompt.findMany({
        where: this.buildPromptWhere({
          productLine: query.productLine
        }, context)
      })
    ]);

    return {
      knowledgeBaseCount: knowledgeBases.length,
      knowledgeFileCount: knowledgeFiles.length,
      knowledgeChunkCount: knowledgeChunks.length,
      chunksByProductLine: groupCount(
        knowledgeChunks,
        (chunk) => chunk.productLine ?? chunk.knowledgeBase.productLine,
        "未设置产品线"
      ),
      chunksByMaterialType: groupCount(
        knowledgeChunks,
        (chunk) => chunk.materialType,
        "未设置资料类型"
      ),
      filesByParseStatus: groupCount(knowledgeFiles, (file) => file.parseStatus, "unknown"),
      productLinesWithoutKnowledge: this.findProductLinesWithoutKnowledge(prompts, knowledgeBases)
    };
  }

  async getOptimizationSuggestions(
    query: QueryOptimizationSuggestionsDto,
    context: ResourceAccessContext
  ): Promise<OptimizationSuggestionsReport> {
    const minPriority = query.priority ?? HIGH_PRIORITY_THRESHOLD;
    const limit = query.limit ?? DEFAULT_SUGGESTION_LIMIT;
    const [prompts, records, contentItems, knowledgeBases, failedTasks] = await Promise.all([
      this.prisma.geoPrompt.findMany({
        where: {
          ...this.buildPromptWhere({
            productLine: query.productLine
          }, context),
          priority: {
            gte: minPriority
          }
        },
        orderBy: [
          {
            priority: "desc"
          },
          {
            createdAt: "desc"
          }
        ]
      }),
      this.prisma.modelInclusionRecord.findMany({
        where: this.buildModelRecordWhere(query, context),
        include: {
          geoPrompt: true
        },
        orderBy: {
          checkedAt: "desc"
        }
      }),
      this.prisma.contentItem.findMany({
        where: {
          deletedAt: null,
          task: this.buildContentTaskWhere({ productLine: query.productLine }, context),
          geoPrompt: {
            deletedAt: null
          }
        },
        select: {
          geoPromptId: true
        }
      }),
      this.prisma.knowledgeBase.findMany({
        where: this.buildKnowledgeBaseWhere({
          productLine: query.productLine
        }, context),
        select: {
          productLine: true
        }
      }),
      this.prisma.contentTask.findMany({
        where: this.buildContentTaskWhere(
          {
            productLine: query.productLine,
            status: TaskStatus.failed
          },
          context
        ),
        orderBy: {
          updatedAt: "desc"
        },
        take: DEFAULT_PROMPT_LIMIT
      })
    ]);

    const recordsByPromptId = this.groupRecordsByPromptId(records);
    const promptsWithContentIds = new Set(
      contentItems
        .map((item) => item.geoPromptId)
        .filter((geoPromptId): geoPromptId is string => Boolean(geoPromptId))
    );
    const productLinesWithKnowledge = new Set(
      knowledgeBases
        .map((knowledgeBase) => knowledgeBase.productLine)
        .filter((productLine): productLine is string => Boolean(productLine))
    );
    const suggestions: OptimizationSuggestion[] = [];

    for (const prompt of prompts) {
      const promptRecords = recordsByPromptId.get(prompt.id) ?? [];

      if (promptRecords.length === 0) {
        suggestions.push({
          type: "prompt_without_record",
          priority: prompt.priority,
          title: `补充模型覆盖记录：${prompt.promptText}`,
          reason: "高优先级 GEO 提示词暂无模型覆盖记录，无法判断品牌是否被提及或推荐。",
          suggestedAction: "先人工录入或导入该提示词在目标模型下的回答表现。",
          relatedPromptId: prompt.id,
          relatedPromptText: prompt.promptText,
          relatedProductLine: prompt.productLine ?? undefined,
          relatedModel: query.model
        });
      }

      if (promptRecords.some((record) => !record.brandMentioned)) {
        suggestions.push({
          type: "prompt_not_mentioned",
          priority: prompt.priority,
          title: `优化品牌提及：${prompt.promptText}`,
          reason: "该提示词已有检测记录，但品牌未被 AI 回答提及。",
          suggestedAction: "补充知识库事实资料，并生成更贴近该问法的 GEO 内容资产。",
          relatedPromptId: prompt.id,
          relatedPromptText: prompt.promptText,
          relatedProductLine: prompt.productLine ?? undefined,
          relatedModel: query.model
        });
      }

      if (!promptsWithContentIds.has(prompt.id)) {
        suggestions.push({
          type: "prompt_without_content",
          priority: prompt.priority,
          title: `补内容资产：${prompt.promptText}`,
          reason: "高优先级 GEO 提示词暂无关联内容，缺少可被 AI 摘取的发布素材。",
          suggestedAction: "基于知识库和指令模板生成选型指南、FAQ 或应用方案。",
          relatedPromptId: prompt.id,
          relatedPromptText: prompt.promptText,
          relatedProductLine: prompt.productLine ?? undefined,
          relatedModel: query.model
        });
      }

      if (prompt.productLine && !productLinesWithKnowledge.has(prompt.productLine)) {
        suggestions.push({
          type: "product_line_without_knowledge",
          priority: prompt.priority,
          title: `补知识库资料：${prompt.productLine}`,
          reason: "该产品线已有 GEO 提示词资产，但没有对应企业知识库资料。",
          suggestedAction: "导入产品能力、应用场景、FAQ、案例和资质等 GEO 知识片段。",
          relatedPromptId: prompt.id,
          relatedPromptText: prompt.promptText,
          relatedProductLine: prompt.productLine,
          relatedModel: query.model
        });
      }
    }

    for (const task of failedTasks) {
      suggestions.push({
        type: "failed_content_task",
        priority: HIGH_PRIORITY_THRESHOLD,
        title: `重试失败内容任务：${task.name}`,
        reason: "存在失败的 GEO 内容生成任务，可能导致提示词内容覆盖不足。",
        suggestedAction: "检查任务输入后重试，必要时补充知识库或调整指令模板。",
        relatedProductLine: task.productLine ?? undefined,
        relatedModel: task.targetModel ?? query.model
      });
    }

    return {
      items: sortOptimizationSuggestions(suggestions).slice(0, limit)
    };
  }

  async exportReport(query: ExportReportDto, context: ResourceAccessContext): Promise<string> {
    assertCanExportReports(context);
    let csv: string;

    switch (query.reportType) {
      case "geo_overview":
        csv = buildMetricCsv(await this.getGeoOverview(query, context));
        break;
      case "prompt_coverage":
        csv = buildMetricCsv(await this.getPromptCoverage(query, context));
        break;
      case "model_coverage":
        csv = buildMetricCsv(await this.getModelCoverage(query, context));
        break;
      case "content_coverage":
        csv = buildMetricCsv(await this.getContentCoverage(query, context));
        break;
      case "knowledge_coverage":
        csv = buildMetricCsv(await this.getKnowledgeCoverage(query, context));
        break;
      case "optimization_suggestions":
        csv = this.buildSuggestionsCsv(await this.getOptimizationSuggestions(query, context));
        break;
    }

    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-reports",
        action: "export",
        targetType: "geo_report",
        targetTitle: query.reportType,
        success: true,
        metadata: {
          reportType: query.reportType,
          productLine: query.productLine,
          from: query.from,
          to: query.to
        }
      },
      context
    );

    return csv;
  }

  private buildPromptWhere(
    query: PromptFilterQuery,
    context: ResourceAccessContext
  ): Prisma.GeoPromptWhereInput {
    const baseWhere: Prisma.GeoPromptWhereInput = {
      deletedAt: null,
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(query.promptType ? { type: query.promptType as GeoPromptType } : {}),
      ...(query.userIntent ? { userIntent: query.userIntent as UserIntent } : {}),
      ...(query.trackEnabled !== undefined ? { trackEnabled: query.trackEnabled } : {}),
      ...(query.priority !== undefined ? { priority: query.priority } : {})
    };

    return mergeAndWhere(baseWhere, buildReportPromptWhere(context));
  }

  private buildModelRecordWhere(
    query: ModelFilterQuery,
    context: ResourceAccessContext
  ): Prisma.ModelInclusionRecordWhereInput {
    const checkedAt = buildDateRangeFilter(query);

    const baseWhere: Prisma.ModelInclusionRecordWhereInput = {
      geoPrompt: {
        deletedAt: null,
        ...(query.productLine ? { productLine: query.productLine } : {}),
        ...(query.promptType ? { type: query.promptType as GeoPromptType } : {})
      },
      voidedAt: null,
      ...(query.model ? { model: query.model } : {}),
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.entryPoint ? { entryPoint: query.entryPoint } : {}),
      ...(checkedAt ? { checkedAt } : {})
    };

    return mergeAndWhere(
      baseWhere,
      buildReportOwnerWhere<Prisma.ModelInclusionRecordWhereInput>(context)
    );
  }

  private buildNestedModelRecordWhere(
    query: ModelFilterQuery,
    context: ResourceAccessContext
  ): Prisma.ModelInclusionRecordWhereInput {
    const checkedAt = buildDateRangeFilter(query);

    const baseWhere: Prisma.ModelInclusionRecordWhereInput = {
      voidedAt: null,
      ...(query.model ? { model: query.model } : {}),
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.entryPoint ? { entryPoint: query.entryPoint } : {}),
      ...(checkedAt ? { checkedAt } : {})
    };

    return mergeAndWhere(
      baseWhere,
      buildReportOwnerWhere<Prisma.ModelInclusionRecordWhereInput>(context)
    );
  }

  private buildContentTaskWhere(
    query: ContentFilterQuery,
    context: ResourceAccessContext
  ): Prisma.ContentTaskWhereInput {
    const createdAt = buildDateRangeFilter(query);

    const baseWhere: Prisma.ContentTaskWhereInput = {
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(query.generationType ? { generationType: query.generationType } : {}),
      ...(query.status ? { status: query.status as TaskStatus } : {}),
      ...(createdAt ? { createdAt } : {})
    };

    return mergeAndWhere(
      baseWhere,
      buildReportOwnerWhere<Prisma.ContentTaskWhereInput>(context)
    );
  }

  private buildContentItemWhere(
    query: ContentFilterQuery,
    context: ResourceAccessContext
  ): Prisma.ContentItemWhereInput {
    return {
      deletedAt: null,
      task: this.buildContentTaskWhere(query, context)
    };
  }

  private buildKnowledgeBaseWhere(
    query: ProductLineQuery & DateRangeQuery,
    context: ResourceAccessContext
  ) {
    const createdAt = buildDateRangeFilter(query);

    const baseWhere: Prisma.KnowledgeBaseWhereInput = {
      deletedAt: null,
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(createdAt ? { createdAt } : {})
    } satisfies Prisma.KnowledgeBaseWhereInput;

    return mergeAndWhere(baseWhere, buildReportKnowledgeWhere(context));
  }

  private buildKnowledgeFileWhere(
    query: ProductLineQuery & DateRangeQuery,
    context: ResourceAccessContext
  ) {
    const createdAt = buildDateRangeFilter(query);

    return {
      deletedAt: null,
      knowledgeBase: this.buildKnowledgeBaseWhere({ productLine: query.productLine }, context),
      ...(createdAt ? { createdAt } : {})
    } satisfies Prisma.KnowledgeFileWhereInput;
  }

  private buildKnowledgeChunkWhere(
    query: KnowledgeFilterQuery,
    context: ResourceAccessContext
  ) {
    const createdAt = buildDateRangeFilter(query);

    return {
      deletedAt: null,
      knowledgeBase: this.buildKnowledgeBaseWhere({ productLine: query.productLine }, context),
      ...(query.materialType ? { materialType: query.materialType } : {}),
      ...(createdAt ? { createdAt } : {})
    } satisfies Prisma.KnowledgeChunkWhereInput;
  }

  private buildGeoHitSummaryPromptWhere(
    query: GeoHitSummaryQuery,
    context: ResourceAccessContext
  ): Prisma.GeoPromptWhereInput {
    const baseWhere: Prisma.GeoPromptWhereInput = {
      deletedAt: null,
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(query.priority !== undefined ? { priority: query.priority } : {}),
      ...(query.trackEnabled !== undefined ? { trackEnabled: query.trackEnabled } : {})
    };

    return mergeAndWhere(baseWhere, buildReportPromptWhere(context));
  }

  private buildGeoHitSummaryRecordWhere(
    query: GeoHitSummaryQuery,
    context: ResourceAccessContext
  ): Prisma.ModelInclusionRecordWhereInput {
    const checkedAt = buildDateRangeFilter(query);

    const baseWhere: Prisma.ModelInclusionRecordWhereInput = {
      geoPrompt: this.buildGeoHitSummaryPromptWhere(query, context),
      voidedAt: null,
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.entryPoint ? { entryPoint: query.entryPoint } : {}),
      ...(checkedAt ? { checkedAt } : {})
    };

    return mergeAndWhere(
      baseWhere,
      buildReportOwnerWhere<Prisma.ModelInclusionRecordWhereInput>(context)
    );
  }

  private selectLatestGeoHitRecords(
    records: ModelInclusionRecordWithPrompt[]
  ): ModelInclusionRecordWithPrompt[] {
    const latestRecords = new Map<string, ModelInclusionRecordWithPrompt>();

    for (const record of records) {
      const key = this.buildGeoHitLatestKey(record);
      const existingRecord = latestRecords.get(key);

      if (!existingRecord || this.compareLatestRecord(record, existingRecord) < 0) {
        latestRecords.set(key, record);
      }
    }

    return [...latestRecords.values()];
  }

  private buildGeoHitLatestKey(record: ModelInclusionRecord): string {
    return [
      record.geoPromptId,
      record.platform ?? "未设置平台",
      record.entryPoint ?? "未设置入口"
    ].join("::");
  }

  private compareLatestRecord(left: ModelInclusionRecord, right: ModelInclusionRecord): number {
    return (
      right.checkedAt.getTime() - left.checkedAt.getTime() ||
      right.createdAt.getTime() - left.createdAt.getTime()
    );
  }

  private buildGeoHitComparison(
    records: ModelInclusionRecordWithPrompt[],
    key: "platform" | "entryPoint"
  ): GeoHitComparisonItem[] {
    const groupedRecords = records.reduce<Map<string, ModelInclusionRecordWithPrompt[]>>(
      (grouped, record) => {
        const groupKey = record[key] ?? (key === "platform" ? "未设置平台" : "未设置入口");
        const group = grouped.get(groupKey) ?? [];
        group.push(record);
        grouped.set(groupKey, group);
        return grouped;
      },
      new Map()
    );

    return [...groupedRecords.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([groupKey, group]) => ({
        ...(key === "platform" ? { platform: groupKey } : { entryPoint: groupKey }),
        recordCount: group.length,
        brandMentionRate: calculateRate(
          group.filter((record) => record.brandMentioned).length,
          group.length
        ),
        brandRecommendRate: calculateRate(
          group.filter((record) => record.brandRecommended).length,
          group.length
        ),
        notMentionedRate: calculateRate(
          group.filter((record) => this.isNotMentionedRecord(record)).length,
          group.length
        ),
        competitorMentionRate: calculateRate(
          group.filter((record) => record.competitorMentioned).length,
          group.length
        ),
        hitLevelDistribution: groupCount(group, (record) => this.resolveHitLevel(record), "unclear")
      }));
  }

  private buildGeoHitPromptMatrix(
    prompts: GeoPrompt[],
    records: ModelInclusionRecordWithPrompt[]
  ): GeoHitPromptMatrixItem[] {
    const recordsByPromptId = this.groupRecordsByPromptId(records);

    return prompts.map((prompt) => {
      const results = (recordsByPromptId.get(prompt.id) ?? [])
        .sort(this.compareGeoHitMatrixResults)
        .map((record) => this.toGeoHitPromptMatrixResult(record));

      return {
        geoPromptId: prompt.id,
        promptText: prompt.promptText,
        productLine: prompt.productLine ?? undefined,
        priority: prompt.priority,
        results,
        overallStatus: this.resolveGeoHitOverallStatus(results)
      };
    });
  }

  private compareGeoHitMatrixResults(
    left: ModelInclusionRecordWithPrompt,
    right: ModelInclusionRecordWithPrompt
  ): number {
    return (
      (left.platform ?? "").localeCompare(right.platform ?? "") ||
      (left.entryPoint ?? "").localeCompare(right.entryPoint ?? "")
    );
  }

  private toGeoHitPromptMatrixResult(
    record: ModelInclusionRecordWithPrompt
  ): GeoHitPromptMatrixResult {
    return {
      platform: record.platform ?? "未设置平台",
      entryPoint: record.entryPoint ?? "未设置入口",
      hitLevel: this.resolveHitLevel(record),
      brandMentioned: record.brandMentioned,
      brandRecommended: record.brandRecommended,
      citedOfficialSite: record.citedOfficialSite,
      competitorMentioned: record.competitorMentioned,
      checkedAt: record.checkedAt
    };
  }

  private resolveGeoHitOverallStatus(results: GeoHitPromptMatrixResult[]): GeoHitOverallStatus {
    if (results.length === 0) {
      return "unchecked";
    }

    if (results.every((result) => result.brandRecommended || result.hitLevel === "recommended")) {
      return "all_recommended";
    }

    if (results.every((result) => result.brandMentioned || result.brandRecommended)) {
      return "all_mentioned";
    }

    if (results.every((result) => this.isCompetitorOnlyResult(result))) {
      return "competitor_only";
    }

    if (results.every((result) => this.isNotMentionedResult(result))) {
      return "not_mentioned";
    }

    const unclearCount = results.filter((result) => result.hitLevel === "unclear").length;
    if (unclearCount > results.length / 2) {
      return "unclear";
    }

    const hitCount = results.filter((result) => this.isGeoHitResult(result)).length;
    if (hitCount > 0 && hitCount < results.length) {
      return "partial_hit";
    }

    if (hitCount > 0) {
      return "partial_hit";
    }

    return "unclear";
  }

  private buildGeoHitOptimizationSuggestions(
    promptMatrix: GeoHitPromptMatrixItem[]
  ): GeoHitOptimizationSuggestion[] {
    const suggestions: GeoHitOptimizationSuggestion[] = [];

    for (const item of promptMatrix) {
      if (this.isHighPriorityPrompt(item) && item.overallStatus === "not_mentioned") {
        suggestions.push({
          type: "not_mentioned",
          priority: "high",
          geoPromptId: item.geoPromptId,
          promptText: item.promptText,
          reason: "高优先级提示词在最新平台结果中均未提及品牌。",
          suggestedAction: "补充知识库事实资料，并围绕该问法生成官网、问答或选型内容资产。"
        });
      }

      const kimiResult = item.results.find((result) => result.platform.includes("Kimi"));
      const volcengineResult = item.results.find(
        (result) => result.platform.includes("豆包") || result.platform.includes("火山")
      );
      if (
        kimiResult &&
        volcengineResult &&
        !this.isGeoHitResult(kimiResult) &&
        this.isGeoHitResult(volcengineResult)
      ) {
        suggestions.push({
          type: "kimi_gap",
          priority: "medium",
          geoPromptId: item.geoPromptId,
          promptText: item.promptText,
          reason: "豆包 / 火山方向已有命中，但 Kimi 最新结果未命中。",
          suggestedAction: "针对 Kimi 方向补充更易被检索的外部内容、官网段落和品牌实体说明。"
        });
      }

      if (item.results.some((result) => result.brandMentioned && !result.brandRecommended)) {
        suggestions.push({
          type: "mentioned_not_recommended",
          priority: "medium",
          geoPromptId: item.geoPromptId,
          promptText: item.promptText,
          reason: "品牌已经被提及，但未形成推荐命中。",
          suggestedAction: "补充为什么选择该品牌、适用场景、参数边界和竞品对比内容。"
        });
      }

      if (item.results.some((result) => result.competitorMentioned && !result.brandMentioned)) {
        suggestions.push({
          type: "competitor_without_brand",
          priority: "high",
          geoPromptId: item.geoPromptId,
          promptText: item.promptText,
          reason: "竞品出现但目标品牌未出现，存在竞品占位。",
          suggestedAction: "围绕该提示词补充品牌内容，并记录出现的竞品供后续内容对比。"
        });
      }

      if (item.results.filter((result) => result.hitLevel === "unclear").length >= 2) {
        suggestions.push({
          type: "unclear_results",
          priority: "low",
          geoPromptId: item.geoPromptId,
          promptText: item.promptText,
          reason: "该提示词存在多条无法判断结果。",
          suggestedAction: "复测该提示词，或检查对应 Provider 的联网搜索稳定性和返回结构。"
        });
      }
    }

    return suggestions.slice(0, DEFAULT_SUGGESTION_LIMIT);
  }

  private isHighPriorityPrompt(prompt: { priority: number }): boolean {
    return prompt.priority >= HIGH_PRIORITY_THRESHOLD || prompt.priority <= 2;
  }

  private isGeoHitResult(result: GeoHitPromptMatrixResult): boolean {
    return (
      result.brandRecommended ||
      result.brandMentioned ||
      result.citedOfficialSite ||
      result.hitLevel === "recommended" ||
      result.hitLevel === "mentioned" ||
      result.hitLevel === "cited"
    );
  }

  private isCompetitorOnlyResult(result: GeoHitPromptMatrixResult): boolean {
    return (
      result.hitLevel === "competitor_only" ||
      (result.competitorMentioned && !result.brandMentioned)
    );
  }

  private isNotMentionedResult(result: GeoHitPromptMatrixResult): boolean {
    return result.hitLevel === "not_mentioned";
  }

  private isNotMentionedRecord(record: ModelInclusionRecord): boolean {
    return this.resolveHitLevel(record) === "not_mentioned";
  }

  private groupModelBooleanCount(
    records: ModelInclusionRecord[],
    key:
      | "brandMentioned"
      | "brandRecommended"
      | "citedOfficialSite"
      | "citedContentAsset"
      | "competitorMentioned"
  ): Record<string, number> {
    return records.reduce<Record<string, number>>((distribution, record) => {
      if (record[key]) {
        distribution[record.model] = (distribution[record.model] ?? 0) + 1;
      }

      return distribution;
    }, {});
  }

  private buildModelRates(
    countByModel: Record<string, number>,
    totalByModel: Record<string, number>
  ): Record<string, number> {
    return Object.entries(totalByModel).reduce<Record<string, number>>((rates, [model, total]) => {
      rates[model] = calculateRate(countByModel[model] ?? 0, total);
      return rates;
    }, {});
  }

  private compareRecommendedRecords(
    left: ModelInclusionRecordWithPrompt,
    right: ModelInclusionRecordWithPrompt
  ): number {
    const leftRanking = left.rankingPosition ?? Number.MAX_SAFE_INTEGER;
    const rightRanking = right.rankingPosition ?? Number.MAX_SAFE_INTEGER;

    return leftRanking - rightRanking || right.checkedAt.getTime() - left.checkedAt.getTime();
  }

  private groupRecordsByPromptId(
    records: ModelInclusionRecordWithPrompt[]
  ): Map<string, ModelInclusionRecordWithPrompt[]> {
    return records.reduce<Map<string, ModelInclusionRecordWithPrompt[]>>((grouped, record) => {
      const existingRecords = grouped.get(record.geoPromptId) ?? [];
      existingRecords.push(record);
      grouped.set(record.geoPromptId, existingRecords);
      return grouped;
    }, new Map());
  }

  private findProductLinesWithoutKnowledge(
    prompts: GeoPrompt[],
    knowledgeBases: KnowledgeBase[]
  ): string[] {
    const promptProductLines = new Set(
      prompts
        .map((prompt) => prompt.productLine)
        .filter((productLine): productLine is string => Boolean(productLine))
    );
    const knowledgeProductLines = new Set(
      knowledgeBases
        .map((knowledgeBase) => knowledgeBase.productLine)
        .filter((productLine): productLine is string => Boolean(productLine))
    );

    return [...promptProductLines]
      .filter((productLine) => !knowledgeProductLines.has(productLine))
      .sort((left, right) => left.localeCompare(right));
  }

  private toPromptSummary(prompt: GeoPrompt): ReportPromptSummary {
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

  private toModelCoveragePromptSummary(
    record: ModelInclusionRecordWithPrompt
  ): ModelCoveragePromptSummary {
    return {
      geoPromptId: record.geoPromptId,
      promptText: record.geoPrompt.promptText,
      type: record.geoPrompt.type,
      productLine: record.geoPrompt.productLine ?? undefined,
      userIntent: record.geoPrompt.userIntent,
      model: record.model,
      checkedAt: record.checkedAt,
      brandMentioned: record.brandMentioned,
      brandRecommended: record.brandRecommended,
      rankingPosition: record.rankingPosition,
      citedOfficialSite: record.citedOfficialSite,
      citedContentAsset: record.citedContentAsset,
      competitorMentioned: record.competitorMentioned,
      hitLevel: this.resolveHitLevel(record),
      platform: record.platform ?? undefined,
      entryPoint: record.entryPoint ?? undefined
    };
  }

  private resolveHitLevel(record: ModelInclusionRecord): string {
    return (
      record.hitLevel ??
      deriveHitLevel({
        brandMentioned: record.brandMentioned,
        brandRecommended: record.brandRecommended,
        citedOfficialSite: record.citedOfficialSite,
        citedContentAsset: record.citedContentAsset,
        competitorMentioned: record.competitorMentioned
      })
    );
  }

  private buildSuggestionsCsv(report: OptimizationSuggestionsReport): string {
    return buildRowsCsv(
      [
        "type",
        "priority",
        "title",
        "reason",
        "suggestedAction",
        "relatedPromptId",
        "relatedPromptText",
        "relatedProductLine",
        "relatedModel"
      ],
      report.items.map((item) => [
        item.type,
        item.priority,
        item.title,
        item.reason,
        item.suggestedAction,
        item.relatedPromptId,
        item.relatedPromptText,
        item.relatedProductLine,
        item.relatedModel
      ])
    );
  }
}
