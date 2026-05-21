import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import {
  AiCallStatus,
  Prisma,
  TaskStatus,
  UserRole,
  UserStatus,
  type AiCallLog,
  type ContentItem,
  type ContentTask,
  type GeoPrompt,
  type InstructionTemplate,
  type KnowledgeBase,
  type KnowledgeChunk
} from "@prisma/client";
import type { CreateContentTaskDto } from "./dto/create-content-task.dto";
import type { QueryContentTasksDto } from "./dto/query-content-tasks.dto";
import { AiProviderService } from "../ai/ai-provider.service";
import {
  isMockAiProvider,
  normalizeAiProvider,
  type GenerateTextResult
} from "../ai/ai-provider.interface";
import {
  generateMockGeoContent,
  type MockContentGenerationResult
} from "./utils/mock-content-generator";
import { jsonStringArray } from "./utils/normalize-content-item";
import {
  normalizeCreateContentTask,
  normalizeQueryContentTasks,
  trimOptional,
  type NormalizedCreateContentTask,
  type NormalizedQueryContentTasks
} from "./utils/normalize-content-task";
import {
  ProjectProfileService,
  type ProjectProfileResponse
} from "../project-profile/project-profile.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  buildResourceReadWhere,
  getCurrentCompanyId,
  type ResourceAccessContext
} from "../auth/auth-policy";
import {
  assertCanManageOwnerCompanyResource,
  buildOwnerCompanyReadWhere,
  buildOwnerCompanyReadWhereById,
  resolveOwnerCompanyCreateData
} from "../auth/owner-company-policy";
import { AiUsageService } from "../usage/ai-usage.service";
import { OperationLogsService } from "../usage/operation-logs.service";
import { buildOfficialCitableKnowledgeFileWhere } from "../geo-knowledge/utils/official-citation.util";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const AI_CALL_PURPOSE = "content_generation";
const AI_CALL_RELATED_TYPE = "content_task";
const DEFAULT_MOCK_CONTENT_MODEL = "mock-content-v1";
const GLOBAL_GEO_CONTENT_QUALITY_RULES = [
  "只使用知识库、目标提示词、用户输入和指令模板中明确提供的信息。",
  "不得编造具体型号、参数、精度、量程、响应时间、通信协议、防护等级、认证编号、价格、交期、库存、客户案例、课程效果、门店活动或服务承诺。",
  "如果知识库没有明确提供具体信息，统一写成“需结合具体资料确认”或“需结合实际场景确认”。",
  "如果某项信息只有方向性描述，不要扩写成具体数值或确定结论。",
  "不要把某一类能力错误迁移成解决其他问题的通用手段；防爆、耐高温、耐腐蚀、防水、防尘、抗干扰、远距离、高精度、提分效果、到店优惠、服务保障等能力或承诺只能用于对应适用边界。",
  "特殊认证、特殊结构、特殊资质或特殊承诺只能在知识库明确提供时提及，不要把“适用于某场景”写成“所有场景都适用”。",
  "遇到不稳定、误触发、无信号、效果异常、体验不佳或结果不符合预期等问题时，优先从使用场景、适用对象、环境条件、目标特征、操作步骤、配置方式、服务边界和用户准备情况排查。",
  "不要直接建议更换更高规格产品、升级更贵服务或承诺确定结果，除非知识库或用户输入明确支持；不要建议用户自行修改功率、拆机、绕过安全保护或做不合规操作。",
  "输出内容要优先写需求决策逻辑、场景确认项、适用边界和注意事项，而不是堆未经确认的参数或承诺。",
  "如需提到接口、规格、参数、服务内容、课程结果、门店活动或价格，可写“需结合具体资料确认”，不要主动扩展未提供的协议、数值、价格或承诺。",
  "不要替用户直接确定最终选择，应引导用户提供项目、场景、预算、限制条件或实际需求后再确认。",
  "品牌出现要自然，可以写“可结合某品牌相关产品资料进一步确认”；不要写“行业领先”“最佳选择”“一定适用”“完全替代”等夸张营销语。",
  "不要承诺效果、寿命、精度、交期和价格。",
  "内容要适合 AI 摘取，优先使用清晰小标题、列表、FAQ、判断逻辑。",
  "每篇内容最好包含用户问题或实际场景、判断逻辑、适用条件、不适用或需确认条件、资料准备清单、FAQ 总结。",
  "输出要像可发布的项目内容，不要像 AI 自述，不要出现“根据你提供的资料”“作为 AI”等表达。"
];

export type ContentTaskResponse = {
  id: string;
  companyId?: string;
  name: string;
  productLine?: string;
  knowledgeBaseId: string | null;
  instructionTemplateId: string | null;
  generationType: string;
  targetModel?: string;
  status: TaskStatus;
  provider?: string;
  model?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentItemResponse = {
  id: string;
  companyId?: string;
  taskId: string;
  geoPromptId: string | null;
  title: string;
  body: string;
  geoOptimizationPoints: string[];
  suggestedPublishChannel?: string;
  status: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RelatedKnowledgeBaseResponse = {
  id: string;
  name: string;
  productLine?: string;
  description?: string;
  status: string;
};

export type RelatedInstructionTemplateResponse = {
  id: string;
  name: string;
  instructionType: string;
  contentType: string;
  targetModel?: string;
};

export type RelatedGeoPromptResponse = {
  id: string;
  type: string;
  promptText: string;
  productLine?: string;
  scenario?: string;
};

export type AiCallLogResponse = {
  id: string;
  provider: string;
  model: string;
  purpose: string;
  relatedType?: string;
  relatedId?: string;
  status: AiCallStatus;
  createdAt: Date;
};

export type ContentTaskListResponse = {
  items: ContentTaskResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type ContentTaskDetailResponse = {
  task: ContentTaskResponse;
  items: ContentItemResponse[];
  knowledgeBase?: RelatedKnowledgeBaseResponse;
  instructionTemplate?: RelatedInstructionTemplateResponse;
  prompts: RelatedGeoPromptResponse[];
  aiCallLogs: AiCallLogResponse[];
};

type GeneratedContentResult = MockContentGenerationResult & {
  provider: string;
  model: string;
  tokenInput?: number;
  tokenOutput?: number;
};

type AiUsageSummary = {
  provider?: string;
  model?: string;
  tokenInput?: number;
  tokenOutput?: number;
};

@Injectable()
export class ContentTasksService {
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
    private readonly operationLogsService?: OperationLogsService
  ) {}

  async findMany(
    query: QueryContentTasksDto,
    context?: ResourceAccessContext
  ): Promise<ContentTaskListResponse> {
    const normalized = normalizeQueryContentTasks(query);
    const where = this.buildWhere(normalized, context);

    const [items, total] = await Promise.all([
      this.prisma.contentTask.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.contentTask.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toTaskResponse(item)),
      total,
      page: normalized.page,
      pageSize: normalized.pageSize
    };
  }

  async create(
    input: CreateContentTaskDto,
    context?: ResourceAccessContext
  ): Promise<ContentTaskDetailResponse> {
    const normalized = normalizeCreateContentTask(input);
    const createdById = context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
    const prompts = await this.findActiveGeoPrompts(normalized.geoPromptIds, context);
    const knowledgeBase = await this.findOptionalKnowledgeBase(
      normalized.knowledgeBaseId,
      context
    );
    const instructionTemplate = await this.findOptionalInstructionTemplate(
      normalized.instructionTemplateId,
      context
    );
    const knowledgeChunks = knowledgeBase
      ? await this.findKnowledgeChunks(knowledgeBase.id, context)
      : [];
    const projectProfile = await this.findProjectProfileContext(context);
    const companyId = context ? getCurrentCompanyId(context) : undefined;

    const task = await this.prisma.contentTask.create({
      data: {
        name: normalized.name,
        productLine: normalized.productLine,
        knowledgeBase: knowledgeBase
          ? {
              connect: {
                id: knowledgeBase.id
              }
            }
          : undefined,
        instructionTemplate: instructionTemplate
          ? {
              connect: {
                id: instructionTemplate.id
              }
            }
          : undefined,
        generationType: normalized.generationType,
        targetModel: normalized.targetModel,
        status: TaskStatus.running,
        provider: normalized.provider,
        model: normalized.model,
        ...(context
          ? resolveOwnerCompanyCreateData(context)
          : {
              createdBy: {
                connect: {
                  id: createdById
                }
              }
            })
      }
    });

    const createdItems: ContentItem[] = [];
    let failedCount = 0;
    const provider = normalizeAiProvider(normalized.provider);
    const aiUsage: AiUsageSummary = {
      provider,
      model: normalized.model
    };

    for (const prompt of prompts) {
      try {
        const generated = await this.generateGeoContent({
          geoPrompt: prompt,
          knowledgeChunks,
          instructionTemplate,
          generationType: normalized.generationType,
          productLine: normalized.productLine,
          targetModel: normalized.targetModel,
          provider,
          model: normalized.model,
          taskId: task.id,
          projectProfile
        });
        this.mergeAiUsage(aiUsage, generated);
        const item = await this.prisma.contentItem.create({
          data: {
            task: {
              connect: {
                id: task.id
              }
            },
            geoPrompt: {
              connect: {
                id: prompt.id
              }
            },
            title: generated.title,
            body: generated.body,
            geoOptimizationPoints: generated.geoOptimizationPoints as Prisma.InputJsonValue,
            suggestedPublishChannel: generated.suggestedPublishChannel,
            status: "draft",
            ...(companyId
              ? {
                  company: {
                    connect: {
                      id: companyId
                    }
                  }
                }
              : {})
          }
        });
        createdItems.push(item);
      } catch (error) {
        failedCount += 1;
        const item = await this.createFailedContentItem(task.id, prompt, error, companyId);
        createdItems.push(item);
      }
    }

    const nextStatus = failedCount === 0 ? TaskStatus.succeeded : TaskStatus.failed;
    await this.prisma.contentTask.update({
      where: {
        id: task.id
      },
      data: {
        provider: aiUsage.provider ?? provider,
        model: aiUsage.model ?? normalized.model ?? this.resolveFallbackModel(provider),
        status: nextStatus,
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
    await this.recordAiCall(
      normalized,
      task.id,
      nextStatus,
      prompts,
      createdItems,
      aiUsage,
      context,
      "content_generate"
    );
    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-content",
        action: "create",
        targetType: "content_task",
        targetId: task.id,
        targetTitle: task.name,
        success: nextStatus !== TaskStatus.failed,
        metadata: {
          itemCount: createdItems.length,
          failedCount
        }
      },
      context
    );

    return this.getDetail(task.id, context);
  }

  async getDetail(
    id: string,
    context?: ResourceAccessContext
  ): Promise<ContentTaskDetailResponse> {
    const task = await this.prisma.contentTask.findFirst({
      where: context
        ? (buildOwnerCompanyReadWhereById(id, context) as Prisma.ContentTaskWhereInput)
        : {
            id
          },
      include: {
        knowledgeBase: true,
        instructionTemplate: true,
        contentItems: {
          where: {
            deletedAt: null,
            ...(context
              ? {
                  OR: [
                    {
                      companyId: getCurrentCompanyId(context)
                    },
                    {
                      companyId: null
                    }
                  ]
                }
              : {})
          },
          include: {
            geoPrompt: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!task) {
      throw new NotFoundException(`GEO content task not found: ${id}`);
    }

    const aiCallLogs = await this.prisma.aiCallLog.findMany({
      where: {
        relatedType: AI_CALL_RELATED_TYPE,
        relatedId: id,
        ...(context
          ? {
              companyId: getCurrentCompanyId(context)
            }
          : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    });

    const prompts = task.contentItems
      .map((item) => item.geoPrompt)
      .filter((prompt): prompt is GeoPrompt => Boolean(prompt));

    return {
      task: this.toTaskResponse(task),
      items: task.contentItems.map((item) => this.toItemResponse(item)),
      knowledgeBase:
        task.knowledgeBase && !task.knowledgeBase.deletedAt
          ? this.toKnowledgeBaseResponse(task.knowledgeBase)
          : undefined,
      instructionTemplate:
        task.instructionTemplate && !task.instructionTemplate.deletedAt
          ? this.toInstructionTemplateResponse(task.instructionTemplate)
          : undefined,
      prompts: this.uniquePrompts(prompts).map((prompt) => this.toGeoPromptResponse(prompt)),
      aiCallLogs: aiCallLogs.map((log) => this.toAiCallLogResponse(log))
    };
  }

  async archive(id: string, context?: ResourceAccessContext): Promise<ContentTaskResponse> {
    const task = await this.findExistingTask(id, context);

    if (task.status === TaskStatus.running) {
      throw new BadRequestException("running GEO content task cannot be archived");
    }
    if (context) {
      assertCanManageOwnerCompanyResource(context, task, "无权归档当前 GEO 内容任务");
    }

    if (task.status === TaskStatus.cancelled) {
      return this.toTaskResponse(task);
    }

    const archived = await this.prisma.contentTask.update({
      where: {
        id
      },
      data: {
        status: TaskStatus.cancelled,
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

    return this.toTaskResponse(archived);
  }

  async retry(id: string, context?: ResourceAccessContext): Promise<ContentTaskDetailResponse> {
    const task = await this.findExistingTask(id, context);

    if (task.status === TaskStatus.cancelled) {
      throw new BadRequestException("archived GEO content task cannot be retried");
    }
    if (context) {
      assertCanManageOwnerCompanyResource(context, task, "无权重试当前 GEO 内容任务");
    }

    const companyId = context ? getCurrentCompanyId(context) : task.companyId ?? undefined;
    const activeItems = await this.prisma.contentItem.findMany({
      where: {
        taskId: id,
        deletedAt: null,
        ...(companyId
          ? {
              OR: [
                {
                  companyId
                },
                {
                  companyId: null
                }
              ]
            }
          : {})
      },
      include: {
        geoPrompt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const failedItems = activeItems.filter((item) => item.status === "failed");
    const knowledgeChunks = task.knowledgeBaseId
      ? await this.findKnowledgeChunks(task.knowledgeBaseId, context)
      : [];
    const instructionTemplate = task.instructionTemplateId
      ? await this.findOptionalInstructionTemplate(task.instructionTemplateId, context)
      : undefined;
    const projectProfile = await this.findProjectProfileContext(context);
    const provider = normalizeAiProvider(task.provider ?? "mock");
    const model = task.model ?? this.resolveFallbackModel(provider);
    const aiUsage: AiUsageSummary = {
      provider,
      model
    };

    await this.prisma.contentTask.update({
      where: {
        id
      },
      data: {
        status: TaskStatus.running,
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

    let failedCount = 0;

    for (const item of failedItems) {
      if (!item.geoPrompt || item.geoPrompt.deletedAt) {
        failedCount += 1;
        await this.prisma.contentItem.update({
          where: {
            id: item.id
          },
          data: {
            status: "failed",
            errorMessage: "Related GEO prompt is missing or deleted.",
            ...(companyId
              ? {
                  company: {
                    connect: {
                      id: companyId
                    }
                  }
                }
              : {})
          }
        });
        continue;
      }

      try {
        const generated = await this.generateGeoContent({
          geoPrompt: item.geoPrompt,
          knowledgeChunks,
          instructionTemplate,
          generationType: task.generationType,
          productLine: task.productLine ?? undefined,
          targetModel: task.targetModel ?? undefined,
          provider,
          model,
          taskId: task.id,
          projectProfile
        });
        this.mergeAiUsage(aiUsage, generated);
        await this.prisma.contentItem.update({
          where: {
            id: item.id
          },
          data: {
            title: generated.title,
            body: generated.body,
            geoOptimizationPoints: generated.geoOptimizationPoints as Prisma.InputJsonValue,
            suggestedPublishChannel: generated.suggestedPublishChannel,
            status: "draft",
            errorMessage: null,
            ...(companyId
              ? {
                  company: {
                    connect: {
                      id: companyId
                    }
                  }
                }
              : {})
          }
        });
      } catch (error) {
        failedCount += 1;
        await this.prisma.contentItem.update({
          where: {
            id: item.id
          },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "GEO content generation failed.",
            ...(companyId
              ? {
                  company: {
                    connect: {
                      id: companyId
                    }
                  }
                }
              : {})
          }
        });
      }
    }

    const remainingFailedCount = await this.prisma.contentItem.count({
      where: {
        taskId: id,
        deletedAt: null,
        status: "failed",
        ...(companyId
          ? {
              OR: [
                {
                  companyId
                },
                {
                  companyId: null
                }
              ]
            }
          : {})
      }
    });
    const nextStatus =
      failedCount === 0 && remainingFailedCount === 0 ? TaskStatus.succeeded : TaskStatus.failed;
    await this.prisma.contentTask.update({
      where: {
        id
      },
      data: {
        provider: aiUsage.provider ?? provider,
        model: aiUsage.model ?? model,
        status: nextStatus,
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
    await this.recordAiCall(
      {
        name: task.name,
        productLine: task.productLine ?? undefined,
        knowledgeBaseId: task.knowledgeBaseId ?? undefined,
        instructionTemplateId: task.instructionTemplateId ?? undefined,
        generationType: task.generationType,
        targetModel: task.targetModel ?? undefined,
        provider: aiUsage.provider ?? provider,
        model: aiUsage.model ?? model,
        geoPromptIds: activeItems
          .map((item) => item.geoPromptId)
          .filter((promptId): promptId is string => Boolean(promptId))
      },
      id,
      nextStatus,
      activeItems
        .map((item) => item.geoPrompt)
        .filter((prompt): prompt is GeoPrompt => Boolean(prompt)),
      activeItems,
      aiUsage,
      context,
      "content_retry"
    );
    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "geo-content",
        action: "retry",
        targetType: "content_task",
        targetId: id,
        targetTitle: task.name,
        success: nextStatus !== TaskStatus.failed,
        metadata: {
          retryItemCount: activeItems.length,
          failedCount
        }
      },
      context
    );

    return this.getDetail(id, context);
  }

  private async generateGeoContent(input: {
    geoPrompt: GeoPrompt;
    knowledgeChunks: KnowledgeChunk[];
    instructionTemplate?: InstructionTemplate | null;
    generationType: string;
    productLine?: string;
    targetModel?: string;
    provider: string;
    model?: string;
    taskId: string;
    projectProfile?: ProjectProfileResponse | null;
  }): Promise<GeneratedContentResult> {
    if (isMockAiProvider(input.provider)) {
      return {
        ...generateMockGeoContent(input),
        provider: "mock",
        model: input.model ?? DEFAULT_MOCK_CONTENT_MODEL
      };
    }

    const result = await this.requireAiProviderService().generateText({
      provider: input.provider,
      model: input.model,
      purpose: AI_CALL_PURPOSE,
      relatedType: AI_CALL_RELATED_TYPE,
      relatedId: input.taskId,
      temperature: 0.5,
      maxTokens: 2400,
      systemPrompt:
        "你是 GEO 内容生产专家。请基于企业知识库事实、GEO 提示词和指令模板生成结构化内容，必须遵守全局通用质量规则，只输出 JSON。",
      userPrompt: this.buildRealContentPrompt(input)
    });
    const parsed = this.parseRealContentResult(result, input.geoPrompt);

    return {
      ...parsed,
      provider: result.provider,
      model: result.model,
      tokenInput: result.tokenInput,
      tokenOutput: result.tokenOutput
    };
  }

  private buildRealContentPrompt(input: {
    geoPrompt: GeoPrompt;
    knowledgeChunks: KnowledgeChunk[];
    instructionTemplate?: InstructionTemplate | null;
    generationType: string;
    productLine?: string;
    targetModel?: string;
    projectProfile?: ProjectProfileResponse | null;
  }): string {
    const knowledgeContext =
      input.knowledgeChunks.length > 0
        ? input.knowledgeChunks
            .slice(0, 5)
            .map(
              (chunk, index) => `${index + 1}. ${chunk.title}：${summarizeText(chunk.content, 500)}`
            )
            .join("\n")
        : "暂无知识库片段。不要编造企业事实，只保留可验证的 GEO 内容结构。";
    const instructionContext = input.instructionTemplate
      ? [
          `指令名称：${input.instructionTemplate.name}`,
          `指令类型：${input.instructionTemplate.instructionType}`,
          `指令正文：${input.instructionTemplate.instruction}`,
          input.instructionTemplate.outputFormat
            ? `输出格式：${input.instructionTemplate.outputFormat}`
            : undefined,
          input.instructionTemplate.qualityRules
            ? `质量规则：${input.instructionTemplate.qualityRules}`
            : undefined,
          input.instructionTemplate.forbiddenRules
            ? `禁用规则：${input.instructionTemplate.forbiddenRules}`
            : undefined
        ]
          .filter(Boolean)
          .join("\n")
      : "未选择指令模板，请使用基础 GEO 内容结构。";
    const projectProfileContext = buildProjectProfilePromptContext(input.projectProfile);

    return [
      "项目档案 / 品牌上下文：",
      projectProfileContext,
      "",
      `目标 GEO 提示词：${input.geoPrompt.promptText}`,
      `提示词类型：${input.geoPrompt.type}`,
      `产品线：${input.productLine ?? input.geoPrompt.productLine ?? "未指定"}`,
      `应用场景：${input.geoPrompt.scenario ?? "未指定"}`,
      `生成类型：${input.generationType}`,
      input.targetModel ? `目标模型：${input.targetModel}` : undefined,
      "",
      "企业知识库事实：",
      knowledgeContext,
      "",
      "GEO 指令模板：",
      instructionContext,
      "",
      "全局通用质量规则：",
      ...GLOBAL_GEO_CONTENT_QUALITY_RULES.map((rule) => `- ${rule}`),
      "",
      "请返回 JSON，不要返回 Markdown 代码块：",
      '{ "title": "标题", "body": "正文，包含用户问题/场景、判断逻辑、产品/方案说明、注意事项、AI 可摘取问答式总结", "geoOptimizationPoints": ["优化点"], "suggestedPublishChannel": "建议发布位置" }',
      "",
      "要求：",
      "- 内容必须服务于提升 AI 回答中的品牌提及、推荐和引用概率。",
      "- 不得编造客户案例、认证、参数、品牌资质或外部事实。",
      "- 如果知识库不足，请在正文中明确提示需要补充资料。",
      "- 项目档案只用于品牌语气、受众和基础上下文，不替代知识库事实；不得因为项目档案里写了行业就自动编造行业数据、客户案例或参数。",
      "- 全局通用质量规则优先于指令模板中的具体写法；产品、服务、课程、门店、个人品牌或解决方案的专属事实只能来自知识库或本次任务输入。"
    ]
      .filter(Boolean)
      .join("\n");
  }

  private async findProjectProfileContext(
    context?: ResourceAccessContext
  ): Promise<ProjectProfileResponse | null> {
    return this.projectProfileService?.getPromptContext(context) ?? null;
  }

  private parseRealContentResult(
    result: GenerateTextResult,
    geoPrompt: GeoPrompt
  ): MockContentGenerationResult {
    const parsed = tryParseJsonFromAiText(result.text);

    if (isRecord(parsed)) {
      const title =
        optionalString(parsed.title) ?? `GEO内容：${summarizeText(geoPrompt.promptText, 60)}`;
      const body = optionalString(parsed.body) ?? result.text;
      const geoOptimizationPoints = Array.isArray(parsed.geoOptimizationPoints)
        ? parsed.geoOptimizationPoints.map((item) => String(item).trim()).filter(Boolean)
        : [
            `覆盖目标提示词：${geoPrompt.promptText}`,
            "由 OpenAI-compatible Provider 生成，已进入人工可编辑内容项"
          ];

      return {
        title,
        body,
        geoOptimizationPoints,
        suggestedPublishChannel:
          optionalString(parsed.suggestedPublishChannel) ?? "官网知识库 / 公众号 / B2B 产品页"
      };
    }

    return {
      title: `GEO内容：${summarizeText(geoPrompt.promptText, 60)}`,
      body: result.text,
      geoOptimizationPoints: [
        `覆盖目标提示词：${geoPrompt.promptText}`,
        "AI 返回非标准 JSON，已将原文作为正文保存"
      ],
      suggestedPublishChannel: "官网知识库 / 公众号 / B2B 产品页"
    };
  }

  private buildWhere(
    query: NormalizedQueryContentTasks,
    context?: ResourceAccessContext
  ): Prisma.ContentTaskWhereInput {
    const where: Prisma.ContentTaskWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          productLine: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          generationType: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          targetModel: {
            contains: query.search,
            mode: "insensitive"
          }
        }
      ];
    }

    if (query.productLine) {
      where.productLine = query.productLine;
    }
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = {
        not: TaskStatus.cancelled
      };
    }
    if (query.generationType) {
      where.generationType = query.generationType;
    }
    if (query.targetModel) {
      where.targetModel = query.targetModel;
    }
    if (query.createdBy) {
      where.createdById = query.createdBy;
    }

    if (!context) {
      return where;
    }

    return {
      AND: [where, buildOwnerCompanyReadWhere(context) as Prisma.ContentTaskWhereInput]
    };
  }

  private async findExistingTask(
    id: string,
    context?: ResourceAccessContext
  ): Promise<ContentTask> {
    const task = await this.prisma.contentTask.findFirst({
      where: context
        ? (buildOwnerCompanyReadWhereById(id, context) as Prisma.ContentTaskWhereInput)
        : {
            id
          }
    });

    if (!task) {
      throw new NotFoundException(`GEO content task not found: ${id}`);
    }

    return task;
  }

  private async findActiveGeoPrompts(
    ids: string[],
    context?: ResourceAccessContext
  ): Promise<GeoPrompt[]> {
    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        AND: [
          {
            id: {
              in: ids
            },
            deletedAt: null
          },
          ...(context ? [buildResourceReadWhere(context)] : [])
        ]
      }
    });
    const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
    const missingIds = ids.filter((id) => !promptById.has(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(`GEO prompts not found or deleted: ${missingIds.join(", ")}`);
    }

    return ids
      .map((id) => promptById.get(id))
      .filter((prompt): prompt is GeoPrompt => Boolean(prompt));
  }

  private async findOptionalKnowledgeBase(
    id?: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeBase | undefined> {
    if (!id) {
      return undefined;
    }

    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        AND: [
          {
            id,
            deletedAt: null
          },
          ...(context
            ? [buildResourceReadWhere(context) as Prisma.KnowledgeBaseWhereInput]
            : [])
        ]
      }
    });

    if (!knowledgeBase) {
      throw new BadRequestException(`GEO knowledge base not found or deleted: ${id}`);
    }

    return knowledgeBase;
  }

  private async findOptionalInstructionTemplate(
    id?: string | null,
    context?: ResourceAccessContext
  ): Promise<InstructionTemplate | undefined> {
    if (!id) {
      return undefined;
    }

    const instructionTemplate = await this.prisma.instructionTemplate.findFirst({
      where: {
        AND: [
          {
            id,
            deletedAt: null
          },
          ...(context
            ? [buildResourceReadWhere(context) as Prisma.InstructionTemplateWhereInput]
            : [])
        ]
      }
    });

    if (!instructionTemplate) {
      throw new BadRequestException(`GEO instruction template not found or deleted: ${id}`);
    }

    return instructionTemplate;
  }

  private async findKnowledgeChunks(
    knowledgeBaseId: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeChunk[]> {
    return this.prisma.knowledgeChunk.findMany({
      where: {
        knowledgeBaseId,
        deletedAt: null,
        file: {
          is: buildOfficialCitableKnowledgeFileWhere({
            ...(context
              ? {
                  companyId: getCurrentCompanyId(context)
                }
              : {})
          })
        },
        ...(context
          ? {
              companyId: getCurrentCompanyId(context)
            }
          : {})
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 5
    });
  }

  private async createFailedContentItem(
    taskId: string,
    prompt: GeoPrompt,
    error: unknown,
    companyId?: string
  ): Promise<ContentItem> {
    return this.prisma.contentItem.create({
      data: {
        task: {
          connect: {
            id: taskId
          }
        },
        geoPrompt: {
          connect: {
            id: prompt.id
          }
        },
        title: `GEO内容生成失败：${prompt.promptText}`,
        body: "内容生成失败占位内容，用于保留 GEO 提示词与任务的重试关系。",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "GEO content generation failed.",
        ...(companyId
          ? {
              company: {
                connect: {
                  id: companyId
                }
              }
            }
          : {})
      }
    });
  }

  private async recordAiCall(
    input: Pick<
      NormalizedCreateContentTask,
      | "provider"
      | "model"
      | "name"
      | "productLine"
      | "generationType"
      | "targetModel"
      | "geoPromptIds"
      | "knowledgeBaseId"
      | "instructionTemplateId"
    >,
    taskId: string,
    status: TaskStatus,
    prompts: GeoPrompt[],
    items: Array<ContentItem | { body?: string }>,
    usage?: AiUsageSummary,
    context?: ResourceAccessContext,
    action = "content_generate"
  ): Promise<void> {
    const inputText = JSON.stringify({
      name: input.name,
      generationType: input.generationType,
      targetModel: input.targetModel,
      knowledgeBaseId: input.knowledgeBaseId,
      instructionTemplateId: input.instructionTemplateId,
      geoPromptIds: input.geoPromptIds,
      prompts: prompts.map((prompt) => prompt.promptText)
    });
    const outputText = items.map((item) => item.body ?? "").join("\n");

    await this.prisma.aiCallLog.create({
      data: {
        provider: usage?.provider ?? input.provider,
        model: usage?.model ?? input.model ?? this.resolveFallbackModel(input.provider),
        purpose: AI_CALL_PURPOSE,
        relatedType: AI_CALL_RELATED_TYPE,
        relatedId: taskId,
        tokenInput: usage?.tokenInput ?? this.estimateTokenCount(inputText),
        tokenOutput: usage?.tokenOutput ?? this.estimateTokenCount(outputText),
        costEstimate: 0,
        status: status === TaskStatus.failed ? AiCallStatus.failed : AiCallStatus.succeeded,
        ...(context
          ? {
              company: {
                connect: {
                  id: getCurrentCompanyId(context)
                }
              },
              createdBy: {
                connect: {
                  id: context.user.id
                }
              }
            }
          : {})
      }
    });
    const provider = usage?.provider ?? input.provider;
    const promptTokens = usage?.tokenInput ?? this.estimateTokenCount(inputText);
    const completionTokens = usage?.tokenOutput ?? this.estimateTokenCount(outputText);

    await this.aiUsageService?.recordUsage(
      {
        moduleKey: "geo-content",
        action,
        provider,
        model: usage?.model ?? input.model ?? this.resolveFallbackModel(input.provider),
        isMock: isMockAiProvider(provider),
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        requestCount: 1,
        success: status !== TaskStatus.failed,
        metadata: {
          taskId,
          promptCount: prompts.length,
          itemCount: items.length,
          generationType: input.generationType
        }
      },
      context
    );
  }

  private estimateTokenCount(text: string): number {
    return Math.max(Math.ceil(text.length / 4), 1);
  }

  private mergeAiUsage(usage: AiUsageSummary, result: GeneratedContentResult): void {
    usage.provider = result.provider;
    usage.model = result.model;

    if (result.tokenInput !== undefined) {
      usage.tokenInput = (usage.tokenInput ?? 0) + result.tokenInput;
    }
    if (result.tokenOutput !== undefined) {
      usage.tokenOutput = (usage.tokenOutput ?? 0) + result.tokenOutput;
    }
  }

  private resolveFallbackModel(provider?: string): string {
    return isMockAiProvider(provider) ? DEFAULT_MOCK_CONTENT_MODEL : "configured-default";
  }

  private requireAiProviderService(): Pick<AiProviderService, "generateText"> {
    if (!this.aiProviderService) {
      throw new BadRequestException("AI Provider Service is not available.");
    }

    return this.aiProviderService;
  }

  private toTaskResponse(task: ContentTask): ContentTaskResponse {
    return {
      id: task.id,
      companyId: task.companyId ?? undefined,
      name: task.name,
      productLine: task.productLine ?? undefined,
      knowledgeBaseId: task.knowledgeBaseId,
      instructionTemplateId: task.instructionTemplateId,
      generationType: task.generationType,
      targetModel: task.targetModel ?? undefined,
      status: task.status,
      provider: task.provider ?? undefined,
      model: task.model ?? undefined,
      createdBy: task.createdById,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  private toItemResponse(item: ContentItem): ContentItemResponse {
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
      errorMessage: item.errorMessage ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  private toKnowledgeBaseResponse(knowledgeBase: KnowledgeBase): RelatedKnowledgeBaseResponse {
    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      productLine: knowledgeBase.productLine ?? undefined,
      description: knowledgeBase.description ?? undefined,
      status: knowledgeBase.status
    };
  }

  private toInstructionTemplateResponse(
    instructionTemplate: InstructionTemplate
  ): RelatedInstructionTemplateResponse {
    return {
      id: instructionTemplate.id,
      name: instructionTemplate.name,
      instructionType: instructionTemplate.instructionType,
      contentType: instructionTemplate.contentType,
      targetModel: instructionTemplate.targetModel ?? undefined
    };
  }

  private toGeoPromptResponse(prompt: GeoPrompt): RelatedGeoPromptResponse {
    return {
      id: prompt.id,
      type: prompt.type,
      promptText: prompt.promptText,
      productLine: prompt.productLine ?? undefined,
      scenario: prompt.scenario ?? undefined
    };
  }

  private toAiCallLogResponse(log: AiCallLog): AiCallLogResponse {
    return {
      id: log.id,
      provider: log.provider,
      model: log.model,
      purpose: log.purpose,
      relatedType: log.relatedType ?? undefined,
      relatedId: log.relatedId ?? undefined,
      status: log.status,
      createdAt: log.createdAt
    };
  }

  private uniquePrompts(prompts: GeoPrompt[]): GeoPrompt[] {
    const seen = new Set<string>();
    return prompts.filter((prompt) => {
      if (seen.has(prompt.id)) {
        return false;
      }
      seen.add(prompt.id);
      return true;
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

    const contentEditor = await this.prisma.user.findFirst({
      where: {
        role: UserRole.content_editor,
        status: UserStatus.active
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    });

    if (contentEditor) {
      return contentEditor.id;
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

function tryParseJsonFromAiText(text: string): unknown {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? extractJsonBlock(trimmed) ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function extractJsonBlock(text: string): string | undefined {
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  return objectStart >= 0 && objectEnd > objectStart
    ? text.slice(objectStart, objectEnd + 1)
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function buildProjectProfilePromptContext(profile?: ProjectProfileResponse | null): string {
  if (!profile) {
    return "尚未配置项目档案。内容生成仍需严格依据知识库、目标提示词、用户输入和指令模板，不得补充未经证实的品牌或行业事实。";
  }

  const lines = [
    `项目名称：${profile.projectName}`,
    profile.companyName ? `企业名称：${profile.companyName}` : undefined,
    profile.brandName ? `品牌名称：${profile.brandName}` : undefined,
    profile.websiteUrl ? `官网：${profile.websiteUrl}` : undefined,
    profile.industry ? `所属行业：${profile.industry}` : undefined,
    profile.mainProducts.length > 0
      ? `主营产品 / 服务 / 课程 / 门店 / 个人品牌方向：${profile.mainProducts.join("、")}`
      : undefined,
    profile.targetCustomers ? `目标客户：${profile.targetCustomers}` : undefined,
    profile.positioning ? `品牌定位：${profile.positioning}` : undefined,
    profile.tone ? `内容语气：${profile.tone}` : undefined,
    profile.forbiddenClaims.length > 0
      ? `禁止表达：${profile.forbiddenClaims.join("；")}`
      : undefined,
    profile.targetModels.length > 0
      ? `目标 AI 平台：${profile.targetModels.join("、")}`
      : undefined,
    profile.notes ? `补充说明：${profile.notes}` : undefined
  ].filter(Boolean);

  return [
    ...lines,
    "使用规则：项目档案只提供品牌语气、受众、定位和基础上下文；具体型号、参数、价格、认证、案例、效果承诺和行业数据仍必须来自知识库或本次任务输入。"
  ].join("\n");
}

function summarizeText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}
