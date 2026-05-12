import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  GeoPromptType,
  Prisma,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  type GeoAnalysisTask,
  type GeoModelResult,
  type GeoPrompt
} from "@prisma/client";
import type { ConvertAnalysisPromptsDto } from "./dto/convert-analysis-prompts.dto";
import type { CreateAnalysisContentTaskDto } from "./dto/create-analysis-content-task.dto";
import type { CreateGeoAnalysisTaskDto } from "./dto/create-geo-analysis-task.dto";
import type { QueryGeoAnalysisTasksDto } from "./dto/query-geo-analysis-tasks.dto";
import type { UpdateGeoAnalysisTaskDto } from "./dto/update-geo-analysis-task.dto";
import {
  ContentTasksService,
  type ContentTaskDetailResponse
} from "../geo-content/content-tasks.service";
import { PrismaService } from "../../prisma/prisma.service";
import { generateMockGeoAnalysis } from "./utils/mock-geo-analysis-generator";
import {
  normalizeAnalysisPromptSuggestions,
  type AnalysisPromptSuggestion
} from "./utils/normalize-analysis-prompt-suggestions";
import {
  normalizeConvertAnalysisPrompts,
  normalizeCreateAnalysisContentTask,
  normalizeCreateGeoAnalysisTask,
  normalizeQueryGeoAnalysisTasks,
  normalizeUpdateGeoAnalysisTask,
  trimOptional,
  type NormalizedCreateAnalysisContentTask,
  type NormalizedQueryGeoAnalysisTasks
} from "./utils/normalize-geo-analysis-task";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const ANALYSIS_PROMPT_SOURCE_PREFIX = "geo_analysis:";

type GeoAnalysisTaskWithResults = GeoAnalysisTask & {
  modelResults: GeoModelResult[];
};

export type GeoAnalysisTaskResponse = {
  id: string;
  name: string;
  brandName: string;
  websiteUrl?: string;
  productLine?: string;
  targetModels: string[];
  status: TaskStatus;
  summary?: Record<string, unknown>;
  contentGaps: string[];
  knowledgeGaps: string[];
  promptSuggestions: AnalysisPromptSuggestion[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GeoModelResultResponse = {
  id: string;
  analysisTaskId: string;
  promptText: string;
  model: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition: number | null;
  citedOfficialSite: boolean;
  answerSummary?: string;
  competitors: string[];
  rawAnswer?: string;
  createdAt: Date;
};

export type RelatedAnalysisPromptResponse = {
  id: string;
  promptText: string;
  type: GeoPromptType;
  productLine?: string;
  userIntent: UserIntent;
  priority: number;
  trackEnabled: boolean;
  source?: string;
};

export type GeoAnalysisTaskListResponse = {
  items: GeoAnalysisTaskResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type GeoAnalysisTaskDetailResponse = {
  task: GeoAnalysisTaskResponse;
  modelResults: GeoModelResultResponse[];
  relatedPrompts: RelatedAnalysisPromptResponse[];
  relatedContentTasks: [];
};

export type ConvertAnalysisPromptsResponse = {
  totalSelected: number;
  createdCount: number;
  skippedCount: number;
  createdItems: RelatedAnalysisPromptResponse[];
  skippedItems: Array<{
    promptText: string;
    reason: string;
  }>;
};

@Injectable()
export class GeoAnalysisTasksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ContentTasksService) private readonly contentTasksService: ContentTasksService
  ) {}

  async findMany(query: QueryGeoAnalysisTasksDto): Promise<GeoAnalysisTaskListResponse> {
    const normalized = normalizeQueryGeoAnalysisTasks(query);
    const where = this.buildWhere(normalized);

    if (normalized.targetModel) {
      const allItems = await this.prisma.geoAnalysisTask.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        }
      });
      const filteredItems = allItems.filter((task) =>
        this.targetModelsInclude(task.targetModels, normalized.targetModel)
      );
      const items = filteredItems.slice(
        (normalized.page - 1) * normalized.pageSize,
        normalized.page * normalized.pageSize
      );

      return {
        items: items.map((item) => this.toTaskResponse(item)),
        total: filteredItems.length,
        page: normalized.page,
        pageSize: normalized.pageSize
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.geoAnalysisTask.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.geoAnalysisTask.count({
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

  async create(input: CreateGeoAnalysisTaskDto): Promise<GeoAnalysisTaskResponse> {
    const normalized = normalizeCreateGeoAnalysisTask(input);
    const createdById = await this.resolveCreatedById(normalized.createdBy);
    const task = await this.prisma.geoAnalysisTask.create({
      data: {
        name: normalized.name,
        brandName: normalized.brandName,
        websiteUrl: normalized.websiteUrl,
        productLine: normalized.productLine,
        targetModels: normalized.targetModels as Prisma.InputJsonValue,
        status: TaskStatus.pending,
        summary: {
          isMock: false,
          inputBaseWords: normalized.baseWords
        },
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });

    return this.toTaskResponse(task);
  }

  async getDetail(id: string): Promise<GeoAnalysisTaskDetailResponse> {
    const task = await this.findTaskWithResults(id);
    const relatedPrompts = await this.findRelatedPrompts(id);

    return {
      task: this.toTaskResponse(task),
      modelResults: task.modelResults.map((result) => this.toModelResultResponse(result)),
      relatedPrompts,
      relatedContentTasks: []
    };
  }

  async update(id: string, input: UpdateGeoAnalysisTaskDto): Promise<GeoAnalysisTaskResponse> {
    const task = await this.findTask(id);

    if (task.status === TaskStatus.running) {
      throw new BadRequestException("running GEO analysis task cannot be edited");
    }

    const normalized = normalizeUpdateGeoAnalysisTask(input);
    const updated = await this.prisma.geoAnalysisTask.update({
      where: {
        id
      },
      data: {
        ...(normalized.name !== undefined ? { name: normalized.name } : {}),
        ...(normalized.brandName !== undefined ? { brandName: normalized.brandName } : {}),
        ...(normalized.websiteUrl !== undefined ? { websiteUrl: normalized.websiteUrl } : {}),
        ...(normalized.productLine !== undefined ? { productLine: normalized.productLine } : {}),
        ...(normalized.targetModels !== undefined
          ? { targetModels: normalized.targetModels as Prisma.InputJsonValue }
          : {})
      }
    });

    return this.toTaskResponse(updated);
  }

  async run(id: string): Promise<GeoAnalysisTaskDetailResponse> {
    const task = await this.findTask(id);

    if (task.status === TaskStatus.running) {
      throw new BadRequestException("running GEO analysis task cannot be executed again");
    }

    const runningTask = await this.prisma.geoAnalysisTask.update({
      where: {
        id
      },
      data: {
        status: TaskStatus.running
      }
    });

    try {
      const mockResult = generateMockGeoAnalysis({
        taskId: runningTask.id,
        name: runningTask.name,
        brandName: runningTask.brandName,
        websiteUrl: runningTask.websiteUrl ?? undefined,
        productLine: runningTask.productLine ?? undefined,
        baseWords: this.extractBaseWords(runningTask.summary),
        targetModels: this.toStringArray(runningTask.targetModels)
      });

      await this.prisma.$transaction([
        this.prisma.geoModelResult.createMany({
          data: mockResult.modelResults.map((result) => ({
            analysisTaskId: runningTask.id,
            promptText: result.promptText,
            model: result.model,
            brandMentioned: result.brandMentioned,
            brandRecommended: result.brandRecommended,
            rankingPosition: result.rankingPosition,
            citedOfficialSite: result.citedOfficialSite,
            answerSummary: result.answerSummary,
            competitors: result.competitors as Prisma.InputJsonValue,
            rawAnswer: result.rawAnswer
          }))
        }),
        this.prisma.geoAnalysisTask.update({
          where: {
            id: runningTask.id
          },
          data: {
            status: TaskStatus.succeeded,
            summary: mockResult.summary as Prisma.InputJsonValue,
            contentGaps: mockResult.contentGaps as Prisma.InputJsonValue,
            knowledgeGaps: mockResult.knowledgeGaps as Prisma.InputJsonValue,
            promptSuggestions: mockResult.promptSuggestions as Prisma.InputJsonValue
          }
        })
      ]);

      return this.getDetail(id);
    } catch (error) {
      await this.prisma.geoAnalysisTask.update({
        where: {
          id
        },
        data: {
          status: TaskStatus.failed,
          summary: {
            isMock: true,
            errorMessage:
              error instanceof Error ? error.message : "Mock GEO analysis execution failed"
          }
        }
      });
      throw error;
    }
  }

  async convertPrompts(
    id: string,
    input: ConvertAnalysisPromptsDto
  ): Promise<ConvertAnalysisPromptsResponse> {
    const task = await this.findTask(id);
    const normalized = normalizeConvertAnalysisPrompts(input);
    const suggestions = normalizeAnalysisPromptSuggestions(task.promptSuggestions);

    if (suggestions.length === 0) {
      throw new BadRequestException("GEO analysis task has no promptSuggestions to convert");
    }

    const selectedPromptTexts = new Set(normalized.selectedPromptTexts);
    const selectedSuggestions =
      selectedPromptTexts.size > 0
        ? suggestions.filter((suggestion) => selectedPromptTexts.has(suggestion.promptText))
        : suggestions;

    if (selectedSuggestions.length === 0) {
      throw new BadRequestException("selectedPromptTexts did not match any promptSuggestions");
    }

    const createdById = await this.resolveCreatedById(normalized.createdBy);
    const createdItems: RelatedAnalysisPromptResponse[] = [];
    const skippedItems: Array<{ promptText: string; reason: string }> = [];
    const seenPromptTexts = new Set<string>();

    for (const suggestion of selectedSuggestions) {
      if (seenPromptTexts.has(suggestion.promptText)) {
        skippedItems.push({
          promptText: suggestion.promptText,
          reason: "duplicate_in_selection"
        });
        continue;
      }

      seenPromptTexts.add(suggestion.promptText);

      const existingPrompt = await this.prisma.geoPrompt.findFirst({
        where: {
          promptText: suggestion.promptText,
          deletedAt: null
        }
      });

      if (existingPrompt) {
        skippedItems.push({
          promptText: suggestion.promptText,
          reason: "duplicate_in_database"
        });
        continue;
      }

      const created = await this.prisma.geoPrompt.create({
        data: {
          type: normalized.promptType,
          baseWord: this.extractBaseWords(task.summary)[0],
          promptText: suggestion.promptText,
          productLine: normalized.productLine ?? task.productLine,
          scenario: `来自 GEO 分析任务：${task.name}`,
          userIntent: normalized.userIntent ?? suggestion.userIntent ?? UserIntent.selection,
          priority: normalized.priority,
          targetModels: this.toStringArray(task.targetModels) as Prisma.InputJsonValue,
          source: this.analysisPromptSource(id),
          trackEnabled: normalized.trackEnabled,
          createdBy: {
            connect: {
              id: createdById
            }
          }
        }
      });
      createdItems.push(this.toRelatedPromptResponse(created));
    }

    return {
      totalSelected: selectedSuggestions.length,
      createdCount: createdItems.length,
      skippedCount: skippedItems.length,
      createdItems,
      skippedItems
    };
  }

  async createContentTask(
    id: string,
    input: CreateAnalysisContentTaskDto
  ): Promise<ContentTaskDetailResponse> {
    const task = await this.findTask(id);
    const normalized = normalizeCreateAnalysisContentTask(input);
    const geoPromptIds = await this.resolveContentTaskPromptIds(task, normalized);

    return this.contentTasksService.create({
      name: normalized.name ?? `${task.name} 内容补齐任务`,
      productLine: task.productLine ?? undefined,
      knowledgeBaseId: normalized.knowledgeBaseId,
      instructionTemplateId: normalized.instructionTemplateId,
      generationType: normalized.generationType,
      targetModel: normalized.targetModel ?? this.toStringArray(task.targetModels)[0],
      provider: "mock",
      model: "mock-content-v1",
      geoPromptIds,
      createdBy: normalized.createdBy
    });
  }

  private buildWhere(query: NormalizedQueryGeoAnalysisTasks): Prisma.GeoAnalysisTaskWhereInput {
    const where: Prisma.GeoAnalysisTaskWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          brandName: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          websiteUrl: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          productLine: {
            contains: query.search,
            mode: "insensitive"
          }
        }
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.productLine) {
      where.productLine = query.productLine;
    }
    if (query.createdBy) {
      where.createdById = query.createdBy;
    }
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {
        ...(query.createdFrom ? { gte: query.createdFrom } : {}),
        ...(query.createdTo ? { lte: query.createdTo } : {})
      };
    }

    return where;
  }

  private async resolveContentTaskPromptIds(
    task: GeoAnalysisTask,
    input: NormalizedCreateAnalysisContentTask
  ): Promise<string[]> {
    if (input.geoPromptIds.length > 0) {
      return input.geoPromptIds;
    }

    const relatedPrompts = await this.findRelatedPrompts(task.id);

    if (relatedPrompts.length > 0) {
      return relatedPrompts.map((prompt) => prompt.id);
    }

    const converted = await this.convertPrompts(task.id, {
      createdBy: input.createdBy
    });

    if (converted.createdItems.length > 0) {
      return converted.createdItems.map((prompt) => prompt.id);
    }

    const existingPromptIds = await this.findExistingPromptIdsFromSuggestions(task);

    if (existingPromptIds.length === 0) {
      throw new BadRequestException(
        "No converted GEO prompts are available for creating a content task"
      );
    }

    return existingPromptIds;
  }

  private async findExistingPromptIdsFromSuggestions(task: GeoAnalysisTask): Promise<string[]> {
    const promptTexts = normalizeAnalysisPromptSuggestions(task.promptSuggestions).map(
      (suggestion) => suggestion.promptText
    );

    if (promptTexts.length === 0) {
      return [];
    }

    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        promptText: {
          in: promptTexts
        },
        deletedAt: null
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const promptByText = new Map(prompts.map((prompt) => [prompt.promptText, prompt]));

    return promptTexts
      .map((promptText) => promptByText.get(promptText)?.id)
      .filter((promptId): promptId is string => Boolean(promptId));
  }

  private async findTask(id: string): Promise<GeoAnalysisTask> {
    const task = await this.prisma.geoAnalysisTask.findUnique({
      where: {
        id
      }
    });

    if (!task) {
      throw new NotFoundException(`GEO analysis task not found: ${id}`);
    }

    return task;
  }

  private async findTaskWithResults(id: string): Promise<GeoAnalysisTaskWithResults> {
    const task = await this.prisma.geoAnalysisTask.findUnique({
      where: {
        id
      },
      include: {
        modelResults: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!task) {
      throw new NotFoundException(`GEO analysis task not found: ${id}`);
    }

    return task;
  }

  private async findRelatedPrompts(id: string): Promise<RelatedAnalysisPromptResponse[]> {
    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        source: this.analysisPromptSource(id),
        deletedAt: null
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return prompts.map((prompt) => this.toRelatedPromptResponse(prompt));
  }

  private targetModelsInclude(value: unknown, targetModel?: string): boolean {
    if (!targetModel) {
      return true;
    }

    return this.toStringArray(value).includes(targetModel);
  }

  private extractBaseWords(summary: unknown): string[] {
    if (!summary || typeof summary !== "object") {
      return [];
    }

    const record = summary as Record<string, unknown>;
    return this.toStringArray(record.inputBaseWords ?? record.baseWords);
  }

  private toTaskResponse(task: GeoAnalysisTask): GeoAnalysisTaskResponse {
    return {
      id: task.id,
      name: task.name,
      brandName: task.brandName,
      websiteUrl: task.websiteUrl ?? undefined,
      productLine: task.productLine ?? undefined,
      targetModels: this.toStringArray(task.targetModels),
      status: task.status,
      summary: this.toJsonObject(task.summary),
      contentGaps: this.toStringArray(task.contentGaps),
      knowledgeGaps: this.toStringArray(task.knowledgeGaps),
      promptSuggestions: normalizeAnalysisPromptSuggestions(task.promptSuggestions),
      createdBy: task.createdById,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  private toModelResultResponse(result: GeoModelResult): GeoModelResultResponse {
    return {
      id: result.id,
      analysisTaskId: result.analysisTaskId,
      promptText: result.promptText,
      model: result.model,
      brandMentioned: result.brandMentioned,
      brandRecommended: result.brandRecommended,
      rankingPosition: result.rankingPosition,
      citedOfficialSite: result.citedOfficialSite,
      answerSummary: result.answerSummary ?? undefined,
      competitors: this.toStringArray(result.competitors),
      rawAnswer: result.rawAnswer ?? undefined,
      createdAt: result.createdAt
    };
  }

  private toRelatedPromptResponse(prompt: GeoPrompt): RelatedAnalysisPromptResponse {
    return {
      id: prompt.id,
      promptText: prompt.promptText,
      type: prompt.type,
      productLine: prompt.productLine ?? undefined,
      userIntent: prompt.userIntent,
      priority: prompt.priority,
      trackEnabled: prompt.trackEnabled,
      source: prompt.source ?? undefined
    };
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => String(item));
  }

  private toJsonObject(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private analysisPromptSource(id: string): string {
    return `${ANALYSIS_PROMPT_SOURCE_PREFIX}${id}`;
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
