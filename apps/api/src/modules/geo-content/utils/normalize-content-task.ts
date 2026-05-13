import { BadRequestException } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import type { CreateContentTaskDto } from "../dto/create-content-task.dto";
import { toOptionalInt, toStringArray } from "../dto/content-dto-transforms";
import type { QueryContentTasksDto } from "../dto/query-content-tasks.dto";

const DEFAULT_PROVIDER = "mock";
const DEFAULT_MODEL = "mock-content-v1";

export type NormalizedCreateContentTask = {
  name: string;
  productLine?: string;
  knowledgeBaseId?: string;
  instructionTemplateId?: string;
  generationType: string;
  targetModel?: string;
  provider: string;
  model?: string;
  geoPromptIds: string[];
  createdBy?: string;
};

export type NormalizedQueryContentTasks = {
  page: number;
  pageSize: number;
  search?: string;
  productLine?: string;
  status?: TaskStatus;
  generationType?: string;
  targetModel?: string;
  createdBy?: string;
};

export function normalizeCreateContentTask(
  input: CreateContentTaskDto
): NormalizedCreateContentTask {
  const provider = trimOptional(input.provider) ?? DEFAULT_PROVIDER;
  const normalized = {
    name: trimRequired(input.name),
    productLine: trimOptional(input.productLine),
    knowledgeBaseId: trimOptional(input.knowledgeBaseId),
    instructionTemplateId: trimOptional(input.instructionTemplateId),
    generationType: trimRequired(input.generationType),
    targetModel: trimOptional(input.targetModel),
    provider,
    model: trimOptional(input.model) ?? (provider === DEFAULT_PROVIDER ? DEFAULT_MODEL : undefined),
    geoPromptIds: uniqueStrings(toStringArray(input.geoPromptIds)),
    createdBy: trimOptional(input.createdBy)
  };

  assertRequired("GEO content task name", normalized.name);
  assertRequired("GEO content generation type", normalized.generationType);

  if (normalized.geoPromptIds.length === 0) {
    throw new BadRequestException("GEO content task requires at least one GEO prompt.");
  }

  return normalized;
}

export function normalizeQueryContentTasks(
  input: QueryContentTasksDto,
  defaultPage = 1,
  defaultPageSize = 20
): NormalizedQueryContentTasks {
  return {
    page: Math.max(toOptionalInt(input.page) ?? defaultPage, 1),
    pageSize: Math.min(Math.max(toOptionalInt(input.pageSize) ?? defaultPageSize, 1), 100),
    search: trimOptional(input.search),
    productLine: trimOptional(input.productLine),
    status: normalizeTaskStatus(input.status),
    generationType: trimOptional(input.generationType),
    targetModel: trimOptional(input.targetModel),
    createdBy: trimOptional(input.createdBy)
  };
}

export function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function trimRequired(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function assertRequired(label: string, value: string): void {
  if (value.length === 0) {
    throw new BadRequestException(`${label} cannot be empty`);
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeTaskStatus(value: unknown): TaskStatus | undefined {
  const normalized = trimOptional(value);

  if (!normalized) {
    return undefined;
  }

  if (Object.values(TaskStatus).includes(normalized as TaskStatus)) {
    return normalized as TaskStatus;
  }

  throw new BadRequestException(`Unsupported GEO content task status: ${normalized}`);
}
