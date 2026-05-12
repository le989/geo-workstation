import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, TaskStatus, UserIntent } from "@prisma/client";
import type { ConvertAnalysisPromptsDto } from "../dto/convert-analysis-prompts.dto";
import type { CreateAnalysisContentTaskDto } from "../dto/create-analysis-content-task.dto";
import type { CreateGeoAnalysisTaskDto } from "../dto/create-geo-analysis-task.dto";
import type { QueryGeoAnalysisTasksDto } from "../dto/query-geo-analysis-tasks.dto";
import type { UpdateGeoAnalysisTaskDto } from "../dto/update-geo-analysis-task.dto";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export type NormalizedCreateGeoAnalysisTask = {
  name: string;
  brandName: string;
  websiteUrl?: string;
  productLine?: string;
  baseWords: string[];
  targetModels: string[];
  createdBy?: string;
};

export type NormalizedUpdateGeoAnalysisTask = {
  name?: string;
  brandName?: string;
  websiteUrl?: string | null;
  productLine?: string | null;
  targetModels?: string[];
};

export type NormalizedQueryGeoAnalysisTasks = {
  page: number;
  pageSize: number;
  search?: string;
  status?: TaskStatus;
  productLine?: string;
  createdBy?: string;
  targetModel?: string;
  createdFrom?: Date;
  createdTo?: Date;
};

export type NormalizedConvertAnalysisPrompts = {
  selectedPromptTexts: string[];
  promptType: GeoPromptType;
  productLine?: string;
  userIntent?: UserIntent;
  priority: number;
  trackEnabled: boolean;
  createdBy?: string;
};

export type NormalizedCreateAnalysisContentTask = {
  name?: string;
  knowledgeBaseId?: string;
  instructionTemplateId?: string;
  generationType: string;
  targetModel?: string;
  geoPromptIds: string[];
  createdBy?: string;
};

export function normalizeCreateGeoAnalysisTask(
  input: CreateGeoAnalysisTaskDto
): NormalizedCreateGeoAnalysisTask {
  const targetModels = uniqueStrings(input.targetModels);

  if (targetModels.length === 0) {
    throw new BadRequestException("targetModels must contain at least one target model");
  }

  return {
    name: requireNonEmptyString(input.name, "name"),
    brandName: requireNonEmptyString(input.brandName, "brandName"),
    websiteUrl: trimOptional(input.websiteUrl),
    productLine: trimOptional(input.productLine),
    baseWords: uniqueStrings(input.baseWords ?? []),
    targetModels,
    createdBy: trimOptional(input.createdBy)
  };
}

export function normalizeUpdateGeoAnalysisTask(
  input: UpdateGeoAnalysisTaskDto
): NormalizedUpdateGeoAnalysisTask {
  const normalized: NormalizedUpdateGeoAnalysisTask = {};

  if (input.name !== undefined) {
    normalized.name = requireNonEmptyString(input.name, "name");
  }
  if (input.brandName !== undefined) {
    normalized.brandName = requireNonEmptyString(input.brandName, "brandName");
  }
  if (input.websiteUrl !== undefined) {
    normalized.websiteUrl = trimOptional(input.websiteUrl) ?? null;
  }
  if (input.productLine !== undefined) {
    normalized.productLine = trimOptional(input.productLine) ?? null;
  }
  if (input.targetModels !== undefined) {
    const targetModels = uniqueStrings(input.targetModels);

    if (targetModels.length === 0) {
      throw new BadRequestException("targetModels must contain at least one target model");
    }

    normalized.targetModels = targetModels;
  }

  return normalized;
}

export function normalizeQueryGeoAnalysisTasks(
  input: QueryGeoAnalysisTasksDto
): NormalizedQueryGeoAnalysisTasks {
  return {
    page: input.page ?? DEFAULT_PAGE,
    pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
    search: trimOptional(input.search),
    status: input.status as TaskStatus | undefined,
    productLine: trimOptional(input.productLine),
    createdBy: trimOptional(input.createdBy),
    targetModel: trimOptional(input.targetModel),
    createdFrom: input.createdFrom,
    createdTo: input.createdTo
  };
}

export function normalizeConvertAnalysisPrompts(
  input: ConvertAnalysisPromptsDto
): NormalizedConvertAnalysisPrompts {
  return {
    selectedPromptTexts: uniqueStrings(input.selectedPromptTexts ?? []),
    promptType: (input.promptType as GeoPromptType | undefined) ?? GeoPromptType.distilled,
    productLine: trimOptional(input.productLine),
    userIntent: input.userIntent as UserIntent | undefined,
    priority: input.priority ?? 3,
    trackEnabled: input.trackEnabled ?? true,
    createdBy: trimOptional(input.createdBy)
  };
}

export function normalizeCreateAnalysisContentTask(
  input: CreateAnalysisContentTaskDto
): NormalizedCreateAnalysisContentTask {
  return {
    name: trimOptional(input.name),
    knowledgeBaseId: trimOptional(input.knowledgeBaseId),
    instructionTemplateId: trimOptional(input.instructionTemplateId),
    generationType: trimOptional(input.generationType) ?? "article",
    targetModel: trimOptional(input.targetModel),
    geoPromptIds: uniqueStrings(input.geoPromptIds ?? []),
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

function requireNonEmptyString(value: unknown, fieldName: string): string {
  const normalized = trimOptional(value);

  if (!normalized) {
    throw new BadRequestException(`${fieldName} must not be empty`);
  }

  return normalized;
}

function uniqueStrings(values: string[]): string[] {
  const seenValues = new Set<string>();

  return values
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0)
    .filter((value) => {
      if (seenValues.has(value)) {
        return false;
      }

      seenValues.add(value);
      return true;
    });
}
