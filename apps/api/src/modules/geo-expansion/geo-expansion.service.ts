import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AiCallStatus,
  ExpansionMode,
  GeoPromptType,
  Prisma,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility,
  type ExpansionCandidate,
  type ExpansionJob
} from "@prisma/client";
import {
  buildOwnerCompanyReadWhereById,
  resolveOwnerCompanyCreateData,
  assertCanManageOwnerCompanyResource
} from "../auth/owner-company-policy";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  resolveCreateVisibility,
  type ResourceAccessContext
} from "../auth/auth-policy";
import type { AiGenerateExpansionDto } from "./dto/ai-generate-expansion.dto";
import type { RuleGenerateExpansionDto } from "./dto/rule-generate-expansion.dto";
import type { SaveExpansionCandidatesDto } from "./dto/save-expansion-candidates.dto";
import { AiProviderService } from "../ai/ai-provider.service";
import {
  isMockAiProvider,
  normalizeAiProvider,
  type GenerateTextResult
} from "../ai/ai-provider.interface";
import { assertMockProviderAllowed } from "../ai/ai-provider-policy";
import { generateExpansionCombinations } from "./utils/expansion-combination.util";
import {
  MockAiExpansionProvider,
  type MockAiExpansionCandidate
} from "./utils/mock-ai-expansion-provider";
import {
  compactJson,
  normalizeAiExpansionInput,
  normalizeRuleExpansionInput,
  normalizeSaveExpansionCandidatesInput
} from "./utils/normalize-expansion-candidate.util";
import {
  ProjectProfileService,
  type ProjectProfileResponse
} from "../project-profile/project-profile.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiUsageService } from "../usage/ai-usage.service";
import { OperationLogsService } from "../usage/operation-logs.service";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const GLOBAL_AI_EXPANSION_RULES = [
  "生成的是用户可能会问 AI 的自然语言问题或明确搜索意图，而不是普通 SEO 关键词堆砌。",
  "围绕用户决策场景展开：需求决策、问题诊断、场景方案、对比替代、信任验证、行动前准备。",
  "不要生成虚假型号、虚假参数、虚假认证、虚假价格、虚假库存或未经提供的客户案例。",
  "不要把不存在于输入中的品牌、型号、认证、协议或具体数值扩写成候选词。",
  "候选词只进入 expansion_candidates，不会直接写入 GEO 提示词库，必须等待人工选择保存。",
  "候选词应服务于后续 GEO 内容生成、模型覆盖记录和优化复盘。"
];
const AI_EXPANSION_CONTENT_DIRECTIONS = [
  "需求决策指南",
  "问题诊断与改善建议",
  "FAQ 与顾虑解答",
  "场景解决方案",
  "对比与替代方案",
  "信任建立与品牌证明",
  "行动前准备清单",
  "案例复盘与结果证明"
];
const LOW_QUALITY_SHORT_SUFFIXES = ["厂家", "价格", "品牌", "官网", "多少钱", "哪家好"];
const OVER_PROMISE_TERMS = [
  "保证",
  "一定",
  "最好",
  "第一",
  "100%",
  "百分百",
  "绝对",
  "包过",
  "零风险"
];

export type ExpansionJobResponse = {
  id: string;
  companyId?: string;
  mode: ExpansionMode;
  promptType: GeoPromptType;
  provider?: string;
  model?: string;
  status: TaskStatus;
  inputPayload: Record<string, unknown>;
  baseWord?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpansionCandidateResponse = {
  id: string;
  jobId: string;
  baseWord?: string;
  promptText: string;
  userIntent?: UserIntent;
  priority: number;
  recommendedContentType?: string;
  selected: boolean;
  savedPromptId: string | null;
  createdAt: Date;
  duplicateInBatch: boolean;
  duplicateInDatabase: boolean;
  duplicateReason: "duplicate_in_batch" | "duplicate_in_database" | null;
  saveStatus: "pending" | "saved" | "duplicate_in_batch" | "duplicate_in_database";
};

export type ExpansionJobDetailResponse = {
  job: ExpansionJobResponse;
  candidates: ExpansionCandidateResponse[];
};

export type SavedExpansionCandidateItem = {
  candidateId: string;
  geoPromptId: string;
  promptText: string;
};

export type SkippedExpansionCandidateItem = {
  candidateId: string;
  promptText?: string;
  reason: "duplicate_in_database" | "already_saved";
};

export type FailedExpansionCandidateItem = {
  candidateId: string;
  reason: "candidate_not_found" | "candidate_not_in_job" | "save_failed";
  message?: string;
};

export type SaveExpansionCandidatesResponse = {
  totalSelected: number;
  savedCount: number;
  skippedCount: number;
  failedCount: number;
  savedItems: SavedExpansionCandidateItem[];
  skippedItems: SkippedExpansionCandidateItem[];
  failedItems: FailedExpansionCandidateItem[];
};

@Injectable()
export class GeoExpansionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MockAiExpansionProvider) private readonly mockAiProvider: MockAiExpansionProvider,
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
    private readonly configService?: ConfigService
  ) {}

  async ruleGenerate(
    input: RuleGenerateExpansionDto,
    context?: ResourceAccessContext
  ): Promise<ExpansionJobDetailResponse> {
    const normalized = normalizeRuleExpansionInput(input);
    this.assertBaseWord(normalized.baseWord);
    this.assertCanGenerate(context);
    const createdById = context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
    const inputPayload = compactJson({
      ...normalized,
      expansionKind: "rule"
    });
    const combinations = generateExpansionCombinations(normalized);
    const job = await this.prisma.expansionJob.create({
      data: {
        mode: ExpansionMode.rule,
        promptType: normalized.promptType,
        inputPayload: inputPayload as Prisma.InputJsonValue,
        status: TaskStatus.succeeded,
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

    for (const combination of combinations) {
      await this.prisma.expansionCandidate.create({
        data: {
          job: {
            connect: {
              id: job.id
            }
          },
          baseWord: normalized.baseWord,
          promptText: combination.promptText,
          userIntent: normalized.userIntent,
          priority: normalized.priority,
          recommendedContentType: this.recommendContentType(normalized.userIntent)
        }
      });
    }

    return this.getJob(job.id, context);
  }

  async aiGenerate(
    input: AiGenerateExpansionDto,
    context?: ResourceAccessContext
  ): Promise<ExpansionJobDetailResponse> {
    const normalized = normalizeAiExpansionInput(input);
    this.assertBaseWord(normalized.baseWord);
    this.assertCanGenerate(context);

    if (normalized.promptType === GeoPromptType.base) {
      throw new BadRequestException("AI expansion promptType cannot be base.");
    }

    const provider = normalizeAiProvider(normalized.provider);
    assertMockProviderAllowed(this.configService, provider, "AI 拓词");
    const createdById = context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
    const usesMockProvider = isMockAiProvider(provider);
    const initialModel = usesMockProvider ? this.mockAiProvider.model : normalized.model;
    const inputPayload = compactJson({
      ...normalized,
      provider,
      expansionKind: usesMockProvider ? "ai_mock" : "ai_openai_compatible",
      source: usesMockProvider ? "mock_ai_expansion" : "real_ai_expansion"
    });
    const job = await this.prisma.expansionJob.create({
      data: {
        mode: ExpansionMode.ai,
        promptType: normalized.promptType,
        inputPayload: inputPayload as Prisma.InputJsonValue,
        provider,
        model: initialModel,
        status: TaskStatus.running,
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

    const operationStartedAt = Date.now();

    try {
      const generation = usesMockProvider
        ? this.generateMockExpansionCandidates(normalized, inputPayload)
        : await this.generateRealExpansionCandidates(
            normalized,
            job.id,
            await this.findProjectProfileContext(context)
          );

      for (const candidate of generation.candidates) {
        await this.createCandidate(job.id, candidate);
      }

      await this.prisma.aiCallLog.create({
        data: {
          provider: generation.provider,
          model: generation.model,
          purpose: "geo_prompt_ai_expansion",
          relatedType: "expansion_job",
          relatedId: job.id,
          tokenInput: generation.tokenInput,
          tokenOutput: generation.tokenOutput,
          costEstimate: 0,
          status: AiCallStatus.succeeded,
          ...this.toAiCallLogContextData(context)
        }
      });
      await this.aiUsageService?.recordUsage(
        {
          moduleKey: "expansion",
          action: "ai_generate",
          provider: generation.provider,
          model: generation.model,
          isMock: usesMockProvider,
          promptTokens: generation.tokenInput,
          completionTokens: generation.tokenOutput,
          totalTokens: generation.tokenInput + generation.tokenOutput,
          requestCount: 1,
          success: true,
          latencyMs: generation.latencyMs,
          providerReturnedUsage: usesMockProvider ? undefined : generation.providerReturnedUsage,
          usageUnknown:
            usesMockProvider || generation.providerReturnedUsage === undefined
              ? undefined
              : !generation.providerReturnedUsage,
          metadata: {
            jobId: job.id,
            candidateCount: generation.candidates.length
          }
        },
        context
      );
      await this.operationLogsService?.recordOperation(
        {
          moduleKey: "expansion",
          action: "ai_generate",
          targetType: "expansion_job",
          targetId: job.id,
          targetTitle: normalized.baseWord,
          success: true,
          metadata: {
            provider: generation.provider,
            model: generation.model,
            candidateCount: generation.candidates.length
          }
        },
        context
      );

      await this.prisma.expansionJob.update({
        where: {
          id: job.id
        },
        data: {
          provider: generation.provider,
          model: generation.model,
          status: TaskStatus.succeeded,
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
    } catch (error) {
      await this.prisma.aiCallLog.create({
        data: {
          provider,
          model: initialModel ?? "configured-default",
          purpose: "geo_prompt_ai_expansion",
          relatedType: "expansion_job",
          relatedId: job.id,
          status: AiCallStatus.failed,
          ...this.toAiCallLogContextData(context)
        }
      });
      await this.aiUsageService?.recordUsage(
        {
          moduleKey: "expansion",
          action: "ai_generate",
          provider,
          model: initialModel ?? "configured-default",
          isMock: usesMockProvider,
          requestCount: 1,
          success: false,
          errorMessage: error,
          latencyMs: usesMockProvider ? undefined : Date.now() - operationStartedAt,
          usageUnknown: usesMockProvider ? undefined : true,
          providerReturnedUsage: usesMockProvider ? undefined : false,
          metadata: {
            jobId: job.id
          }
        },
        context
      );
      await this.operationLogsService?.recordOperation(
        {
          moduleKey: "expansion",
          action: "ai_generate",
          targetType: "expansion_job",
          targetId: job.id,
          targetTitle: normalized.baseWord,
          success: false,
          errorMessage: error,
          metadata: {
            provider,
            model: initialModel ?? "configured-default"
          }
        },
        context
      );
      await this.prisma.expansionJob.update({
        where: {
          id: job.id
        },
        data: {
          status: TaskStatus.failed,
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
      throw error;
    }

    return this.getJob(job.id, context);
  }

  async getJob(
    id: string,
    context?: ResourceAccessContext
  ): Promise<ExpansionJobDetailResponse> {
    const job = await this.prisma.expansionJob.findFirst({
      where: context ? buildOwnerCompanyReadWhereById(id, context) : { id },
      include: {
        candidates: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!job) {
      throw new NotFoundException(`Expansion job not found: ${id}`);
    }

    return this.toJobDetailResponse(job, job.candidates, context);
  }

  async saveCandidates(
    jobId: string,
    input: SaveExpansionCandidatesDto,
    context?: ResourceAccessContext
  ): Promise<SaveExpansionCandidatesResponse> {
    const normalized = normalizeSaveExpansionCandidatesInput(input);
    const job = await this.prisma.expansionJob.findFirst({
      where: context ? buildOwnerCompanyReadWhereById(jobId, context) : { id: jobId }
    });

    if (!job) {
      throw new NotFoundException(`Expansion job not found: ${jobId}`);
    }

    if (context) {
      assertCanManageOwnerCompanyResource(context, job, "无权保存当前拓词任务候选词");
    }

    const createdById = context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
    const candidates = await this.prisma.expansionCandidate.findMany({
      where: {
        id: {
          in: normalized.candidateIds
        }
      }
    });
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const savedItems: SavedExpansionCandidateItem[] = [];
    const skippedItems: SkippedExpansionCandidateItem[] = [];
    const failedItems: FailedExpansionCandidateItem[] = [];

    for (const candidateId of normalized.candidateIds) {
      const candidate = candidateById.get(candidateId);

      if (!candidate) {
        failedItems.push({
          candidateId,
          reason: "candidate_not_found"
        });
        continue;
      }

      if (candidate.jobId !== jobId) {
        failedItems.push({
          candidateId,
          reason: "candidate_not_in_job"
        });
        continue;
      }

      if (candidate.savedPromptId || candidate.selected) {
        skippedItems.push({
          candidateId,
          promptText: candidate.promptText,
          reason: "already_saved"
        });
        continue;
      }

      const duplicate = await this.prisma.geoPrompt.findFirst({
        where: this.buildPromptDuplicateWhere(candidate.promptText, context),
        select: {
          id: true
        }
      });

      if (duplicate) {
        skippedItems.push({
          candidateId,
          promptText: candidate.promptText,
          reason: "duplicate_in_database"
        });
        continue;
      }

      try {
        const geoPrompt = await this.prisma.geoPrompt.create({
          data: this.toGeoPromptCreateInput(job, candidate, normalized, createdById, context)
        });
        await this.prisma.expansionCandidate.update({
          where: {
            id: candidate.id
          },
          data: {
            selected: true,
            savedPrompt: {
              connect: {
                id: geoPrompt.id
              }
            }
          }
        });
        candidate.selected = true;
        candidate.savedPromptId = geoPrompt.id;
        savedItems.push({
          candidateId: candidate.id,
          geoPromptId: geoPrompt.id,
          promptText: geoPrompt.promptText
        });
      } catch (error) {
        failedItems.push({
          candidateId,
          reason: "save_failed",
          message: error instanceof Error ? error.message : "Unknown save failure"
        });
      }
    }

    const result = {
      totalSelected: normalized.candidateIds.length,
      savedCount: savedItems.length,
      skippedCount: skippedItems.length,
      failedCount: failedItems.length,
      savedItems,
      skippedItems,
      failedItems
    };
    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "expansion",
        action: "save_candidates",
        targetType: "expansion_job",
        targetId: jobId,
        targetTitle: job.mode,
        success: failedItems.length === 0,
        metadata: {
          totalSelected: result.totalSelected,
          savedCount: result.savedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount
        }
      },
      context
    );

    return result;
  }

  private generateMockExpansionCandidates(
    input: ReturnType<typeof normalizeAiExpansionInput>,
    inputPayload: Record<string, unknown>
  ): {
    candidates: MockAiExpansionCandidate[];
    provider: string;
    model: string;
    tokenInput: number;
    tokenOutput: number;
    providerReturnedUsage?: boolean;
    latencyMs?: number;
  } {
    const candidates = this.ensureQualityCandidates(
      this.mockAiProvider.generate({
        baseWord: input.baseWord,
        promptType: input.promptType,
        userIntent: input.userIntent,
        scenario: input.scenario,
        count: input.count
      }),
      input
    );

    return {
      candidates,
      provider: this.mockAiProvider.provider,
      model: this.mockAiProvider.model,
      tokenInput: this.estimateTokenCount(JSON.stringify(inputPayload)),
      tokenOutput: this.estimateTokenCount(
        candidates.map((candidate) => candidate.promptText).join("\n")
      )
    };
  }

  private async generateRealExpansionCandidates(
    input: ReturnType<typeof normalizeAiExpansionInput>,
    jobId: string,
    projectProfile?: ProjectProfileResponse | null
  ): Promise<{
    candidates: MockAiExpansionCandidate[];
    provider: string;
    model: string;
    tokenInput: number;
    tokenOutput: number;
    providerReturnedUsage?: boolean;
    latencyMs?: number;
  }> {
    const promptText = this.buildRealExpansionPrompt(input, projectProfile);
    const aiStartedAt = Date.now();
    const result = await this.requireAiProviderService().generateText({
      provider: input.provider,
      model: input.model,
      purpose: "geo_prompt_ai_expansion",
      relatedType: "expansion_job",
      relatedId: jobId,
      temperature: 0.4,
      maxTokens: 1800,
      systemPrompt:
        "你是 GEO 营销运营专家。请生成面向生成式 AI 搜索/问答场景的提示词候选，只输出 JSON；生成结果只是候选词等待人工选择。",
      userPrompt: promptText
    });
    const candidates = this.parseRealExpansionCandidates(result, input);

    return {
      candidates,
      provider: result.provider,
      model: result.model,
      tokenInput: result.tokenInput ?? this.estimateTokenCount(promptText),
      tokenOutput:
        result.tokenOutput ??
        this.estimateTokenCount(candidates.map((candidate) => candidate.promptText).join("\n")),
      providerReturnedUsage: result.tokenInput !== undefined || result.tokenOutput !== undefined,
      latencyMs: Date.now() - aiStartedAt
    };
  }

  private buildRealExpansionPrompt(
    input: ReturnType<typeof normalizeAiExpansionInput>,
    projectProfile?: ProjectProfileResponse | null
  ): string {
    return [
      "项目档案 / 品牌上下文：",
      buildProjectProfileExpansionContext(projectProfile),
      "",
      `训练词：${input.baseWord}`,
      `提示词类型：${input.promptType}`,
      input.productLine ? `产品线：${input.productLine}` : undefined,
      input.scenario ? `场景：${input.scenario}` : undefined,
      input.userIntent ? `用户意图：${input.userIntent}` : undefined,
      input.constraints ? `约束：${input.constraints}` : undefined,
      `候选数量：${input.count}`,
      "",
      "通用拓词规则：",
      ...GLOBAL_AI_EXPANSION_RULES.map((rule) => `- ${rule}`),
      "",
      "用户决策场景：",
      "- 需求决策：用户不知道怎么选、怎么判断、怎么开始。userIntent 可用 selection 或 purchase。",
      "- 问题诊断：用户遇到问题，需要判断原因和改善路径。userIntent 使用 troubleshooting。",
      "- 场景方案：用户有具体使用场景，需要知道适合什么方案。userIntent 使用 application_solution。",
      "- 对比替代：用户在两个选择之间犹豫。userIntent 使用 comparison 或 domestic_alternative。",
      "- 信任验证：用户判断品牌、机构、门店、个人或服务方是否可信。userIntent 使用 brand_verification 或 manufacturer_recommendation。",
      "- 行动前准备：用户准备咨询、购买、报名、到店或合作前，需要知道该准备什么。userIntent 使用 purchase 或 selection。",
      "",
      "提示词类型倾向：",
      "- distilled：优先生成具体需求、顾虑、对比、准备类问题。",
      "- brand：优先生成品牌信任、服务方判断、资料核验类问题。",
      "- scene：优先生成具体场景、使用条件、适配边界类问题。",
      "- base：不建议作为 AI 拓词输出类型；如果出现，请优先输出 distilled / brand / scene 类型的候选问题。",
      "",
      "priority 判断规则：",
      "- 1：高价值，用户决策意图明确，适合优先追踪或生成内容。",
      "- 2：中高价值，场景明确或问题具体。",
      "- 3：普通价值，可作为补充内容。",
      "- 4：低优先级，偏泛。",
      "- 5：暂不建议优先做。",
      "",
      `recommendedContentType 只能使用：${AI_EXPANSION_CONTENT_DIRECTIONS.join("、")}。`,
      "",
      "请返回 JSON，不要返回 Markdown 代码块：",
      '{ "candidates": [ { "baseWord": "训练词", "promptText": "用户会向 AI 提问的自然语言问题", "userIntent": "selection", "priority": 3, "recommendedContentType": "需求决策指南" } ] }',
      "",
      "要求：",
      "- 候选词必须像真实用户可能会问 AI 的问题。",
      "- 不要宣传口号，不要生成无意义关键词，不要只输出“产品词 + 厂家 / 价格 / 品牌 / 官网”。",
      "- 参考项目档案中的行业、主营方向、目标客户、品牌定位和禁止表达，但不要编造项目档案里没有的具体产品型号、课程效果、门店价格、认证、案例或承诺。",
      "- 生成结果不会直接写入 GEO 提示词库，只作为候选词等待人工选择。",
      "- priority 为 1-5。",
      "- userIntent 只能使用 selection、purchase、manufacturer_recommendation、domestic_alternative、comparison、troubleshooting、application_solution、brand_verification。"
    ]
      .filter(Boolean)
      .join("\n");
  }

  private parseRealExpansionCandidates(
    result: GenerateTextResult,
    input: ReturnType<typeof normalizeAiExpansionInput>
  ): MockAiExpansionCandidate[] {
    const parsed = this.parseJsonFromAiText(result.text);
    const rawCandidates = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.candidates)
        ? parsed.candidates
        : [];
    const candidates = rawCandidates
      .map((candidate) => this.normalizeRealExpansionCandidate(candidate, input))
      .filter((candidate): candidate is MockAiExpansionCandidate => Boolean(candidate));
    const qualityCandidates = this.ensureQualityCandidates(candidates, input);

    if (qualityCandidates.length === 0) {
      throw new BadRequestException("AI Provider 未返回有效 GEO 提示词候选。");
    }

    return qualityCandidates;
  }

  private normalizeRealExpansionCandidate(
    candidate: unknown,
    input: ReturnType<typeof normalizeAiExpansionInput>
  ): MockAiExpansionCandidate | undefined {
    if (!isRecord(candidate)) {
      return undefined;
    }

    const promptText = this.optionalString(candidate.promptText);

    if (!promptText) {
      return undefined;
    }

    const userIntent =
      this.optionalUserIntent(candidate.userIntent) ??
      input.userIntent ??
      this.inferUserIntent(promptText);

    return {
      baseWord: this.optionalString(candidate.baseWord) ?? input.baseWord,
      promptText,
      userIntent,
      priority: clampPriority(
        this.optionalNumber(candidate.priority) ?? this.recommendPriority(promptText, userIntent)
      ),
      recommendedContentType: this.normalizeRecommendedContentType(
        this.optionalString(candidate.recommendedContentType),
        userIntent
      )
    };
  }

  private ensureQualityCandidates(
    candidates: MockAiExpansionCandidate[],
    input: ReturnType<typeof normalizeAiExpansionInput>
  ): MockAiExpansionCandidate[] {
    const filteredCandidates = this.filterQualityCandidates(candidates, input).slice(
      0,
      input.count
    );

    if (filteredCandidates.length === 0) {
      throw new BadRequestException("AI 返回内容质量过低，请调整输入或约束后重试。");
    }

    return filteredCandidates;
  }

  private filterQualityCandidates(
    candidates: MockAiExpansionCandidate[],
    input: ReturnType<typeof normalizeAiExpansionInput>
  ): MockAiExpansionCandidate[] {
    const seenPromptTexts = new Set<string>();
    const qualityCandidates: MockAiExpansionCandidate[] = [];

    for (const candidate of candidates) {
      const promptText = candidate.promptText.trim();
      const normalizedPromptText = normalizeQualityKey(promptText);

      if (
        !normalizedPromptText ||
        seenPromptTexts.has(normalizedPromptText) ||
        this.isLowQualityPromptText(promptText, input)
      ) {
        continue;
      }

      seenPromptTexts.add(normalizedPromptText);
      const userIntent =
        candidate.userIntent ?? input.userIntent ?? this.inferUserIntent(promptText);
      qualityCandidates.push({
        ...candidate,
        promptText,
        userIntent,
        priority: clampPriority(
          candidate.priority ?? this.recommendPriority(promptText, userIntent)
        ),
        recommendedContentType: this.normalizeRecommendedContentType(
          candidate.recommendedContentType,
          userIntent
        )
      });
    }

    return qualityCandidates;
  }

  private isLowQualityPromptText(
    promptText: string,
    input: ReturnType<typeof normalizeAiExpansionInput>
  ): boolean {
    const normalizedPromptText = normalizeQualityKey(promptText);
    const normalizedBaseWord = normalizeQualityKey(input.baseWord);

    if (promptText.trim().length === 0 || countMeaningfulCharacters(promptText) < 6) {
      return true;
    }

    if (normalizedPromptText === normalizedBaseWord) {
      return true;
    }

    if (this.isOverGenericProductCombination(normalizedPromptText, normalizedBaseWord, input)) {
      return true;
    }

    if (containsUnsupportedSpecificClaim(promptText) || containsOverPromise(promptText)) {
      return true;
    }

    return false;
  }

  private isOverGenericProductCombination(
    normalizedPromptText: string,
    normalizedBaseWord: string,
    input: ReturnType<typeof normalizeAiExpansionInput>
  ): boolean {
    if (!normalizedBaseWord) {
      return false;
    }

    const isShortSuffixCombination = LOW_QUALITY_SHORT_SUFFIXES.some(
      (suffix) => normalizedPromptText === `${normalizedBaseWord}${normalizeQualityKey(suffix)}`
    );

    if (!isShortSuffixCombination) {
      return false;
    }

    return (
      input.promptType !== GeoPromptType.brand || !looksLikeCompleteQuestion(normalizedPromptText)
    );
  }

  private inferUserIntent(promptText: string): UserIntent {
    if (/故障|异常|不稳定|误触发|无信号|排查|改善|解决/.test(promptText)) {
      return UserIntent.troubleshooting;
    }

    if (/对比|区别|替代|相比|哪个更|哪种更|进口|国产/.test(promptText)) {
      return UserIntent.comparison;
    }

    if (/场景|方案|适合|应用|使用|怎么用/.test(promptText)) {
      return UserIntent.application_solution;
    }

    if (/可信|靠谱|实力|品牌|服务方|厂家|机构|门店|个人/.test(promptText)) {
      return UserIntent.brand_verification;
    }

    if (/准备|咨询|购买|报名|到店|合作|采购|问清楚/.test(promptText)) {
      return UserIntent.purchase;
    }

    return UserIntent.selection;
  }

  private recommendPriority(promptText: string, userIntent?: UserIntent): number {
    if (
      userIntent === UserIntent.selection ||
      userIntent === UserIntent.application_solution ||
      userIntent === UserIntent.troubleshooting
    ) {
      return 2;
    }

    if (userIntent === UserIntent.purchase || userIntent === UserIntent.brand_verification) {
      return 2;
    }

    if (/怎么选|怎么办|适合|要准备|怎么判断|对比|替代/.test(promptText)) {
      return 2;
    }

    return 3;
  }

  private normalizeRecommendedContentType(
    value: string | undefined,
    userIntent?: UserIntent
  ): string {
    const legacyMapping: Record<string, string> = {
      application_solution: "场景解决方案",
      brand_qa_material: "信任建立与品牌证明",
      comparison_article: "对比与替代方案",
      domestic_alternative_solution: "对比与替代方案",
      faq: "FAQ 与顾虑解答",
      manufacturer_recommendation: "信任建立与品牌证明",
      purchase_guide: "行动前准备清单",
      selection_guide: "需求决策指南"
    };

    if (value) {
      return legacyMapping[value] ?? value;
    }

    return this.recommendContentType(userIntent) ?? "需求决策指南";
  }

  private parseJsonFromAiText(text: string): unknown {
    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() ?? extractJsonBlock(trimmed) ?? trimmed;

    try {
      return JSON.parse(candidate);
    } catch {
      throw new BadRequestException("AI Provider 返回格式不是有效 JSON，无法解析候选词。");
    }
  }

  private requireAiProviderService(): Pick<AiProviderService, "generateText"> {
    if (!this.aiProviderService) {
      throw new BadRequestException("AI Provider Service is not available.");
    }

    return this.aiProviderService;
  }

  private async findProjectProfileContext(
    context?: ResourceAccessContext
  ): Promise<ProjectProfileResponse | null> {
    return this.projectProfileService?.getPromptContext(context) ?? null;
  }

  private async createCandidate(jobId: string, candidate: MockAiExpansionCandidate): Promise<void> {
    await this.prisma.expansionCandidate.create({
      data: {
        job: {
          connect: {
            id: jobId
          }
        },
        baseWord: candidate.baseWord,
        promptText: candidate.promptText,
        userIntent: candidate.userIntent,
        priority: candidate.priority,
        recommendedContentType: candidate.recommendedContentType
      }
    });
  }

  private toGeoPromptCreateInput(
    job: ExpansionJob,
    candidate: ExpansionCandidate,
    input: ReturnType<typeof normalizeSaveExpansionCandidatesInput>,
    createdById: string,
    context?: ResourceAccessContext
  ): Prisma.GeoPromptCreateInput {
    const payload = this.parseInputPayload(job.inputPayload);
    const productLine = input.defaultProductLine ?? this.optionalString(payload.productLine);
    const priority =
      input.defaultPriority ?? candidate.priority ?? this.optionalNumber(payload.priority) ?? 3;
    const trackEnabled =
      input.defaultTrackEnabled ?? this.optionalBoolean(payload.trackEnabled) ?? false;

    return {
      type: job.promptType,
      baseWord: candidate.baseWord ?? this.optionalString(payload.baseWord),
      promptText: candidate.promptText,
      productLine,
      scenario: this.optionalString(payload.scenario),
      userIntent:
        candidate.userIntent ?? this.optionalUserIntent(payload.userIntent) ?? UserIntent.selection,
      priority,
      targetModels: this.optionalStringArray(payload.targetModels),
      source:
        this.optionalString(payload.source) ??
        (job.mode === ExpansionMode.rule
          ? "rule_expansion"
          : job.provider === "mock"
            ? "mock_ai_expansion"
            : "real_ai_expansion"),
      trackEnabled,
      visibility: context ? resolveCreateVisibility(context) : Visibility.COMPANY,
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
            },
            updatedBy: {
              connect: {
                id: context.user.id
              }
            }
          }
        : {
            createdBy: {
              connect: {
                id: createdById
              }
            }
          })
    };
  }

  private async toJobDetailResponse(
    job: ExpansionJob,
    candidates: ExpansionCandidate[],
    context?: ResourceAccessContext
  ): Promise<ExpansionJobDetailResponse> {
    const duplicateCounts = this.countCandidatePromptTexts(candidates);
    const databaseDuplicates = await this.findExistingPromptTexts(
      candidates.map((candidate) => candidate.promptText),
      context
    );

    return {
      job: this.toJobResponse(job),
      candidates: candidates.map((candidate) =>
        this.toCandidateResponse(candidate, duplicateCounts, databaseDuplicates)
      )
    };
  }

  private toJobResponse(job: ExpansionJob): ExpansionJobResponse {
    const inputPayload = this.parseInputPayload(job.inputPayload);

    return {
      id: job.id,
      companyId: job.companyId ?? undefined,
      mode: job.mode,
      promptType: job.promptType,
      provider: job.provider ?? undefined,
      model: job.model ?? undefined,
      status: job.status,
      inputPayload,
      baseWord: this.optionalString(inputPayload.baseWord),
      createdBy: job.createdById,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  private toCandidateResponse(
    candidate: ExpansionCandidate,
    duplicateCounts: Map<string, number>,
    databaseDuplicates: Set<string>
  ): ExpansionCandidateResponse {
    const duplicateInBatch = (duplicateCounts.get(candidate.promptText) ?? 0) > 1;
    const duplicateInDatabase = databaseDuplicates.has(candidate.promptText);
    const duplicateReason = duplicateInDatabase
      ? "duplicate_in_database"
      : duplicateInBatch
        ? "duplicate_in_batch"
        : null;

    return {
      id: candidate.id,
      jobId: candidate.jobId,
      baseWord: candidate.baseWord ?? undefined,
      promptText: candidate.promptText,
      userIntent: candidate.userIntent ?? undefined,
      priority: candidate.priority,
      recommendedContentType: candidate.recommendedContentType ?? undefined,
      selected: candidate.selected,
      savedPromptId: candidate.savedPromptId,
      createdAt: candidate.createdAt,
      duplicateInBatch,
      duplicateInDatabase,
      duplicateReason,
      saveStatus: this.resolveSaveStatus(candidate, duplicateInBatch, duplicateInDatabase)
    };
  }

  private resolveSaveStatus(
    candidate: ExpansionCandidate,
    duplicateInBatch: boolean,
    duplicateInDatabase: boolean
  ): ExpansionCandidateResponse["saveStatus"] {
    if (candidate.savedPromptId || candidate.selected) {
      return "saved";
    }

    if (duplicateInDatabase) {
      return "duplicate_in_database";
    }

    if (duplicateInBatch) {
      return "duplicate_in_batch";
    }

    return "pending";
  }

  private countCandidatePromptTexts(candidates: ExpansionCandidate[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const candidate of candidates) {
      counts.set(candidate.promptText, (counts.get(candidate.promptText) ?? 0) + 1);
    }

    return counts;
  }

  private async findExistingPromptTexts(
    promptTexts: string[],
    context?: ResourceAccessContext
  ): Promise<Set<string>> {
    if (promptTexts.length === 0) {
      return new Set();
    }

    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        promptText: {
          in: promptTexts
        },
        deletedAt: null,
        ...(context
          ? {
              companyId: getCurrentCompanyId(context)
            }
          : {})
      },
      select: {
        promptText: true
      }
    });

    return new Set(prompts.map((prompt) => prompt.promptText));
  }

  private recommendContentType(userIntent: UserIntent | undefined): string | undefined {
    if (!userIntent) {
      return undefined;
    }

    const mapping: Record<UserIntent, string> = {
      [UserIntent.selection]: "需求决策指南",
      [UserIntent.purchase]: "行动前准备清单",
      [UserIntent.manufacturer_recommendation]: "信任建立与品牌证明",
      [UserIntent.domestic_alternative]: "对比与替代方案",
      [UserIntent.comparison]: "对比与替代方案",
      [UserIntent.troubleshooting]: "问题诊断与改善建议",
      [UserIntent.application_solution]: "场景解决方案",
      [UserIntent.brand_verification]: "信任建立与品牌证明"
    };

    return mapping[userIntent];
  }

  private estimateTokenCount(value: string): number {
    return Math.max(1, Math.ceil(value.length / 2));
  }

  private assertBaseWord(baseWord: string): void {
    if (baseWord.trim().length === 0) {
      throw new BadRequestException("baseWord is required for GEO expansion.");
    }
  }

  private assertCanGenerate(context?: ResourceAccessContext): void {
    if (!context) {
      return;
    }

    if (getEffectiveRole(context) === "viewer") {
      throw new ForbiddenException("当前角色无权生成 AI 拓词候选");
    }
  }

  private buildPromptDuplicateWhere(
    promptText: string,
    context?: ResourceAccessContext
  ): Prisma.GeoPromptWhereInput {
    return {
      promptText,
      deletedAt: null,
      ...(context
        ? {
            companyId: getCurrentCompanyId(context)
          }
        : {})
    };
  }

  private toAiCallLogContextData(
    context?: ResourceAccessContext
  ): Pick<Prisma.AiCallLogCreateInput, "company" | "createdBy"> {
    return context
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
      : {};
  }

  private parseInputPayload(inputPayload: Prisma.JsonValue): Record<string, unknown> {
    if (typeof inputPayload === "object" && inputPayload !== null && !Array.isArray(inputPayload)) {
      return inputPayload as Record<string, unknown>;
    }

    return {};
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  private optionalNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : undefined;
    }

    return undefined;
  }

  private optionalBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
    }

    return undefined;
  }

  private optionalStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  private optionalUserIntent(value: unknown): UserIntent | undefined {
    return Object.values(UserIntent).includes(value as UserIntent)
      ? (value as UserIntent)
      : undefined;
  }

  private async resolveCreatedById(createdBy?: string): Promise<string> {
    const normalizedCreatedBy = this.optionalString(createdBy);

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

    const admin = await this.prisma.user.findFirst({
      where: {
        role: UserRole.admin,
        status: UserStatus.active
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    });

    if (admin) {
      return admin.id;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampPriority(value: number): number {
  if (!Number.isFinite(value)) {
    return 3;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 5);
}

function normalizeQualityKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function countMeaningfulCharacters(value: string): number {
  return [...value.replace(/\s+/g, "")].length;
}

function looksLikeCompleteQuestion(normalizedPromptText: string): boolean {
  return /怎么|如何|是否|吗|靠不靠谱|可信|要看|需要|能不能|可不可以/.test(normalizedPromptText);
}

function containsOverPromise(promptText: string): boolean {
  return OVER_PROMISE_TERMS.some((term) => promptText.includes(term));
}

function containsUnsupportedSpecificClaim(promptText: string): boolean {
  return (
    /\d+(?:\.\d+)?\s*(?:元|块|万元|天|小时|分钟|毫秒|ms|毫米|厘米|米|mm|cm|m|kg|mpa|℃|%|年|个月)/i.test(
      promptText
    ) || /(?:认证编号|证书编号|ex\s?[a-z0-9]|ip\d{2})/i.test(promptText)
  );
}

function extractJsonBlock(text: string): string | undefined {
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  const objectCandidate =
    objectStart >= 0 && objectEnd > objectStart
      ? text.slice(objectStart, objectEnd + 1)
      : undefined;
  const arrayCandidate =
    arrayStart >= 0 && arrayEnd > arrayStart ? text.slice(arrayStart, arrayEnd + 1) : undefined;

  if (!objectCandidate) {
    return arrayCandidate;
  }
  if (!arrayCandidate) {
    return objectCandidate;
  }

  return objectStart < arrayStart ? objectCandidate : arrayCandidate;
}

function buildProjectProfileExpansionContext(profile?: ProjectProfileResponse | null): string {
  if (!profile) {
    return "尚未配置项目档案。请仅根据训练词、用户输入和通用 GEO 拓词规则生成候选问题，不要补充未经提供的品牌、行业或项目事实。";
  }

  const lines = [
    `项目名称：${profile.projectName}`,
    profile.companyName ? `企业名称：${profile.companyName}` : undefined,
    profile.brandName ? `品牌名称：${profile.brandName}` : undefined,
    profile.industry ? `所属行业：${profile.industry}` : undefined,
    profile.mainProducts.length > 0
      ? `主营产品 / 服务 / 课程 / 门店 / 个人品牌方向：${profile.mainProducts.join("、")}`
      : undefined,
    profile.targetCustomers ? `目标客户：${profile.targetCustomers}` : undefined,
    profile.positioning ? `品牌定位：${profile.positioning}` : undefined,
    profile.forbiddenClaims.length > 0
      ? `禁止表达：${profile.forbiddenClaims.join("；")}`
      : undefined,
    profile.targetModels.length > 0 ? `目标 AI 平台：${profile.targetModels.join("、")}` : undefined
  ].filter(Boolean);

  return [
    ...lines,
    "使用规则：项目档案用于让候选问题更贴近真实用户需求；不得把未提供的型号、参数、价格、认证、案例、效果承诺或行业数据写成候选词。"
  ].join("\n");
}
