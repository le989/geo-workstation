import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  AiCallStatus,
  ExpansionMode,
  GeoPromptType,
  Prisma,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  type ExpansionCandidate,
  type ExpansionJob
} from "@prisma/client";
import type { AiGenerateExpansionDto } from "./dto/ai-generate-expansion.dto";
import type { RuleGenerateExpansionDto } from "./dto/rule-generate-expansion.dto";
import type { SaveExpansionCandidatesDto } from "./dto/save-expansion-candidates.dto";
import { AiProviderService } from "../ai/ai-provider.service";
import {
  isMockAiProvider,
  normalizeAiProvider,
  type GenerateTextResult
} from "../ai/ai-provider.interface";
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

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const GLOBAL_AI_EXPANSION_RULES = [
  "生成的是用户可能会问 AI 的问题，而不是普通关键词堆砌。",
  "不要生成虚假型号、虚假参数、虚假认证、虚假价格、虚假库存或未经提供的客户案例。",
  "不要把不存在于输入中的品牌、型号、认证、协议或具体数值扩写成候选词。",
  "候选词只进入 expansion_candidates，不会直接写入 GEO 提示词库，必须等待人工选择保存。",
  "候选词应服务于后续 GEO 内容生成、模型覆盖记录和优化复盘。"
];

export type ExpansionJobResponse = {
  id: string;
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
    private readonly projectProfileService?: Pick<ProjectProfileService, "getPromptContext">
  ) {}

  async ruleGenerate(input: RuleGenerateExpansionDto): Promise<ExpansionJobDetailResponse> {
    const normalized = normalizeRuleExpansionInput(input);
    this.assertBaseWord(normalized.baseWord);
    const createdById = await this.resolveCreatedById(normalized.createdBy);
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
        createdBy: {
          connect: {
            id: createdById
          }
        }
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

    return this.getJob(job.id);
  }

  async aiGenerate(input: AiGenerateExpansionDto): Promise<ExpansionJobDetailResponse> {
    const normalized = normalizeAiExpansionInput(input);
    this.assertBaseWord(normalized.baseWord);

    if (normalized.promptType === GeoPromptType.base) {
      throw new BadRequestException("AI expansion promptType cannot be base.");
    }

    const createdById = await this.resolveCreatedById(normalized.createdBy);
    const provider = normalizeAiProvider(normalized.provider);
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
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });

    try {
      const generation = usesMockProvider
        ? this.generateMockExpansionCandidates(normalized, inputPayload)
        : await this.generateRealExpansionCandidates(
            normalized,
            job.id,
            await this.findProjectProfileContext()
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
          status: AiCallStatus.succeeded
        }
      });

      await this.prisma.expansionJob.update({
        where: {
          id: job.id
        },
        data: {
          provider: generation.provider,
          model: generation.model,
          status: TaskStatus.succeeded
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
          status: AiCallStatus.failed
        }
      });
      await this.prisma.expansionJob.update({
        where: {
          id: job.id
        },
        data: {
          status: TaskStatus.failed
        }
      });
      throw error;
    }

    return this.getJob(job.id);
  }

  async getJob(id: string): Promise<ExpansionJobDetailResponse> {
    const job = await this.prisma.expansionJob.findUnique({
      where: {
        id
      },
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

    return this.toJobDetailResponse(job, job.candidates);
  }

  async saveCandidates(
    jobId: string,
    input: SaveExpansionCandidatesDto
  ): Promise<SaveExpansionCandidatesResponse> {
    const normalized = normalizeSaveExpansionCandidatesInput(input);
    const job = await this.prisma.expansionJob.findUnique({
      where: {
        id: jobId
      }
    });

    if (!job) {
      throw new NotFoundException(`Expansion job not found: ${jobId}`);
    }

    const createdById = await this.resolveCreatedById(normalized.createdBy);
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
        where: {
          promptText: candidate.promptText,
          deletedAt: null
        },
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
          data: this.toGeoPromptCreateInput(job, candidate, normalized, createdById)
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

    return {
      totalSelected: normalized.candidateIds.length,
      savedCount: savedItems.length,
      skippedCount: skippedItems.length,
      failedCount: failedItems.length,
      savedItems,
      skippedItems,
      failedItems
    };
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
  } {
    const candidates = this.mockAiProvider.generate({
      baseWord: input.baseWord,
      promptType: input.promptType,
      userIntent: input.userIntent,
      scenario: input.scenario,
      count: input.count
    });

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
  }> {
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
      userPrompt: this.buildRealExpansionPrompt(input, projectProfile)
    });
    const candidates = this.parseRealExpansionCandidates(result, input);
    const promptText = this.buildRealExpansionPrompt(input, projectProfile);

    return {
      candidates,
      provider: result.provider,
      model: result.model,
      tokenInput: result.tokenInput ?? this.estimateTokenCount(promptText),
      tokenOutput:
        result.tokenOutput ??
        this.estimateTokenCount(candidates.map((candidate) => candidate.promptText).join("\n"))
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
      "请返回 JSON，不要返回 Markdown 代码块：",
      '{ "candidates": [ { "baseWord": "训练词", "promptText": "用户会向 AI 提问的 GEO 提示词", "userIntent": "selection", "priority": 3, "recommendedContentType": "selection_guide" } ] }',
      "",
      "要求：",
      "- 候选词必须像真实用户可能会问 AI 的问题。",
      "- 不要宣传口号，不要生成无意义关键词。",
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
      .filter((candidate): candidate is MockAiExpansionCandidate => Boolean(candidate))
      .slice(0, input.count);

    if (candidates.length === 0) {
      throw new BadRequestException("AI Provider 未返回有效 GEO 提示词候选。");
    }

    return candidates;
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
      this.optionalUserIntent(candidate.userIntent) ?? input.userIntent ?? UserIntent.selection;

    return {
      baseWord: this.optionalString(candidate.baseWord) ?? input.baseWord,
      promptText,
      userIntent,
      priority: clampPriority(this.optionalNumber(candidate.priority) ?? 3),
      recommendedContentType:
        this.optionalString(candidate.recommendedContentType) ??
        this.recommendContentType(userIntent) ??
        "selection_guide"
    };
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

  private async findProjectProfileContext(): Promise<ProjectProfileResponse | null> {
    return this.projectProfileService?.getPromptContext() ?? null;
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
    createdById: string
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
      createdBy: {
        connect: {
          id: createdById
        }
      }
    };
  }

  private async toJobDetailResponse(
    job: ExpansionJob,
    candidates: ExpansionCandidate[]
  ): Promise<ExpansionJobDetailResponse> {
    const duplicateCounts = this.countCandidatePromptTexts(candidates);
    const databaseDuplicates = await this.findExistingPromptTexts(
      candidates.map((candidate) => candidate.promptText)
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

  private async findExistingPromptTexts(promptTexts: string[]): Promise<Set<string>> {
    if (promptTexts.length === 0) {
      return new Set();
    }

    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        promptText: {
          in: promptTexts
        },
        deletedAt: null
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
      [UserIntent.selection]: "selection_guide",
      [UserIntent.purchase]: "purchase_guide",
      [UserIntent.manufacturer_recommendation]: "manufacturer_recommendation",
      [UserIntent.domestic_alternative]: "domestic_alternative_solution",
      [UserIntent.comparison]: "comparison_article",
      [UserIntent.troubleshooting]: "faq",
      [UserIntent.application_solution]: "application_solution",
      [UserIntent.brand_verification]: "brand_qa_material"
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
