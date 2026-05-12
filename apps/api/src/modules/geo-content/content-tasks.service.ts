import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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
import { generateMockGeoContent } from "./utils/mock-content-generator";
import { jsonStringArray } from "./utils/normalize-content-item";
import {
  normalizeCreateContentTask,
  normalizeQueryContentTasks,
  trimOptional,
  type NormalizedCreateContentTask,
  type NormalizedQueryContentTasks
} from "./utils/normalize-content-task";
import { PrismaService } from "../../prisma/prisma.service";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const AI_CALL_PURPOSE = "content_generation";
const AI_CALL_RELATED_TYPE = "content_task";

export type ContentTaskResponse = {
  id: string;
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

@Injectable()
export class ContentTasksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(query: QueryContentTasksDto): Promise<ContentTaskListResponse> {
    const normalized = normalizeQueryContentTasks(query);
    const where = this.buildWhere(normalized);

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

  async create(input: CreateContentTaskDto): Promise<ContentTaskDetailResponse> {
    const normalized = normalizeCreateContentTask(input);
    const createdById = await this.resolveCreatedById(normalized.createdBy);
    const prompts = await this.findActiveGeoPrompts(normalized.geoPromptIds);
    const knowledgeBase = await this.findOptionalKnowledgeBase(normalized.knowledgeBaseId);
    const instructionTemplate = await this.findOptionalInstructionTemplate(
      normalized.instructionTemplateId
    );
    const knowledgeChunks = knowledgeBase ? await this.findKnowledgeChunks(knowledgeBase.id) : [];

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
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });

    const createdItems: ContentItem[] = [];
    let failedCount = 0;

    for (const prompt of prompts) {
      try {
        const generated = generateMockGeoContent({
          geoPrompt: prompt,
          knowledgeChunks,
          instructionTemplate,
          generationType: normalized.generationType,
          productLine: normalized.productLine,
          targetModel: normalized.targetModel
        });
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
            status: "draft"
          }
        });
        createdItems.push(item);
      } catch (error) {
        failedCount += 1;
        const item = await this.createFailedContentItem(task.id, prompt, error);
        createdItems.push(item);
      }
    }

    const nextStatus = failedCount === 0 ? TaskStatus.succeeded : TaskStatus.failed;
    await this.prisma.contentTask.update({
      where: {
        id: task.id
      },
      data: {
        status: nextStatus
      }
    });
    await this.recordAiCall(normalized, task.id, nextStatus, prompts, createdItems);

    return this.getDetail(task.id);
  }

  async getDetail(id: string): Promise<ContentTaskDetailResponse> {
    const task = await this.prisma.contentTask.findUnique({
      where: {
        id
      },
      include: {
        knowledgeBase: true,
        instructionTemplate: true,
        contentItems: {
          where: {
            deletedAt: null
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
        relatedId: id
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

  async retry(id: string): Promise<ContentTaskDetailResponse> {
    const task = await this.findExistingTask(id);
    const activeItems = await this.prisma.contentItem.findMany({
      where: {
        taskId: id,
        deletedAt: null
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
      ? await this.findKnowledgeChunks(task.knowledgeBaseId)
      : [];
    const instructionTemplate = task.instructionTemplateId
      ? await this.findOptionalInstructionTemplate(task.instructionTemplateId)
      : undefined;

    await this.prisma.contentTask.update({
      where: {
        id
      },
      data: {
        status: TaskStatus.running
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
            errorMessage: "Related GEO prompt is missing or deleted."
          }
        });
        continue;
      }

      try {
        const generated = generateMockGeoContent({
          geoPrompt: item.geoPrompt,
          knowledgeChunks,
          instructionTemplate,
          generationType: task.generationType,
          productLine: task.productLine ?? undefined,
          targetModel: task.targetModel ?? undefined
        });
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
            errorMessage: null
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
            errorMessage: error instanceof Error ? error.message : "Mock content generation failed."
          }
        });
      }
    }

    const remainingFailedCount = await this.prisma.contentItem.count({
      where: {
        taskId: id,
        deletedAt: null,
        status: "failed"
      }
    });
    const nextStatus =
      failedCount === 0 && remainingFailedCount === 0 ? TaskStatus.succeeded : TaskStatus.failed;
    await this.prisma.contentTask.update({
      where: {
        id
      },
      data: {
        status: nextStatus
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
        provider: task.provider ?? "mock",
        model: task.model ?? "mock-content-v1",
        geoPromptIds: activeItems
          .map((item) => item.geoPromptId)
          .filter((promptId): promptId is string => Boolean(promptId))
      },
      id,
      nextStatus,
      activeItems
        .map((item) => item.geoPrompt)
        .filter((prompt): prompt is GeoPrompt => Boolean(prompt)),
      activeItems
    );

    return this.getDetail(id);
  }

  private buildWhere(query: NormalizedQueryContentTasks): Prisma.ContentTaskWhereInput {
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

    return where;
  }

  private async findExistingTask(id: string): Promise<ContentTask> {
    const task = await this.prisma.contentTask.findUnique({
      where: {
        id
      }
    });

    if (!task) {
      throw new NotFoundException(`GEO content task not found: ${id}`);
    }

    return task;
  }

  private async findActiveGeoPrompts(ids: string[]): Promise<GeoPrompt[]> {
    const prompts = await this.prisma.geoPrompt.findMany({
      where: {
        id: {
          in: ids
        },
        deletedAt: null
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

  private async findOptionalKnowledgeBase(id?: string): Promise<KnowledgeBase | undefined> {
    if (!id) {
      return undefined;
    }

    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!knowledgeBase) {
      throw new BadRequestException(`GEO knowledge base not found or deleted: ${id}`);
    }

    return knowledgeBase;
  }

  private async findOptionalInstructionTemplate(
    id?: string | null
  ): Promise<InstructionTemplate | undefined> {
    if (!id) {
      return undefined;
    }

    const instructionTemplate = await this.prisma.instructionTemplate.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!instructionTemplate) {
      throw new BadRequestException(`GEO instruction template not found or deleted: ${id}`);
    }

    return instructionTemplate;
  }

  private async findKnowledgeChunks(knowledgeBaseId: string): Promise<KnowledgeChunk[]> {
    return this.prisma.knowledgeChunk.findMany({
      where: {
        knowledgeBaseId,
        deletedAt: null
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
    error: unknown
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
        title: `Mock GEO内容生成失败：${prompt.promptText}`,
        body: "Mock 内容生成失败占位内容，用于保留 GEO 提示词与任务的重试关系。",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Mock content generation failed."
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
    items: Array<ContentItem | { body?: string }>
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
        provider: input.provider,
        model: input.model,
        purpose: AI_CALL_PURPOSE,
        relatedType: AI_CALL_RELATED_TYPE,
        relatedId: taskId,
        tokenInput: this.estimateTokenCount(inputText),
        tokenOutput: this.estimateTokenCount(outputText),
        costEstimate: 0,
        status: status === TaskStatus.failed ? AiCallStatus.failed : AiCallStatus.succeeded
      }
    });
  }

  private estimateTokenCount(text: string): number {
    return Math.max(Math.ceil(text.length / 4), 1);
  }

  private toTaskResponse(task: ContentTask): ContentTaskResponse {
    return {
      id: task.id,
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
