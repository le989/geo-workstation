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
import { PrismaService } from "../../prisma/prisma.service";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";

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
    @Inject(MockAiExpansionProvider) private readonly mockAiProvider: MockAiExpansionProvider
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
    const inputPayload = compactJson({
      ...normalized,
      expansionKind: "ai_mock",
      source: "mock_ai_expansion"
    });
    const job = await this.prisma.expansionJob.create({
      data: {
        mode: ExpansionMode.ai,
        promptType: normalized.promptType,
        inputPayload: inputPayload as Prisma.InputJsonValue,
        provider: this.mockAiProvider.provider,
        model: this.mockAiProvider.model,
        status: TaskStatus.running,
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });

    try {
      const aiCandidates = this.mockAiProvider.generate({
        baseWord: normalized.baseWord,
        promptType: normalized.promptType,
        userIntent: normalized.userIntent,
        scenario: normalized.scenario,
        count: normalized.count
      });

      for (const candidate of aiCandidates) {
        await this.createCandidate(job.id, candidate);
      }

      await this.prisma.aiCallLog.create({
        data: {
          provider: this.mockAiProvider.provider,
          model: this.mockAiProvider.model,
          purpose: "geo_prompt_ai_expansion",
          relatedType: "expansion_job",
          relatedId: job.id,
          tokenInput: this.estimateTokenCount(JSON.stringify(inputPayload)),
          tokenOutput: this.estimateTokenCount(
            aiCandidates.map((candidate) => candidate.promptText).join("\n")
          ),
          costEstimate: 0,
          status: AiCallStatus.succeeded
        }
      });

      await this.prisma.expansionJob.update({
        where: {
          id: job.id
        },
        data: {
          status: TaskStatus.succeeded
        }
      });
    } catch (error) {
      await this.prisma.aiCallLog.create({
        data: {
          provider: this.mockAiProvider.provider,
          model: this.mockAiProvider.model,
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
        (job.mode === ExpansionMode.rule ? "rule_expansion" : "mock_ai_expansion"),
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
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
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
