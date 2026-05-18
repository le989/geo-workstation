import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  GeoPromptType,
  Prisma,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility,
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
import {
  buildResourceReadWhere,
  getCurrentCompanyId,
  resolveCreateVisibility,
  type ResourceAccessContext
} from "../auth/auth-policy";
import {
  assertCanManageCompanyTask,
  buildTaskReadWhere,
  buildTaskReadWhereById,
  resolveTaskCreateData
} from "../auth/task-policy";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const ANALYSIS_PROMPT_SOURCE_PREFIX = "geo_analysis:";

type GeoAnalysisTaskWithResults = GeoAnalysisTask & {
  modelResults: GeoModelResult[];
};

export type GeoAnalysisTaskResponse = {
  id: string;
  companyId?: string;
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

  async findMany(
    query: QueryGeoAnalysisTasksDto,
    context?: ResourceAccessContext
  ): Promise<GeoAnalysisTaskListResponse> {
    const normalized = normalizeQueryGeoAnalysisTasks(query);
    const where = this.buildWhere(normalized, context);

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

  async create(
    input: CreateGeoAnalysisTaskDto,
    context?: ResourceAccessContext
  ): Promise<GeoAnalysisTaskResponse> {
    const normalized = normalizeCreateGeoAnalysisTask(input);
    const createdById = context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
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
        ...(context
          ? resolveTaskCreateData(context)
          : {
              createdBy: {
                connect: {
                  id: createdById
                }
              }
            })
      }
    });

    return this.toTaskResponse(task);
  }

  async getDetail(
    id: string,
    context?: ResourceAccessContext
  ): Promise<GeoAnalysisTaskDetailResponse> {
    const task = await this.findTaskWithResults(id, context);
    const relatedPrompts = await this.findRelatedPrompts(id, context);

    return {
      task: this.toTaskResponse(task),
      modelResults: task.modelResults.map((result) => this.toModelResultResponse(result)),
      relatedPrompts,
      relatedContentTasks: []
    };
  }

  async update(
    id: string,
    input: UpdateGeoAnalysisTaskDto,
    context?: ResourceAccessContext
  ): Promise<GeoAnalysisTaskResponse> {
    const task = await this.findTask(id, context);

    if (task.status === TaskStatus.running) {
      throw new BadRequestException("running GEO analysis task cannot be edited");
    }
    if (context) {
      assertCanManageCompanyTask(context, task);
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
          : {}),
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

    return this.toTaskResponse(updated);
  }

  async archive(
    id: string,
    context?: ResourceAccessContext
  ): Promise<GeoAnalysisTaskResponse> {
    const task = await this.findTask(id, context);

    if (task.status === TaskStatus.running) {
      throw new BadRequestException("running GEO analysis task cannot be archived");
    }
    if (context) {
      assertCanManageCompanyTask(context, task);
    }

    if (task.status === TaskStatus.cancelled) {
      return this.toTaskResponse(task);
    }

    const archived = await this.prisma.geoAnalysisTask.update({
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

  async run(id: string, context?: ResourceAccessContext): Promise<GeoAnalysisTaskDetailResponse> {
    const task = await this.findTask(id, context);

    if (task.status === TaskStatus.running) {
      throw new BadRequestException("running GEO analysis task cannot be executed again");
    }
    if (task.status === TaskStatus.cancelled) {
      throw new BadRequestException("archived GEO analysis task cannot be run");
    }
    if (context) {
      assertCanManageCompanyTask(context, task);
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

      return this.getDetail(id, context);
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
    input: ConvertAnalysisPromptsDto,
    context?: ResourceAccessContext
  ): Promise<ConvertAnalysisPromptsResponse> {
    const task = await this.findTask(id, context);
    if (task.status === TaskStatus.cancelled) {
      throw new BadRequestException("archived GEO analysis task cannot be converted to prompts");
    }
    if (context) {
      assertCanManageCompanyTask(context, task);
    }
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

    const createdById = context?.user.id ?? (await this.resolveCreatedById(normalized.createdBy));
    const visibility = context ? resolveCreateVisibility(context) : undefined;
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
          deletedAt: null,
          ...(context
            ? {
                companyId: getCurrentCompanyId(context)
              }
            : {})
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
          ...(context
            ? {
                company: {
                  connect: {
                    id: getCurrentCompanyId(context)
                  }
                },
                visibility: visibility ?? Visibility.COMPANY,
                updatedBy: {
                  connect: {
                    id: context.user.id
                  }
                }
              }
            : {}),
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
    input: CreateAnalysisContentTaskDto,
    context?: ResourceAccessContext
  ): Promise<ContentTaskDetailResponse> {
    const task = await this.findTask(id, context);
    if (task.status === TaskStatus.cancelled) {
      throw new BadRequestException("archived GEO analysis task cannot create content tasks");
    }
    if (context) {
      assertCanManageCompanyTask(context, task);
    }
    const normalized = normalizeCreateAnalysisContentTask(input);
    const geoPromptIds = await this.resolveContentTaskPromptIds(task, normalized, context);

    return this.contentTasksService.create(
      {
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
      },
      context
    );
  }

  private buildWhere(
    query: NormalizedQueryGeoAnalysisTasks,
    context?: ResourceAccessContext
  ): Prisma.GeoAnalysisTaskWhereInput {
    const filterWhere: Prisma.GeoAnalysisTaskWhereInput = {};

    if (query.search) {
      filterWhere.OR = [
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
      filterWhere.status = query.status;
    } else {
      filterWhere.status = {
        not: TaskStatus.cancelled
      };
    }
    if (query.productLine) {
      filterWhere.productLine = query.productLine;
    }
    if (query.createdBy) {
      filterWhere.createdById = query.createdBy;
    }
    if (query.createdFrom || query.createdTo) {
      filterWhere.createdAt = {
        ...(query.createdFrom ? { gte: query.createdFrom } : {}),
        ...(query.createdTo ? { lte: query.createdTo } : {})
      };
    }

    return context
      ? {
          AND: [buildTaskReadWhere(context), filterWhere]
        }
      : filterWhere;
  }

  private async resolveContentTaskPromptIds(
    task: GeoAnalysisTask,
    input: NormalizedCreateAnalysisContentTask,
    context?: ResourceAccessContext
  ): Promise<string[]> {
    if (input.geoPromptIds.length > 0) {
      if (context) {
        await this.assertGeoPromptsReadable(input.geoPromptIds, context);
      }
      return input.geoPromptIds;
    }

    const relatedPrompts = await this.findRelatedPrompts(task.id, context);

    if (relatedPrompts.length > 0) {
      return relatedPrompts.map((prompt) => prompt.id);
    }

    const converted = await this.convertPrompts(task.id, {
      createdBy: input.createdBy
    }, context);

    if (converted.createdItems.length > 0) {
      return converted.createdItems.map((prompt) => prompt.id);
    }

    const existingPromptIds = await this.findExistingPromptIdsFromSuggestions(task, context);

    if (existingPromptIds.length === 0) {
      throw new BadRequestException(
        "No converted GEO prompts are available for creating a content task"
      );
    }

    return existingPromptIds;
  }

  private async findExistingPromptIdsFromSuggestions(
    task: GeoAnalysisTask,
    context?: ResourceAccessContext
  ): Promise<string[]> {
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
        deletedAt: null,
        ...(context
          ? {
              companyId: getCurrentCompanyId(context)
            }
          : {})
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

  private async assertGeoPromptsReadable(
    ids: string[],
    context: ResourceAccessContext
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        AND: [
          {
            id: {
              in: ids
            },
            deletedAt: null
          },
          buildResourceReadWhere(context)
        ]
      },
      select: {
        id: true
      }
    });
    const promptById = new Set(prompts.map((prompt) => prompt.id));
    const missingIds = ids.filter((id) => !promptById.has(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(`GEO prompts not found or inaccessible: ${missingIds.join(", ")}`);
    }
  }

  private async findTask(
    id: string,
    context?: ResourceAccessContext
  ): Promise<GeoAnalysisTask> {
    const task = await this.prisma.geoAnalysisTask.findFirst({
      where: context ? buildTaskReadWhereById(id, context) : { id }
    });

    if (!task) {
      throw new NotFoundException(`GEO analysis task not found: ${id}`);
    }

    return task;
  }

  private async findTaskWithResults(
    id: string,
    context?: ResourceAccessContext
  ): Promise<GeoAnalysisTaskWithResults> {
    const task = await this.prisma.geoAnalysisTask.findFirst({
      where: context ? buildTaskReadWhereById(id, context) : { id },
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

  private async findRelatedPrompts(
    id: string,
    context?: ResourceAccessContext
  ): Promise<RelatedAnalysisPromptResponse[]> {
    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        source: this.analysisPromptSource(id),
        deletedAt: null,
        ...(context
          ? {
              companyId: getCurrentCompanyId(context)
            }
          : {})
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
      companyId: task.companyId ?? undefined,
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
