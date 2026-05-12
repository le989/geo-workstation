import { Inject, Injectable } from "@nestjs/common";
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
import type { QueryGeoOverviewReportDto } from "./dto/query-geo-overview-report.dto";
import type { QueryKnowledgeCoverageReportDto } from "./dto/query-knowledge-coverage-report.dto";
import type { QueryModelCoverageReportDto } from "./dto/query-model-coverage-report.dto";
import type { QueryOptimizationSuggestionsDto } from "./dto/query-optimization-suggestions.dto";
import type { QueryPromptCoverageReportDto } from "./dto/query-prompt-coverage-report.dto";
import { PrismaService } from "../../prisma/prisma.service";
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
    promptType?: string;
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
  brandMentionRateByModel: Record<string, number>;
  brandRecommendRateByModel: Record<string, number>;
  topRecommendedPrompts: ModelCoveragePromptSummary[];
  notMentionedPrompts: ModelCoveragePromptSummary[];
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
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getGeoOverview(query: QueryGeoOverviewReportDto): Promise<GeoOverviewReport> {
    const promptWhere = this.buildPromptWhere(query);
    const recordWhere = this.buildModelRecordWhere(query);
    const assetQuery = {
      productLine: query.productLine
    };
    const contentTaskWhere = this.buildContentTaskWhere(assetQuery);
    const contentItemWhere = this.buildContentItemWhere(assetQuery);
    const knowledgeBaseWhere = this.buildKnowledgeBaseWhere(assetQuery);
    const knowledgeChunkWhere = this.buildKnowledgeChunkWhere(assetQuery);

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
            none: this.buildNestedModelRecordWhere(query)
          }
        }
      })
    ]);

    const promptTypeCounts = groupCount(prompts, (prompt) => prompt.type, "unknown");
    const totalRecords = modelRecords.length;
    const brandMentionedCount = modelRecords.filter((record) => record.brandMentioned).length;
    const brandRecommendedCount = modelRecords.filter((record) => record.brandRecommended).length;
    const citedOfficialSiteCount = modelRecords.filter((record) => record.citedOfficialSite).length;

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
      uncoveredTrackedPromptCount,
      failedContentTaskCount
    };
  }

  async getPromptCoverage(query: QueryPromptCoverageReportDto): Promise<PromptCoverageReport> {
    const promptWhere = this.buildPromptWhere(query);
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
      where: this.buildModelRecordWhere(query),
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

  async getModelCoverage(query: QueryModelCoverageReportDto): Promise<ModelCoverageReport> {
    const records = await this.prisma.modelInclusionRecord.findMany({
      where: this.buildModelRecordWhere(query),
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

    return {
      totalRecords: records.length,
      modelDistribution,
      mentionedByModel,
      recommendedByModel,
      citedOfficialSiteByModel,
      brandMentionRateByModel: this.buildModelRates(mentionedByModel, modelDistribution),
      brandRecommendRateByModel: this.buildModelRates(recommendedByModel, modelDistribution),
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

  async getContentCoverage(query: QueryContentCoverageReportDto): Promise<ContentCoverageReport> {
    const tasks = await this.prisma.contentTask.findMany({
      where: this.buildContentTaskWhere(query)
    });
    const contentItems = await this.prisma.contentItem.findMany({
      where: this.buildContentItemWhere(query),
      include: {
        task: true,
        geoPrompt: true
      }
    });
    const prompts = await this.prisma.geoPrompt.findMany({
      where: this.buildPromptWhere({
        productLine: query.productLine
      }),
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
    query: QueryKnowledgeCoverageReportDto
  ): Promise<KnowledgeCoverageReport> {
    const [knowledgeBases, knowledgeFiles, knowledgeChunks, prompts] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        where: this.buildKnowledgeBaseWhere(query)
      }),
      this.prisma.knowledgeFile.findMany({
        where: this.buildKnowledgeFileWhere(query),
        include: {
          knowledgeBase: true
        }
      }),
      this.prisma.knowledgeChunk.findMany({
        where: this.buildKnowledgeChunkWhere(query),
        include: {
          knowledgeBase: true
        }
      }),
      this.prisma.geoPrompt.findMany({
        where: this.buildPromptWhere({
          productLine: query.productLine
        })
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
    query: QueryOptimizationSuggestionsDto
  ): Promise<OptimizationSuggestionsReport> {
    const minPriority = query.priority ?? HIGH_PRIORITY_THRESHOLD;
    const limit = query.limit ?? DEFAULT_SUGGESTION_LIMIT;
    const [prompts, records, contentItems, knowledgeBases, failedTasks] = await Promise.all([
      this.prisma.geoPrompt.findMany({
        where: {
          ...this.buildPromptWhere({
            productLine: query.productLine
          }),
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
        where: this.buildModelRecordWhere(query),
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
          task: {
            ...(query.productLine ? { productLine: query.productLine } : {})
          },
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
        }),
        select: {
          productLine: true
        }
      }),
      this.prisma.contentTask.findMany({
        where: {
          ...(query.productLine ? { productLine: query.productLine } : {}),
          status: TaskStatus.failed
        },
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

  async exportReport(query: ExportReportDto): Promise<string> {
    switch (query.reportType) {
      case "geo_overview":
        return buildMetricCsv(await this.getGeoOverview(query));
      case "prompt_coverage":
        return buildMetricCsv(await this.getPromptCoverage(query));
      case "model_coverage":
        return buildMetricCsv(await this.getModelCoverage(query));
      case "content_coverage":
        return buildMetricCsv(await this.getContentCoverage(query));
      case "knowledge_coverage":
        return buildMetricCsv(await this.getKnowledgeCoverage(query));
      case "optimization_suggestions":
        return this.buildSuggestionsCsv(await this.getOptimizationSuggestions(query));
    }
  }

  private buildPromptWhere(query: PromptFilterQuery): Prisma.GeoPromptWhereInput {
    return {
      deletedAt: null,
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(query.promptType ? { type: query.promptType as GeoPromptType } : {}),
      ...(query.userIntent ? { userIntent: query.userIntent as UserIntent } : {}),
      ...(query.trackEnabled !== undefined ? { trackEnabled: query.trackEnabled } : {}),
      ...(query.priority !== undefined ? { priority: query.priority } : {})
    };
  }

  private buildModelRecordWhere(query: ModelFilterQuery): Prisma.ModelInclusionRecordWhereInput {
    const checkedAt = buildDateRangeFilter(query);

    return {
      geoPrompt: {
        deletedAt: null,
        ...(query.productLine ? { productLine: query.productLine } : {}),
        ...(query.promptType ? { type: query.promptType as GeoPromptType } : {})
      },
      ...(query.model ? { model: query.model } : {}),
      ...(checkedAt ? { checkedAt } : {})
    };
  }

  private buildNestedModelRecordWhere(
    query: ModelFilterQuery
  ): Prisma.ModelInclusionRecordWhereInput {
    const checkedAt = buildDateRangeFilter(query);

    return {
      ...(query.model ? { model: query.model } : {}),
      ...(checkedAt ? { checkedAt } : {})
    };
  }

  private buildContentTaskWhere(query: ContentFilterQuery): Prisma.ContentTaskWhereInput {
    const createdAt = buildDateRangeFilter(query);

    return {
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(query.generationType ? { generationType: query.generationType } : {}),
      ...(query.status ? { status: query.status as TaskStatus } : {}),
      ...(createdAt ? { createdAt } : {})
    };
  }

  private buildContentItemWhere(query: ContentFilterQuery): Prisma.ContentItemWhereInput {
    return {
      deletedAt: null,
      task: this.buildContentTaskWhere(query)
    };
  }

  private buildKnowledgeBaseWhere(query: ProductLineQuery & DateRangeQuery) {
    const createdAt = buildDateRangeFilter(query);

    return {
      deletedAt: null,
      ...(query.productLine ? { productLine: query.productLine } : {}),
      ...(createdAt ? { createdAt } : {})
    } satisfies Prisma.KnowledgeBaseWhereInput;
  }

  private buildKnowledgeFileWhere(query: ProductLineQuery & DateRangeQuery) {
    const createdAt = buildDateRangeFilter(query);

    return {
      deletedAt: null,
      knowledgeBase: {
        deletedAt: null,
        ...(query.productLine ? { productLine: query.productLine } : {})
      },
      ...(createdAt ? { createdAt } : {})
    } satisfies Prisma.KnowledgeFileWhereInput;
  }

  private buildKnowledgeChunkWhere(query: KnowledgeFilterQuery) {
    const createdAt = buildDateRangeFilter(query);

    return {
      deletedAt: null,
      knowledgeBase: {
        deletedAt: null,
        ...(query.productLine ? { productLine: query.productLine } : {})
      },
      ...(query.materialType ? { materialType: query.materialType } : {}),
      ...(createdAt ? { createdAt } : {})
    } satisfies Prisma.KnowledgeChunkWhereInput;
  }

  private groupModelBooleanCount(
    records: ModelInclusionRecord[],
    key: "brandMentioned" | "brandRecommended" | "citedOfficialSite"
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
      citedOfficialSite: record.citedOfficialSite
    };
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
