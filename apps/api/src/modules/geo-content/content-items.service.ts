import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AiCallStatus,
  Prisma,
  type ContentItem,
  type ContentTask,
  type GeoPrompt,
  type InstructionTemplate,
  type KnowledgeBase,
  type KnowledgeChunk,
  type KnowledgeFile
} from "@prisma/client";
import { AiProviderService } from "../ai/ai-provider.service";
import {
  isMockAiProvider,
  normalizeAiProvider,
  type GenerateTextResult
} from "../ai/ai-provider.interface";
import { assertMockProviderAllowed } from "../ai/ai-provider-policy";
import {
  ProjectProfileService,
  type ProjectProfileResponse
} from "../project-profile/project-profile.service";
import type { ContentQualityCheckDto } from "./dto/content-quality-check.dto";
import type { FormatContentItemForPublishDto } from "./dto/format-content-item-for-publish.dto";
import type { OptimizeContentItemForPublishDto } from "./dto/optimize-content-item-for-publish.dto";
import type { QueryContentItemsDto } from "./dto/query-content-items.dto";
import type { UpdateContentItemDto } from "./dto/update-content-item.dto";
import {
  buildContentItemPublishMarkdown,
  buildContentItemReviewMarkdown
} from "./utils/markdown-export.util";
import {
  cleanPlatformPublishBody,
  cleanPlatformPublishTitle,
  findEditorTonePublishTerms,
  findForbiddenInternalPublishTerms
} from "./utils/publish-cleanliness.util";
import {
  jsonStringArray,
  normalizeQueryContentItems,
  normalizeUpdateContentItem,
  type NormalizedQueryContentItems
} from "./utils/normalize-content-item";
import {
  buildFormattedPublishContent,
  type FormattedPublishContent
} from "./utils/publish-format.util";
import {
  buildArticlePublishPackageMarkdown,
  buildArticlePublishPackageText,
  generateArticlePublishPackage,
  toArticlePublishPackage,
  type ArticlePublishPackage,
  type ArticlePublishPackageEvidence
} from "./utils/article-publish-package.util";
import {
  findScopedContentKnowledgeChunks,
  normalizeContentKnowledgeScope
} from "./utils/content-knowledge-context.util";
import {
  buildQualityGateResult,
  type PublishStatus,
  type QualityGateResult,
  type QualityGateScopeSummary
} from "./utils/quality-gate.util";
import { PrismaService } from "../../prisma/prisma.service";
import {
  getCurrentCompanyId,
  type ResourceAccessContext
} from "../auth/auth-policy";
import {
  assertCanManageOwnerCompanyResource,
  buildOwnerCompanyReadWhere
} from "../auth/owner-company-policy";
import {
  AiCallLogsService,
  type RecordAiCallLogInput
} from "../usage/ai-call-logs.service";
import { AiUsageService } from "../usage/ai-usage.service";
import { OperationLogsService } from "../usage/operation-logs.service";
import { buildOfficialCitableKnowledgeFileWhere } from "../geo-knowledge/utils/official-citation.util";

export type GeneratedContentItemResponse = {
  id: string;
  companyId?: string;
  taskId: string;
  geoPromptId: string | null;
  title: string;
  body: string;
  geoOptimizationPoints: string[];
  suggestedPublishChannel?: string;
  status: string;
  publishStatus?: PublishStatus;
  qualityGateResult?: QualityGateResult;
  qualityCheckedAt?: Date;
  publishPackage?: ArticlePublishPackage;
  publishPackageGeneratedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GeneratedContentItemListResponse = {
  items: GeneratedContentItemResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type DeleteContentItemResponse = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: Date;
};

export type ContentQualityRiskType =
  | "unsupported_claim"
  | "parameter_risk"
  | "protocol_risk"
  | "certification_risk"
  | "over_marketing"
  | "brand_expression"
  | "geo_structure"
  | "knowledge_gap"
  | "publish_cleanliness";

export type ContentQualitySeverity = "low" | "medium" | "high";
export type ContentQualityLevel = "good" | "needs_review" | "risky";

export type ContentQualityRiskItem = {
  type: ContentQualityRiskType;
  severity: ContentQualitySeverity;
  text: string;
  reason: string;
  suggestion: string;
};

export type ContentQualityCheckResponse = {
  score: number;
  level: ContentQualityLevel;
  summary: string;
  riskItems: ContentQualityRiskItem[];
  positiveItems: string[];
  publishReadiness: {
    canPublish: boolean;
    needsHumanReview: boolean;
    suggestedAction: string;
  };
  publishStatus?: PublishStatus;
  qualityGateResult?: QualityGateResult;
  qualityCheckedAt?: Date;
};

export type ContentPublishOptimizationResponse = {
  title: string;
  body: string;
  changes: string[];
  warnings: string[];
};

export type ContentPublishFormatResponse = FormattedPublishContent;
export type PublishPackageExportFormat = "markdown" | "txt";
export type ContentItemExportType = "review" | "publish";
export type ContentItemExportFormat = "markdown" | "txt";

type ContentItemWithContext = ContentItem & {
  geoPrompt: GeoPrompt | null;
  task: ContentTask & {
    knowledgeBase: KnowledgeBase | null;
    instructionTemplate: InstructionTemplate | null;
  };
};

type ContentQualityContext = {
  item: ContentItemWithContext;
  knowledgeChunks: KnowledgeChunk[];
  projectProfile: ProjectProfileResponse | null;
};

const AI_QUALITY_PURPOSE = "content_quality_check";
const AI_OPTIMIZE_PURPOSE = "content_publish_optimization";
const AI_RELATED_TYPE = "content_item";

const UNSUPPORTED_FACT_RISK_RULES: Array<{
  type: ContentQualityRiskType;
  severity: ContentQualitySeverity;
  pattern: RegExp;
  label?: (value: string) => string;
  reason: string;
  suggestion: string;
}> = [
  {
    type: "protocol_risk",
    severity: "medium",
    pattern: /\bRS[-\s]?485\b/gi,
    label: () => "RS485",
    reason: "正文出现具体通信协议，但知识库未明确提供该协议依据。",
    suggestion: "改为“输出方式、通信接口等需结合具体型号资料确认”。"
  },
  {
    type: "protocol_risk",
    severity: "medium",
    pattern: /\bIO[-\s]?Link\b/gi,
    label: () => "IO-Link",
    reason: "正文出现具体通信协议，但知识库未明确提供该协议依据。",
    suggestion: "改为“输出方式、通信接口等需结合具体型号资料确认”。"
  },
  {
    type: "protocol_risk",
    severity: "medium",
    pattern: /\bM12\b/gi,
    reason: "正文出现具体接口或接插件表达，但知识库未明确提供该信息。",
    suggestion: "改为“接线方式、接口形式等需结合具体型号资料确认”。"
  },
  {
    type: "parameter_risk",
    severity: "medium",
    pattern: /\b4[-\s]?20\s*mA\b|\b0[-\s]?10\s*V\b/gi,
    reason: "正文出现具体模拟量输出规格，但知识库未明确提供该规格依据。",
    suggestion: "改为“开关量、模拟量等输出方式需结合具体型号资料确认”。"
  },
  {
    type: "certification_risk",
    severity: "medium",
    pattern: /\bCE\b|\bIP6[57]\b|Ex\s*(?:db|tb)\b|ZJEx\d+(?:\.\d+)?/gi,
    reason: "正文出现具体认证、防护等级或证书编号，需要知识库明确支持。",
    suggestion: "仅保留知识库明确提供的认证和防护等级；否则改为“需结合证书和型号资料确认”。"
  },
  {
    type: "parameter_risk",
    severity: "medium",
    pattern:
      /毫秒级|厘米级|微米级|精度\s*[±+-]?\s*\d+(?:\.\d+)?|响应时间\s*\d+(?:\.\d+)?|量程\s*\d+(?:\.\d+)?|测量距离\s*\d+(?:\.\d+)?/gi,
    reason: "正文出现具体精度、响应时间或量程表达，需要知识库明确支持。",
    suggestion: "改为“量程、精度、响应时间等需结合具体型号资料和现场工况确认”。"
  },
  {
    type: "unsupported_claim",
    severity: "high",
    pattern: /价格|报价|交期|库存|客户案例|成功案例/gi,
    reason: "正文出现价格、交期、库存或案例类表达，容易形成未经证实承诺。",
    suggestion: "删除该表述，或仅在知识库有明确事实来源时保留。"
  }
];

const OVER_MARKETING_PATTERN =
  /行业领先|最佳选择|一定适用|保证|100%|完全替代|最好|第一|绝对|永久|零风险/gi;

const RULE_RISK_FIX_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /行业领先|最佳选择|最好|最优|首选|必选/gi, replacement: "可结合资料评估" },
  { pattern: /保证|确保|绝对|100%|百分百|零风险|包解决/gi, replacement: "需结合现场和资料确认" },
  { pattern: /一定适用/gi, replacement: "适用性需结合现场确认" },
  { pattern: /完全替代/gi, replacement: "可结合场景评估替代方案" },
  { pattern: /第一|唯一/gi, replacement: "可选" },
  { pattern: /最低价|全网最低/gi, replacement: "价格需以实际报价为准" },
  { pattern: /永久/gi, replacement: "长期" },
  { pattern: /随着行业发展|在当今时代|在现代工业中/gi, replacement: "" },
  { pattern: /综上所述|总而言之/gi, replacement: "总体来看" },
  { pattern: /不可或缺|赋能|大大提升|显著提升|助力企业降本增效/gi, replacement: "有助于现场判断" }
];

@Injectable()
export class ContentItemsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AiProviderService)
    private readonly aiProviderService?: Pick<AiProviderService, "generateText">,
    @Inject(ProjectProfileService)
    private readonly projectProfileService?: Pick<ProjectProfileService, "getPromptContext">,
    @Optional()
    @Inject(AiUsageService)
    private readonly aiUsageService?: AiUsageService,
    @Optional()
    @Inject(OperationLogsService)
    private readonly operationLogsService?: OperationLogsService,
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
    @Optional()
    @Inject(AiCallLogsService)
    private readonly aiCallLogsService?: AiCallLogsService
  ) {}

  async findMany(
    query: QueryContentItemsDto,
    context?: ResourceAccessContext
  ): Promise<GeneratedContentItemListResponse> {
    const normalized = normalizeQueryContentItems(query);
    const where = this.buildWhere(normalized, context);

    const [items, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: {
          updatedAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.contentItem.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      total,
      page: normalized.page,
      pageSize: normalized.pageSize
    };
  }

  async update(
    id: string,
    input: UpdateContentItemDto,
    context?: ResourceAccessContext
  ): Promise<GeneratedContentItemResponse> {
    const existing = await this.findExistingContentItem(id, context);

    if (context) {
      assertCanManageOwnerCompanyResource(context, existing.task, "无权编辑当前 GEO 内容项");
    }

    if (existing.deletedAt) {
      throw new BadRequestException(`Deleted GEO content item cannot be updated: ${id}`);
    }

    const normalized = normalizeUpdateContentItem(input);
    const data: Prisma.ContentItemUpdateInput = {};

    if (normalized.title !== undefined) {
      data.title = normalized.title;
    }
    if (normalized.body !== undefined) {
      data.body = normalized.body;
    }
    if (normalized.geoOptimizationPoints !== undefined) {
      data.geoOptimizationPoints = normalized.geoOptimizationPoints as Prisma.InputJsonValue;
    }
    if (normalized.suggestedPublishChannel !== undefined) {
      data.suggestedPublishChannel = normalized.suggestedPublishChannel;
    }
    if (normalized.status !== undefined) {
      data.status = normalized.status;
    }

    const updated = await this.prisma.contentItem.update({
      where: {
        id
      },
      data
    });

    return this.toResponse(updated);
  }

  async softDelete(
    id: string,
    context?: ResourceAccessContext
  ): Promise<DeleteContentItemResponse> {
    const existing = await this.findExistingContentItem(id, context);

    if (context) {
      assertCanManageOwnerCompanyResource(context, existing.task, "无权删除当前 GEO 内容项");
    }

    if (existing.deletedAt) {
      return {
        id,
        deleted: true,
        alreadyDeleted: true,
        deletedAt: existing.deletedAt
      };
    }

    const deleted = await this.prisma.contentItem.update({
      where: {
        id
      },
      data: {
        deletedAt: new Date()
      }
    });

    return {
      id,
      deleted: true,
      alreadyDeleted: false,
      deletedAt: deleted.deletedAt ?? new Date()
    };
  }

  async exportMarkdown(id: string, context?: ResourceAccessContext): Promise<string> {
    return this.exportContentItem(id, { type: "review", format: "markdown" }, context);
  }

  async exportContentItem(
    id: string,
    options: { type: ContentItemExportType; format: ContentItemExportFormat },
    context?: ResourceAccessContext
  ): Promise<string> {
    const item = await this.prisma.contentItem.findFirst({
      where: {
        AND: [
          {
            id,
            deletedAt: null
          },
          ...(context ? [this.buildAccessWhere(context)] : [])
        ]
      },
      include: {
        geoPrompt: true,
        task: true
      }
    });

    if (!item) {
      throw new NotFoundException(`GEO content item not found: ${id}`);
    }

    if (context) {
      assertCanManageOwnerCompanyResource(context, item.task, "无权导出当前 GEO 内容项");
    }

    if (options.type === "review" && options.format !== "markdown") {
      throw new BadRequestException("内部评审稿仅支持 Markdown 导出。");
    }

    const markdown =
      options.type === "publish"
        ? buildContentItemPublishMarkdown({
            title: item.title,
            body: item.body,
            faqs: toArticlePublishPackage(item.publishPackage)?.faqs,
            keywords: [
              ...(toArticlePublishPackage(item.publishPackage)?.keywords.primaryKeywords ?? []),
              ...(toArticlePublishPackage(item.publishPackage)?.keywords.platformTags ?? [])
            ],
            evidenceNotes: this.buildPublishMarkdownEvidenceNotes(item)
          })
        : buildContentItemReviewMarkdown({
            title: item.title,
            body: item.body,
            taskInfo: {
              taskName: item.task.name,
              targetPrompt: item.geoPrompt?.promptText ?? "未关联 GEO 提示词",
              scopeSummary: this.buildTaskScopeSummary(item.task)
            },
            qualityGateSummary: this.buildQualityGateSummary(item),
            publishPackageMarkdown: this.buildSavedPublishPackageMarkdown(item),
            manualReviewItems: ["发布前请人工核对参数、资料依据和平台规则。"]
          });
    const exportedText =
      options.format === "txt"
        ? markdown
            .replace(/^#{1,6}\s*/gm, "")
            .replace(/^\s*[-*]\s*/gm, "")
            .replace(/^\d+\.\s*/gm, "")
        : markdown;
    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-content",
        action: options.type === "publish" ? "export_publish_markdown" : "export_review_markdown",
        targetType: "content_item",
        targetId: item.id,
        targetTitle: item.title,
        success: true,
        metadata: {
          taskId: item.taskId,
          type: options.type,
          format: options.format
        }
      },
      context
    );

    return exportedText;
  }

  async generatePublishPackage(
    id: string,
    context?: ResourceAccessContext
  ): Promise<GeneratedContentItemResponse> {
    const qualityContext = await this.loadQualityContext(id, context);

    if (!qualityContext.item.body.trim()) {
      throw new BadRequestException("内容项正文为空，无法生成发布包。");
    }

    const generatedAt = new Date();
    const evidence = await this.buildPublishPackageEvidence(qualityContext, context);
    const publishPackage = generateArticlePublishPackage({
      title: qualityContext.item.title,
      body: qualityContext.item.body,
      productLineName: qualityContext.item.task.productLine ?? undefined,
      promptText: qualityContext.item.geoPrompt?.promptText ?? undefined,
      suggestedPublishChannel: qualityContext.item.suggestedPublishChannel ?? undefined,
      publishStatus: qualityContext.item.publishStatus as PublishStatus | undefined,
      qualityGateResult: toQualityGateResult(qualityContext.item.qualityGateResult),
      evidence
    });

    const updated = await this.prisma.contentItem.update({
      where: {
        id: qualityContext.item.id
      },
      data: {
        publishPackage: publishPackage as Prisma.InputJsonValue,
        publishPackageGeneratedAt: generatedAt
      }
    });

    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-content",
        action: "generate_publish_package",
        targetType: "content_item",
        targetId: updated.id,
        targetTitle: updated.title,
        success: true,
        metadata: {
          taskId: updated.taskId,
          evidenceCount: publishPackage.evidence.length
        }
      },
      context
    );

    return this.toResponse(updated);
  }

  async exportPublishPackage(
    id: string,
    format: PublishPackageExportFormat,
    context?: ResourceAccessContext
  ): Promise<string> {
    const item = await this.findExistingContentItem(id, context);

    if (context) {
      assertCanManageOwnerCompanyResource(context, item.task, "无权导出当前 GEO 内容项发布包");
    }

    if (item.deletedAt) {
      throw new NotFoundException(`GEO content item not found: ${id}`);
    }

    const publishPackage = toArticlePublishPackage(item.publishPackage);

    if (!publishPackage) {
      throw new BadRequestException("请先生成发布包，再导出发布包内容。");
    }

    const payload = {
      title: item.title,
      publishStatus: item.publishStatus as PublishStatus | undefined,
      publishPackage,
      generatedAt: item.publishPackageGeneratedAt
    };

    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-content",
        action: "export_publish_package",
        targetType: "content_item",
        targetId: item.id,
        targetTitle: item.title,
        success: true,
        metadata: {
          taskId: item.taskId,
          format
        }
      },
      context
    );

    return format === "txt"
      ? buildArticlePublishPackageText(payload)
      : buildArticlePublishPackageMarkdown(payload);
  }

  async formatForPublish(
    id: string,
    input: FormatContentItemForPublishDto,
    context?: ResourceAccessContext
  ): Promise<ContentPublishFormatResponse> {
    const qualityContext = await this.loadQualityContext(id, context);
    const sourceType = input.sourceType ?? "original";
    const formatStyle = input.formatStyle ?? "general";
    const title =
      sourceType === "optimized"
        ? (input.optimizedTitle ?? qualityContext.item.title)
        : qualityContext.item.title;
    const body = sourceType === "optimized" ? input.optimizedBody : qualityContext.item.body;

    if (!body?.trim()) {
      throw new BadRequestException(
        sourceType === "optimized"
          ? "生成发布稿排版需要传入发布优化版正文。"
          : "内容项正文为空，无法生成发布稿排版。"
      );
    }

    return buildFormattedPublishContent({
      title,
      body,
      style: formatStyle,
      includeGeoNotes: input.includeGeoNotes ?? true,
      includeWarnings: input.includeWarnings ?? true
    });
  }

  private buildPublishMarkdownEvidenceNotes(item: ContentItem & { task: ContentTask }): string[] {
    const publishPackage = toArticlePublishPackage(item.publishPackage);

    return (publishPackage?.evidence ?? [])
      .map((evidence) =>
        [
          evidence.knowledgeBaseName ? `知识库：${evidence.knowledgeBaseName}` : undefined,
          evidence.fileName ? `资料：${evidence.fileName}` : undefined,
          evidence.productLineName ? `产品线：${evidence.productLineName}` : undefined,
          evidence.scopeType ? `范围：${evidence.scopeType}` : undefined,
          evidence.sourceNote ? `说明：${evidence.sourceNote}` : undefined
        ]
          .filter(Boolean)
          .join("；")
      )
      .filter((line) => line.length > 0);
  }

  private buildSavedPublishPackageMarkdown(item: ContentItem & { task: ContentTask }): string | undefined {
    const publishPackage = toArticlePublishPackage(item.publishPackage);

    if (!publishPackage) {
      return undefined;
    }

    return buildArticlePublishPackageMarkdown({
      title: item.title,
      publishStatus: item.publishStatus as PublishStatus | undefined,
      publishPackage,
      generatedAt: item.publishPackageGeneratedAt
    });
  }

  private buildQualityGateSummary(item: ContentItem): string[] {
    const qualityGateResult = toQualityGateResult(item.qualityGateResult);

    if (!qualityGateResult) {
      return [];
    }

    return [
      `发布状态：${qualityGateResult.publishStatus}`,
      `质量分数：${qualityGateResult.score}`,
      `风险项：${qualityGateResult.riskItems.length} 项`,
      `人工确认项：${qualityGateResult.manualReviewItems.length} 项`
    ];
  }

  private buildTaskScopeSummary(task: ContentTask): string {
    try {
      const scope = normalizeContentKnowledgeScope(task.knowledgeScope);

      if (scope.type === "selected_files") {
        return `指定资料：${scope.selectedKnowledgeFileIds.length} 份`;
      }

      if (scope.type === "product_line") {
        return "按产品线";
      }

      return "全部资料";
    } catch {
      // 历史任务的范围字段可能不完整，导出时提示人工核对，避免把错误字段原样带给发布稿。
      return "资料范围需人工核对";
    }
  }

  async qualityCheck(
    id: string,
    input: ContentQualityCheckDto,
    context?: ResourceAccessContext
  ): Promise<ContentQualityCheckResponse> {
    const qualityContext = await this.loadQualityContext(id, context);
    const ruleResult = this.buildRuleQualityCheck(qualityContext);
    const provider = normalizeAiProvider(input.provider);
    assertMockProviderAllowed(this.configService, provider, "GEO 内容质检");

    if (isMockAiProvider(provider)) {
      await this.recordContentItemAiUsage(
        "quality_check",
        provider,
        input.model,
        true,
        true,
        qualityContext,
        context
      );
      const persistedQualityResult = await this.persistQualityGateResult(
        qualityContext,
        ruleResult,
        provider,
        input.model ?? "mock-content-v1"
      );
      await this.recordContentArticleOperation(
        "geo_content.article.quality_checked",
        qualityContext,
        persistedQualityResult,
        context,
        true
      );

      return persistedQualityResult;
    }

    const aiStartedAt = Date.now();

    try {
      const aiResult = await this.runAiQualityCheck(qualityContext, input, ruleResult);
      const qualityResult = aiResult.qualityResult ?? ruleResult;
      await this.recordContentItemAiUsage(
        "quality_check",
        aiResult.usage.provider,
        aiResult.usage.model,
        false,
        true,
        qualityContext,
        context,
        undefined,
        aiResult.usage,
        Date.now() - aiStartedAt
      );
      const persistedQualityResult = await this.persistQualityGateResult(
        qualityContext,
        qualityResult,
        aiResult.usage.provider,
        aiResult.usage.model
      );
      await this.recordContentArticleOperation(
        "geo_content.article.quality_checked",
        qualityContext,
        persistedQualityResult,
        context,
        true
      );

      return persistedQualityResult;
    } catch (error) {
      await this.recordContentItemAiUsage(
        "quality_check",
        provider,
        input.model,
        false,
        false,
        qualityContext,
        context,
        error,
        undefined,
        Date.now() - aiStartedAt
      );
      await this.recordContentArticleOperation(
        "geo_content.article.quality_checked",
        qualityContext,
        ruleResult,
        context,
        false,
        error
      );
      throw error;
    }
  }

  private async persistQualityGateResult(
    context: ContentQualityContext,
    qualityResult: ContentQualityCheckResponse,
    provider: string,
    model?: string
  ): Promise<ContentQualityCheckResponse> {
    const checkedAt = new Date();
    const qualityGateResult = buildQualityGateResult({
      qualityResult,
      title: context.item.title,
      body: context.item.body,
      publishContent: this.buildPublishCheckText(context),
      provider,
      model,
      checkedAt,
      scopeSummary: this.buildQualityGateScopeSummary(context.item.task)
    });
    const updated = await this.prisma.contentItem.update({
      where: {
        id: context.item.id
      },
      data: {
        publishStatus: qualityGateResult.publishStatus,
        qualityGateResult: qualityGateResult as Prisma.InputJsonValue,
        qualityCheckedAt: checkedAt
      }
    });

    return {
      ...qualityResult,
      publishStatus: qualityGateResult.publishStatus,
      qualityGateResult,
      qualityCheckedAt: updated.qualityCheckedAt ?? checkedAt
    };
  }

  private buildQualityGateScopeSummary(
    task: ContentTask & {
      knowledgeBase: KnowledgeBase | null;
      instructionTemplate: InstructionTemplate | null;
    }
  ): QualityGateScopeSummary {
    const scope = normalizeContentKnowledgeScope(task.knowledgeScope);

    if (scope.type === "selected_files") {
      return {
        knowledgeBaseId: task.knowledgeBaseId,
        scopeType: scope.type,
        selectedFileCount: scope.selectedKnowledgeFileIds.length,
        productLineId: task.productLineId
      };
    }

    if (scope.type === "product_line") {
      return {
        knowledgeBaseId: task.knowledgeBaseId,
        scopeType: scope.type,
        selectedFileCount: 0,
        productLineId: scope.productLineId
      };
    }

    return {
      knowledgeBaseId: task.knowledgeBaseId,
      scopeType: "all",
      selectedFileCount: 0,
      productLineId: task.productLineId
    };
  }

  async fixRiskWordsAndRecheck(
    id: string,
    context?: ResourceAccessContext
  ): Promise<GeneratedContentItemResponse> {
    const qualityContext = await this.loadQualityContext(id, context);
    const fixedText = this.applyRuleRiskFixes({
      title: qualityContext.item.title,
      body: qualityContext.item.body
    });

    if (!fixedText.changed) {
      throw new BadRequestException("未发现可自动修复的风险词，请人工检查文章。");
    }

    // 规则型修复只替换风险表达，不调用 AI，也不新增知识库没有的产品事实。
    const updated = await this.prisma.contentItem.update({
      where: {
        id: qualityContext.item.id
      },
      data: {
        title: fixedText.title,
        body: fixedText.body
      }
    });
    const updatedContext: ContentQualityContext = {
      ...qualityContext,
      item: {
        ...qualityContext.item,
        ...updated
      }
    };
    const ruleResult = this.buildRuleQualityCheck(updatedContext);
    await this.persistQualityGateResult(
      updatedContext,
      ruleResult,
      "rule_fix",
      "risk-word-fix-v1"
    );
    const persisted = await this.prisma.contentItem.findUniqueOrThrow({
      where: {
        id: qualityContext.item.id
      }
    });

    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-content",
        action: "rule_fix_risk_words",
        targetType: "content_item",
        targetId: persisted.id,
        targetTitle: persisted.title,
        success: true,
        metadata: {
          changed: true
        }
      },
      context
    );

    return this.toResponse(persisted);
  }

  async optimizeForPublish(
    id: string,
    input: OptimizeContentItemForPublishDto,
    context?: ResourceAccessContext
  ): Promise<ContentPublishOptimizationResponse> {
    const qualityContext = await this.loadQualityContext(id, context);
    const provider = normalizeAiProvider(input.provider);
    assertMockProviderAllowed(this.configService, provider, "GEO 发布优化");
    const qualityResult = this.buildRuleQualityCheck(qualityContext);

    if (isMockAiProvider(provider)) {
      await this.recordContentItemAiUsage(
        "optimize_for_publish",
        provider,
        input.model,
        true,
        true,
        qualityContext,
        context
      );
      const optimizationResult = this.buildMockPublishOptimization(qualityContext, input, qualityResult);
      await this.recordContentArticleOperation(
        "geo_content.article.optimized",
        qualityContext,
        qualityResult,
        context,
        true,
        undefined,
        optimizationResult
      );

      return optimizationResult;
    }

    const aiStartedAt = Date.now();

    try {
      const result = await this.requireAiProviderService().generateText({
        provider,
        model: input.model,
        purpose: AI_OPTIMIZE_PURPOSE,
        relatedType: AI_RELATED_TYPE,
        relatedId: id,
        temperature: 0.35,
        maxTokens: 2600,
        systemPrompt:
          "你是 GEO 内容发布稿审校专家。请只基于原文、知识库事实和质量检查结果做稳妥改写，不要新增事实，只输出 JSON。",
        userPrompt: this.buildPublishOptimizationPrompt(qualityContext, input, qualityResult)
      });
      await this.recordContentItemAiUsage(
        "optimize_for_publish",
        result.provider,
        result.model,
        false,
        true,
        qualityContext,
        context,
        undefined,
        result,
        Date.now() - aiStartedAt
      );

      const optimizationResult = this.parsePublishOptimizationResult(result, qualityContext, qualityResult);
      await this.recordContentArticleOperation(
        "geo_content.article.optimized",
        qualityContext,
        qualityResult,
        context,
        true,
        undefined,
        optimizationResult
      );

      return optimizationResult;
    } catch (error) {
      await this.recordContentItemAiUsage(
        "optimize_for_publish",
        provider,
        input.model,
        false,
        false,
        qualityContext,
        context,
        error,
        undefined,
        Date.now() - aiStartedAt
      );
      await this.recordContentArticleOperation(
        "geo_content.article.optimized",
        qualityContext,
        qualityResult,
        context,
        false,
        error
      );
      throw error;
    }
  }

  private async recordContentArticleOperation(
    action: "geo_content.article.quality_checked" | "geo_content.article.optimized",
    qualityContext: ContentQualityContext,
    qualityResult: ContentQualityCheckResponse,
    context: ResourceAccessContext | undefined,
    success: boolean,
    error?: unknown,
    optimizationResult?: ContentPublishOptimizationResponse
  ): Promise<void> {
    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-content",
        action,
        targetType: "content_item",
        targetId: qualityContext.item.id,
        targetTitle: qualityContext.item.title,
        success,
        errorMessage: error,
        metadata: this.buildContentArticleAuditMetadata(
          qualityContext,
          qualityResult,
          optimizationResult
        )
      },
      context
    );
  }

  private buildContentArticleAuditMetadata(
    qualityContext: ContentQualityContext,
    qualityResult: ContentQualityCheckResponse,
    optimizationResult?: ContentPublishOptimizationResponse
  ): Record<string, unknown> {
    const optimizedBody = optimizationResult?.body;

    // 只写质量分、风险数量、证据数量等安全摘要，不写正文、prompt 或 AI response。
    return {
      taskId: qualityContext.item.taskId,
      contentItemId: qualityContext.item.id,
      qualityGrade: qualityResult.level,
      riskCount: qualityResult.riskItems.length,
      fixedCount: optimizationResult?.changes.length,
      evidenceCount: qualityContext.knowledgeChunks.length,
      wordCountRange: this.buildWordCountRange(
        optimizedBody?.length ? optimizedBody : qualityContext.item.body
      ),
      hasFaq: this.hasFaqSection(optimizedBody ?? qualityContext.item.body),
      hasEvidence: qualityContext.knowledgeChunks.length > 0
    };
  }

  private buildWordCountRange(text: string): string {
    const length = text.trim().length;

    if (length <= 500) {
      return "0-500";
    }
    if (length <= 1000) {
      return "501-1000";
    }
    if (length <= 2000) {
      return "1001-2000";
    }

    return "2000+";
  }

  private hasFaqSection(text: string): boolean {
    return /常见问题|FAQ|问答|Q[:：]/i.test(text);
  }

  private async recordContentItemAiUsage(
    action: "quality_check" | "optimize_for_publish",
    provider: string,
    model: string | undefined,
    isMock: boolean,
    success: boolean,
    qualityContext: ContentQualityContext,
    accessContext?: ResourceAccessContext,
    error?: unknown,
    usage?: GenerateTextResult,
    latencyMs?: number
  ): Promise<void> {
    const promptTokens = isMock ? 0 : usage?.tokenInput;
    const completionTokens = isMock ? 0 : usage?.tokenOutput;

    await this.recordAiCallLog(
      {
        provider,
        model: usage?.model ?? model ?? "configured-default",
        purpose: action === "quality_check" ? AI_QUALITY_PURPOSE : AI_OPTIMIZE_PURPOSE,
        relatedType: AI_RELATED_TYPE,
        relatedId: qualityContext.item.id,
        tokenInput: promptTokens,
        tokenOutput: completionTokens,
        costEstimate: 0,
        status: success ? AiCallStatus.succeeded : AiCallStatus.failed
      },
      accessContext
    );
    await this.aiUsageService?.recordUsage(
      {
        moduleKey: "geo-content",
        action,
        provider,
        model: usage?.model ?? model ?? null,
        isMock,
        promptTokens,
        completionTokens,
        totalTokens:
          isMock || usage
            ? (usage?.tokenInput ?? 0) + (usage?.tokenOutput ?? 0)
            : undefined,
        requestCount: 1,
        success,
        errorMessage: error,
        latencyMs,
        providerReturnedUsage:
          isMock || usage === undefined
            ? undefined
            : usage.tokenInput !== undefined || usage.tokenOutput !== undefined,
        usageUnknown:
          isMock || usage === undefined
            ? undefined
            : usage.tokenInput === undefined && usage.tokenOutput === undefined,
        metadata: {
          contentItemId: qualityContext.item.id,
          taskId: qualityContext.item.taskId
        }
      },
      accessContext
    );
  }

  private async recordAiCallLog(
    input: RecordAiCallLogInput,
    context?: ResourceAccessContext
  ): Promise<void> {
    const aiCallLogsService = this.aiCallLogsService ?? new AiCallLogsService(this.prisma);

    await aiCallLogsService.recordAiCallLog(input, context);
  }

  private async loadQualityContext(
    id: string,
    context?: ResourceAccessContext
  ): Promise<ContentQualityContext> {
    const item = await this.prisma.contentItem.findFirst({
      where: {
        AND: [
          {
            id,
            deletedAt: null
          },
          ...(context ? [this.buildAccessWhere(context)] : [])
        ]
      },
      include: {
        geoPrompt: true,
        task: {
          include: {
            knowledgeBase: true,
            instructionTemplate: true
          }
        }
      }
    });

    if (!item) {
      throw new NotFoundException(`GEO content item not found: ${id}`);
    }

    if (context) {
      assertCanManageOwnerCompanyResource(context, item.task, "无权操作当前 GEO 内容项");
    }

    const knowledgeChunks = item.task.knowledgeBaseId
      ? await findScopedContentKnowledgeChunks({
          prisma: this.prisma,
          task: item.task,
          context,
          take: 12
        })
      : [];
    const projectProfile = (await this.projectProfileService?.getPromptContext(context)) ?? null;

    return {
      item,
      knowledgeChunks,
      projectProfile
    };
  }

  private async buildPublishPackageEvidence(
    context: ContentQualityContext,
    accessContext?: ResourceAccessContext
  ): Promise<ArticlePublishPackageEvidence[]> {
    const task = context.item.task;
    const knowledgeBaseId = task.knowledgeBaseId;

    if (!knowledgeBaseId || context.knowledgeChunks.length === 0) {
      return [];
    }

    const scope = normalizeContentKnowledgeScope(task.knowledgeScope);
    const companyId = accessContext ? getCurrentCompanyId(accessContext) : task.companyId ?? undefined;
    const fileIds = [
      ...new Set(
        context.knowledgeChunks
          .map((chunk) => chunk.fileId)
          .filter((fileId): fileId is string => Boolean(fileId))
      )
    ];

    if (fileIds.length === 0) {
      return [];
    }

    // 发布包资料依据只来自当前任务实际可引用片段，避免把同库其他资料误展示为来源。
    const files = await this.prisma.knowledgeFile.findMany({
      where: buildOfficialCitableKnowledgeFileWhere({
        id: {
          in: fileIds
        },
        knowledgeBaseId,
        ...(companyId
          ? {
              companyId
            }
          : {})
      }),
      orderBy: {
        updatedAt: "desc"
      }
    });

    const selectedFileIdSet =
      scope.type === "selected_files" ? new Set(scope.selectedKnowledgeFileIds) : null;
    const fileChunkCounts = this.countChunksByFileId(context.knowledgeChunks);

    return files
      .filter((file) => (selectedFileIdSet ? selectedFileIdSet.has(file.id) : true))
      .map((file) =>
        this.toPublishPackageEvidence(file, {
          knowledgeBaseName: task.knowledgeBase?.name,
          productLineName: task.productLine ?? undefined,
          scopeType: scope.type,
          chunkCount: fileChunkCounts.get(file.id) ?? 0
        })
      );
  }

  private countChunksByFileId(chunks: KnowledgeChunk[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const chunk of chunks) {
      if (!chunk.fileId) {
        continue;
      }

      counts.set(chunk.fileId, (counts.get(chunk.fileId) ?? 0) + 1);
    }

    return counts;
  }

  private toPublishPackageEvidence(
    file: KnowledgeFile,
    input: {
      knowledgeBaseName?: string;
      productLineName?: string;
      scopeType: string;
      chunkCount: number;
    }
  ): ArticlePublishPackageEvidence {
    return {
      knowledgeBaseName: input.knowledgeBaseName,
      fileName: file.title ?? file.fileName,
      productLineName: input.productLineName,
      scopeType: input.scopeType,
      sourceNote:
        input.chunkCount > 0
          ? `来自当前资料范围内 ${input.chunkCount} 个可引用知识片段`
          : "来自当前资料范围内的可引用资料"
    };
  }

  private applyRuleRiskFixes(input: { title: string; body: string }): {
    title: string;
    body: string;
    changed: boolean;
  } {
    let title = input.title;
    let body = input.body;

    for (const rule of RULE_RISK_FIX_REPLACEMENTS) {
      title = title.replace(rule.pattern, rule.replacement);
      body = body.replace(rule.pattern, rule.replacement);
    }

    const cleanedTitle = this.cleanupFixedText(cleanPlatformPublishTitle(title));
    const cleanedBody = this.cleanupFixedText(cleanPlatformPublishBody(body));

    return {
      title: cleanedTitle,
      body: cleanedBody,
      changed: cleanedTitle !== input.title || cleanedBody !== input.body
    };
  }

  private cleanupFixedText(value: string): string {
    return value
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/，\s*，/g, "，")
      .replace(/。\s*。/g, "。")
      .trim();
  }

  private buildRuleQualityCheck(context: ContentQualityContext): ContentQualityCheckResponse {
    const riskItems: ContentQualityRiskItem[] = [];
    const positiveItems: string[] = [];
    const body = context.item.body;
    const knowledgeText = this.buildKnowledgeText(context.knowledgeChunks);
    const publishText = this.buildPublishCheckText(context);

    for (const rule of UNSUPPORTED_FACT_RISK_RULES) {
      for (const match of body.matchAll(rule.pattern)) {
        const matchedText = match[0]?.trim();

        if (!matchedText) {
          continue;
        }

        const displayText = rule.label ? rule.label(matchedText) : matchedText;

        if (this.isTermSupportedByKnowledge(displayText, knowledgeText)) {
          continue;
        }

        this.addUniqueRisk(riskItems, {
          type: rule.type,
          severity: rule.severity,
          text: displayText,
          reason: rule.reason,
          suggestion: rule.suggestion
        });
      }
    }

    for (const match of body.matchAll(OVER_MARKETING_PATTERN)) {
      const matchedText = match[0]?.trim();

      if (!matchedText) {
        continue;
      }

      this.addUniqueRisk(riskItems, {
        type: "over_marketing",
        severity: "high",
        text: matchedText,
        reason: "正文出现夸张营销或确定性承诺，发布前需要弱化。",
        suggestion: "改为谨慎表达，例如“可结合相关资料进一步确认”，避免承诺效果、适用性或市场地位。"
      });
    }

    this.addBrandExpressionRisks(context, riskItems);
    this.addStructureRisksAndPositives(context, riskItems, positiveItems);
    this.addPublishCleanlinessRisks(
      [context.item.title, body, publishText].join("\n"),
      riskItems
    );

    if (context.knowledgeChunks.length === 0) {
      this.addUniqueRisk(riskItems, {
        type: "knowledge_gap",
        severity: "medium",
        text: "缺少知识库上下文",
        reason: "当前内容项未关联可用于事实对照的知识片段，参数和品牌资料更需要人工复核。",
        suggestion: "发布前补充知识库资料，或人工核对正文中的产品、服务、案例和承诺信息。"
      });
    } else {
      positiveItems.push("已关联知识库事实资料");
    }

    const score = this.calculateQualityScore(riskItems);
    const level = this.resolveQualityLevel(score, riskItems);
    const suggestedAction =
      level === "good" ? "可发布" : level === "needs_review" ? "建议人工修改" : "暂不建议发布";

    return {
      score,
      level,
      summary: this.buildQualitySummary(score, level, riskItems),
      riskItems,
      positiveItems: [...new Set(positiveItems)],
      publishReadiness: {
        canPublish: level === "good",
        needsHumanReview: level !== "good" || riskItems.length > 0,
        suggestedAction
      }
    };
  }

  private async runAiQualityCheck(
    context: ContentQualityContext,
    input: ContentQualityCheckDto,
    ruleResult: ContentQualityCheckResponse
  ): Promise<{ qualityResult: ContentQualityCheckResponse | null; usage: GenerateTextResult }> {
    const result = await this.requireAiProviderService().generateText({
      provider: normalizeAiProvider(input.provider),
      model: input.model,
      purpose: AI_QUALITY_PURPOSE,
      relatedType: AI_RELATED_TYPE,
      relatedId: context.item.id,
      temperature: 0.2,
      maxTokens: 1800,
      systemPrompt: "你是 GEO 内容质量审校专家。请检查事实边界、品牌表达和 GEO 结构，只输出 JSON。",
      userPrompt: this.buildQualityCheckPrompt(context, input, ruleResult)
    });

    return {
      qualityResult: this.parseQualityCheckResult(result, ruleResult),
      usage: result
    };
  }

  private buildQualityCheckPrompt(
    context: ContentQualityContext,
    input: ContentQualityCheckDto,
    ruleResult: ContentQualityCheckResponse
  ): string {
    return [
      `检查模式：${input.checkMode ?? "standard"}`,
      `内容标题：${context.item.title}`,
      `目标提示词：${context.item.geoPrompt?.promptText ?? "未关联"}`,
      `产品线 / 项目方向：${context.item.task.productLine ?? "未指定"}`,
      "",
      "项目档案：",
      this.buildProjectProfileContext(context.projectProfile),
      "",
      "知识库事实：",
      this.buildKnowledgeContext(context.knowledgeChunks),
      "",
      "指令模板：",
      this.buildInstructionContext(context.item.task.instructionTemplate),
      "",
      "规则检查初步结果：",
      JSON.stringify(ruleResult, null, 2),
      "",
      "待检查正文：",
      context.item.body,
      "",
      "请返回 JSON，不要返回 Markdown 代码块：",
      '{ "score": 0, "level": "good|needs_review|risky", "summary": "整体判断", "riskItems": [{ "type": "unsupported_claim|parameter_risk|protocol_risk|certification_risk|over_marketing|brand_expression|geo_structure|knowledge_gap", "severity": "low|medium|high", "text": "命中的原文或问题描述", "reason": "为什么有风险", "suggestion": "怎么改" }], "positiveItems": ["正向项"], "publishReadiness": { "canPublish": false, "needsHumanReview": true, "suggestedAction": "可发布 / 建议人工修改 / 暂不建议发布" } }',
      "",
      "检查重点：未在知识库明确支持的参数、协议、认证、型号、价格、交期、客户案例和效果承诺要标记风险；品牌表达要自然可信；GEO 结构要包含小标题、列表、FAQ、判断逻辑、适用边界和资料准备。"
    ].join("\n");
  }

  private buildPublishOptimizationPrompt(
    context: ContentQualityContext,
    input: OptimizeContentItemForPublishDto,
    qualityResult: ContentQualityCheckResponse
  ): string {
    return [
      `目标发布渠道：${input.targetChannel ?? "未指定"}`,
      `优化目标：${input.optimizationGoal ?? "更稳妥、更适合 GEO 抓取、减少事实风险"}`,
      `原标题：${context.item.title}`,
      `目标提示词：${context.item.geoPrompt?.promptText ?? "未关联"}`,
      "",
      "项目档案：",
      this.buildProjectProfileContext(context.projectProfile),
      "",
      "知识库事实：",
      this.buildKnowledgeContext(context.knowledgeChunks),
      "",
      "质量检查结果：",
      JSON.stringify(qualityResult, null, 2),
      "",
      "原文：",
      context.item.body,
      "",
      "请返回 JSON，不要返回 Markdown 代码块：",
      '{ "title": "优化后标题", "body": "优化后正文", "changes": ["修改点"], "warnings": ["注意事项"] }',
      "",
      "改写规则：不要新增知识库没有的事实；删除或弱化未证实的参数、协议、认证、价格和承诺；保留原有结构、FAQ、列表和判断逻辑；品牌表达自然克制；不自动发布、不生成版本记录。"
    ].join("\n");
  }

  private parseQualityCheckResult(
    result: GenerateTextResult,
    fallback: ContentQualityCheckResponse
  ): ContentQualityCheckResponse | null {
    const parsed = tryParseJsonFromAiText(result.text);

    if (!isRecord(parsed)) {
      return null;
    }

    const riskItems = Array.isArray(parsed.riskItems)
      ? parsed.riskItems
          .filter(isRecord)
          .map((item) => this.normalizeRiskItem(item))
          .filter((item): item is ContentQualityRiskItem => Boolean(item))
      : fallback.riskItems;
    const positiveItems = Array.isArray(parsed.positiveItems)
      ? parsed.positiveItems.map((item) => String(item).trim()).filter(Boolean)
      : fallback.positiveItems;
    const score = this.clampScore(Number(parsed.score ?? fallback.score));
    const level = this.normalizeQualityLevel(
      parsed.level,
      this.resolveQualityLevel(score, riskItems)
    );
    const publishReadiness = isRecord(parsed.publishReadiness)
      ? {
          canPublish: Boolean(parsed.publishReadiness.canPublish),
          needsHumanReview: Boolean(parsed.publishReadiness.needsHumanReview),
          suggestedAction:
            optionalString(parsed.publishReadiness.suggestedAction) ??
            fallback.publishReadiness.suggestedAction
        }
      : fallback.publishReadiness;

    return {
      score,
      level,
      summary: optionalString(parsed.summary) ?? fallback.summary,
      riskItems,
      positiveItems,
      publishReadiness
    };
  }

  private parsePublishOptimizationResult(
    result: GenerateTextResult,
    context: ContentQualityContext,
    qualityResult: ContentQualityCheckResponse
  ): ContentPublishOptimizationResponse {
    const parsed = tryParseJsonFromAiText(result.text);

    if (isRecord(parsed)) {
      return {
        title:
          optionalString(parsed.title) ??
          this.buildOptimizedTitle(context.item.title, qualityResult.level),
        body: optionalString(parsed.body) ?? result.text,
        changes: arrayOfStrings(parsed.changes, ["根据质量检查结果弱化事实风险和过度确定表达。"]),
        warnings: arrayOfStrings(parsed.warnings, ["发布前仍需人工复核知识库事实。"])
      };
    }

    return {
      title: this.buildOptimizedTitle(context.item.title, qualityResult.level),
      body: result.text,
      changes: ["AI 返回非标准 JSON，已将返回文本作为优化正文。"],
      warnings: ["发布前仍需人工复核知识库事实。"]
    };
  }

  private buildMockPublishOptimization(
    context: ContentQualityContext,
    input: OptimizeContentItemForPublishDto,
    qualityResult: ContentQualityCheckResponse
  ): ContentPublishOptimizationResponse {
    const body = this.buildSaferBody(context.item.body, context);
    const targetChannel = input.targetChannel ? `，面向${input.targetChannel}` : "";

    return {
      title: this.buildOptimizedTitle(context.item.title, qualityResult.level),
      body: [
        body,
        "",
        "## 发布前确认",
        `本优化稿仅作为发布前审校版本${targetChannel}。涉及具体型号、参数、接口、认证、价格、交期、案例和效果承诺的内容，仍需结合知识库资料和人工复核确认。`
      ].join("\n"),
      changes: [
        "弱化或删除未证实的协议、参数、认证、价格和承诺表达。",
        "增加需结合具体型号资料确认的事实边界。",
        "保留原有 GEO 结构和 FAQ 摘取点。"
      ],
      warnings: [
        "优化稿未自动覆盖原内容项，发布前仍需人工复核知识库事实。",
        "如果要发布到外部渠道，请确认品牌、产品、服务、课程、门店或项目事实均有资料依据。"
      ]
    };
  }

  private buildSaferBody(body: string, context: ContentQualityContext): string {
    let optimized = body
      .replace(
        /\b(?:RS[-\s]?485|IO[-\s]?Link|M12|4[-\s]?20\s*mA|0[-\s]?10\s*V)\b/gi,
        "具体接口或输出方式"
      )
      .replace(/\b(?:CE|IP6[57])\b/gi, "具体认证或防护等级")
      .replace(/毫秒级|厘米级|微米级/gi, "具体性能指标")
      .replace(/行业领先|最佳选择|最好|第一|绝对/gi, "相关")
      .replace(/保证|一定适用|100%|完全替代|零风险/gi, "需结合现场工况确认");

    if (!/需结合.*确认|以.*资料.*为准/.test(optimized)) {
      optimized +=
        "\n\n## 适用边界\n涉及具体型号、参数、接口、认证、价格和交期时，需结合具体资料和实际场景确认。";
    }

    const brandName = context.projectProfile?.brandName;

    if (brandName && !optimized.includes(brandName)) {
      optimized += `\n\n如需进一步确认，可结合${brandName}相关资料和现场工况进行选型沟通。`;
    }

    return optimized;
  }

  private addBrandExpressionRisks(
    context: ContentQualityContext,
    riskItems: ContentQualityRiskItem[]
  ): void {
    const brandName = context.projectProfile?.brandName?.trim();

    if (!brandName) {
      return;
    }

    const matches = context.item.body.match(new RegExp(escapeRegex(brandName), "g")) ?? [];

    if (matches.length === 0) {
      this.addUniqueRisk(riskItems, {
        type: "brand_expression",
        severity: "low",
        text: brandName,
        reason: "正文没有自然提及项目档案中的品牌，可能影响品牌实体识别。",
        suggestion: "在适合的位置自然表达品牌资料来源，例如“可结合相关品牌资料进一步确认”。"
      });
    }

    if (matches.length > 8) {
      this.addUniqueRisk(riskItems, {
        type: "brand_expression",
        severity: "medium",
        text: brandName,
        reason: "品牌名称出现过多，可能显得堆砌或营销化。",
        suggestion: "减少重复品牌名，将重点放在事实资料、判断逻辑和适用边界。"
      });
    }
  }

  private addStructureRisksAndPositives(
    context: ContentQualityContext,
    riskItems: ContentQualityRiskItem[],
    positiveItems: string[]
  ): void {
    const body = context.item.body;

    if (/^#{1,4}\s+\S+/m.test(body)) {
      positiveItems.push("结构清晰，有小标题");
    } else {
      this.addUniqueRisk(riskItems, {
        type: "geo_structure",
        severity: "medium",
        text: "缺少清晰小标题",
        reason: "缺少小标题会降低内容被 AI 摘取和用户快速阅读的效率。",
        suggestion: "增加用户问题、判断逻辑、适用边界、资料准备和 FAQ 等小标题。"
      });
    }

    if (/(^|\n)\s*[-*]\s+\S+|[一二三四五六七八九十]、/.test(body)) {
      positiveItems.push("包含列表，便于 AI 摘取");
    }

    if (/FAQ|问[:：]|常见问题|Q[:：]/i.test(body)) {
      positiveItems.push("包含 FAQ 或问答式总结");
    } else {
      this.addUniqueRisk(riskItems, {
        type: "geo_structure",
        severity: "low",
        text: "缺少 FAQ 或问答式总结",
        reason: "GEO 内容建议包含可被 AI 摘取的问答式总结。",
        suggestion: "补充 3-5 个贴近用户决策的问题和简洁答案。"
      });
    }

    if (/需结合.*确认|以.*资料.*为准|不适用|适用边界|限制条件|现场工况/.test(body)) {
      positiveItems.push("包含事实边界表达");
    } else {
      this.addUniqueRisk(riskItems, {
        type: "unsupported_claim",
        severity: "medium",
        text: "缺少事实边界表达",
        reason: "正文没有说明参数、适用性或服务结果需要结合资料和场景确认。",
        suggestion: "增加“需结合具体资料确认”或“需结合实际场景确认”等边界表达。"
      });
    }
  }

  private calculateQualityScore(riskItems: ContentQualityRiskItem[]): number {
    const score = riskItems.reduce((currentScore, item) => {
      if (item.severity === "high") {
        return currentScore - 25;
      }
      if (item.severity === "medium") {
        return currentScore - 14;
      }
      return currentScore - 7;
    }, 100);

    return this.clampScore(score);
  }

  private resolveQualityLevel(
    score: number,
    riskItems: ContentQualityRiskItem[]
  ): ContentQualityLevel {
    if (riskItems.some((item) => item.severity === "high") || score < 60) {
      return "risky";
    }

    if (riskItems.length > 0 || score < 85) {
      return "needs_review";
    }

    return "good";
  }

  private buildQualitySummary(
    score: number,
    level: ContentQualityLevel,
    riskItems: ContentQualityRiskItem[]
  ): string {
    if (level === "good") {
      return `质量评分 ${score}，未发现明显高风险项，可进入发布前人工复核。`;
    }

    const highRiskCount = riskItems.filter((item) => item.severity === "high").length;

    if (level === "risky") {
      return `质量评分 ${score}，发现 ${riskItems.length} 个风险项，其中 ${highRiskCount} 个高风险项，暂不建议直接发布。`;
    }

    return `质量评分 ${score}，发现 ${riskItems.length} 个需要人工复核的风险项，建议修改后发布。`;
  }

  private normalizeRiskItem(input: Record<string, unknown>): ContentQualityRiskItem | null {
    const type = this.normalizeRiskType(input.type);
    const severity = this.normalizeSeverity(input.severity);
    const text = optionalString(input.text);
    const reason = optionalString(input.reason);
    const suggestion = optionalString(input.suggestion);

    if (!type || !severity || !text || !reason || !suggestion) {
      return null;
    }

    return {
      type,
      severity,
      text,
      reason,
      suggestion
    };
  }

  private normalizeRiskType(value: unknown): ContentQualityRiskType | null {
    const normalized = optionalString(value);
    const allowed: ContentQualityRiskType[] = [
      "unsupported_claim",
      "parameter_risk",
      "protocol_risk",
      "certification_risk",
      "over_marketing",
      "brand_expression",
      "geo_structure",
      "knowledge_gap",
      "publish_cleanliness"
    ];

    return allowed.includes(normalized as ContentQualityRiskType)
      ? (normalized as ContentQualityRiskType)
      : null;
  }

  private normalizeSeverity(value: unknown): ContentQualitySeverity | null {
    const normalized = optionalString(value);

    if (normalized === "low" || normalized === "medium" || normalized === "high") {
      return normalized;
    }

    return null;
  }

  private normalizeQualityLevel(
    value: unknown,
    fallback: ContentQualityLevel
  ): ContentQualityLevel {
    const normalized = optionalString(value);

    if (normalized === "good" || normalized === "needs_review" || normalized === "risky") {
      return normalized;
    }

    return fallback;
  }

  private clampScore(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(Math.min(Math.round(value), 100), 0);
  }

  private addUniqueRisk(riskItems: ContentQualityRiskItem[], item: ContentQualityRiskItem): void {
    const exists = riskItems.some(
      (riskItem) => riskItem.type === item.type && riskItem.text === item.text
    );

    if (!exists) {
      riskItems.push(item);
    }
  }

  private addPublishCleanlinessRisks(
    source: string,
    riskItems: ContentQualityRiskItem[]
  ): void {
    const editorToneTerms = findEditorTonePublishTerms(source);
    const forbiddenTerms = findForbiddenInternalPublishTerms(source).filter(
      (term) => !editorToneTerms.includes(term)
    );

    if (editorToneTerms.length > 0) {
      // 编辑口吻会让发布稿像写作提示，先拦住，避免助理直接复制发布。
      this.addUniqueRisk(riskItems, {
        type: "publish_cleanliness",
        severity: "medium",
        text: [...new Set(editorToneTerms)].slice(0, 6).join("、"),
        reason: "发布稿存在编辑口吻或资料口吻，请先修复后再复制。",
        suggestion: "点击自动修复风险词，或复制草稿后人工删除资料说明和写作提示口吻。"
      });
    }

    if (forbiddenTerms.length === 0) {
      return;
    }

    // 对外发布稿不能出现内部工作词，助理只需要看到可执行的修复提示。
    this.addUniqueRisk(riskItems, {
      type: "publish_cleanliness",
      severity: "medium",
      text: [...new Set(forbiddenTerms)].slice(0, 6).join("、"),
      reason: "发布稿中包含内部工作词，请先修复后再复制。",
      suggestion: "点击自动修复风险词，或复制草稿后人工删除内部说明。"
    });
  }

  private buildPublishCheckText(context: ContentQualityContext): string {
    return buildContentItemPublishMarkdown({
      title: context.item.title,
      body: context.item.body,
      faqs: toArticlePublishPackage(context.item.publishPackage)?.faqs,
      keywords: [
        ...(toArticlePublishPackage(context.item.publishPackage)?.keywords.primaryKeywords ?? []),
        ...(toArticlePublishPackage(context.item.publishPackage)?.keywords.platformTags ?? [])
      ],
      evidenceNotes: this.buildPublishMarkdownEvidenceNotes(context.item)
    });
  }

  private isTermSupportedByKnowledge(term: string, knowledgeText: string): boolean {
    if (!knowledgeText) {
      return false;
    }

    const matches = [...knowledgeText.matchAll(new RegExp(escapeRegex(term), "gi"))];

    return matches.some((match) => {
      const index = match.index ?? 0;
      const windowText = knowledgeText.slice(Math.max(index - 18, 0), index + term.length + 18);
      return !/未提供|没有|未明确|不包含|不得编造|需结合|不能/.test(windowText);
    });
  }

  private buildKnowledgeText(knowledgeChunks: KnowledgeChunk[]): string {
    return knowledgeChunks.map((chunk) => `${chunk.title}\n${chunk.content}`).join("\n");
  }

  private buildKnowledgeContext(knowledgeChunks: KnowledgeChunk[]): string {
    if (knowledgeChunks.length === 0) {
      return "暂无知识库片段。请标记知识库上下文不足，不要编造事实。";
    }

    return knowledgeChunks
      .slice(0, 12)
      .map((chunk, index) => `${index + 1}. ${chunk.title}：${summarizeText(chunk.content, 420)}`)
      .join("\n");
  }

  private buildInstructionContext(instructionTemplate: InstructionTemplate | null): string {
    if (!instructionTemplate || instructionTemplate.deletedAt) {
      return "未关联指令模板。";
    }

    return [
      `名称：${instructionTemplate.name}`,
      `类型：${instructionTemplate.instructionType}`,
      `内容类型：${instructionTemplate.contentType}`,
      `正文：${instructionTemplate.instruction}`,
      instructionTemplate.qualityRules ? `质量规则：${instructionTemplate.qualityRules}` : "",
      instructionTemplate.forbiddenRules ? `禁止事项：${instructionTemplate.forbiddenRules}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildProjectProfileContext(projectProfile: ProjectProfileResponse | null): string {
    if (!projectProfile) {
      return "暂无项目档案。品牌语气和基础上下文需要人工补充确认。";
    }

    return [
      `项目名称：${projectProfile.projectName}`,
      projectProfile.companyName ? `企业名称：${projectProfile.companyName}` : "",
      projectProfile.brandName ? `品牌名称：${projectProfile.brandName}` : "",
      projectProfile.websiteUrl ? `官网：${projectProfile.websiteUrl}` : "",
      projectProfile.industry ? `所属行业：${projectProfile.industry}` : "",
      projectProfile.mainProducts.length > 0
        ? `主营产品 / 服务 / 课程 / 门店 / 项目方向：${projectProfile.mainProducts.join("、")}`
        : "",
      projectProfile.targetCustomers ? `目标客户：${projectProfile.targetCustomers}` : "",
      projectProfile.positioning ? `品牌定位：${projectProfile.positioning}` : "",
      projectProfile.tone ? `内容语气：${projectProfile.tone}` : "",
      projectProfile.forbiddenClaims.length > 0
        ? `禁止表达：${projectProfile.forbiddenClaims.join("、")}`
        : "",
      projectProfile.targetModels.length > 0
        ? `目标 AI 平台：${projectProfile.targetModels.join("、")}`
        : "",
      projectProfile.notes ? `补充说明：${projectProfile.notes}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildOptimizedTitle(title: string, level: ContentQualityLevel): string {
    const suffix = level === "good" ? "发布优化版" : "发布优化版";

    return title.includes(suffix) ? title : `${title}（${suffix}）`;
  }

  private requireAiProviderService(): Pick<AiProviderService, "generateText"> {
    if (!this.aiProviderService) {
      throw new BadRequestException("AI Provider Service is not available.");
    }

    return this.aiProviderService;
  }

  private buildWhere(
    query: NormalizedQueryContentItems,
    context?: ResourceAccessContext
  ): Prisma.ContentItemWhereInput {
    const where: Prisma.ContentItemWhereInput = {
      deletedAt: null
    };

    if (query.search) {
      where.OR = [
        {
          title: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          body: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          suggestedPublishChannel: {
            contains: query.search,
            mode: "insensitive"
          }
        }
      ];
    }

    if (query.taskId) {
      where.taskId = query.taskId;
    }
    if (query.geoPromptId) {
      where.geoPromptId = query.geoPromptId;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (!context) {
      return where;
    }

    return {
      AND: [where, this.buildAccessWhere(context)]
    };
  }

  private buildAccessWhere(context: ResourceAccessContext): Prisma.ContentItemWhereInput {
    const companyId = getCurrentCompanyId(context);

    return {
      AND: [
        {
          task: buildOwnerCompanyReadWhere(context) as Prisma.ContentTaskWhereInput
        },
        {
          OR: [
            {
              companyId
            },
            {
              companyId: null
            }
          ]
        }
      ]
    };
  }

  private async findExistingContentItem(
    id: string,
    context?: ResourceAccessContext
  ): Promise<ContentItem & { task: ContentTask }> {
    const item = await this.prisma.contentItem.findFirst({
      where: context
        ? {
            AND: [
              {
                id
              },
              this.buildAccessWhere(context)
            ]
          }
        : {
            id
          },
      include: {
        task: true
      }
    });

    if (!item) {
      throw new NotFoundException(`GEO content item not found: ${id}`);
    }

    return item;
  }

  private toResponse(item: ContentItem): GeneratedContentItemResponse {
    return {
      id: item.id,
      companyId: item.companyId ?? undefined,
      taskId: item.taskId,
      geoPromptId: item.geoPromptId,
      title: item.title,
      body: item.body,
      geoOptimizationPoints: jsonStringArray(item.geoOptimizationPoints),
      suggestedPublishChannel: item.suggestedPublishChannel ?? undefined,
      status: item.status,
      publishStatus: item.publishStatus as PublishStatus | undefined,
      qualityGateResult: toQualityGateResult(item.qualityGateResult),
      qualityCheckedAt: item.qualityCheckedAt ?? undefined,
      publishPackage: toArticlePublishPackage(item.publishPackage),
      publishPackageGeneratedAt: item.publishPackageGeneratedAt ?? undefined,
      errorMessage: item.errorMessage ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}

function toQualityGateResult(value: Prisma.JsonValue | null): QualityGateResult | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as QualityGateResult;
}

function tryParseJsonFromAiText(text: string): unknown {
  const direct = safeJsonParse(text);

  if (direct !== undefined) {
    return direct;
  }

  const jsonBlock = extractJsonBlock(text);
  return jsonBlock ? safeJsonParse(jsonBlock) : undefined;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractJsonBlock(text: string): string | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");

  if (firstObject >= 0 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function arrayOfStrings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value.map((item) => String(item).trim()).filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function summarizeText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}
