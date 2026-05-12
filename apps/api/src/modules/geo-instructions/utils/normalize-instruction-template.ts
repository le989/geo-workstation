import { BadRequestException } from "@nestjs/common";
import { GeoPromptType } from "@prisma/client";
import type { CreateInstructionTemplateDto } from "../dto/create-instruction-template.dto";
import type { DuplicateInstructionTemplateDto } from "../dto/duplicate-instruction-template.dto";
import { toOptionalInt } from "../dto/instruction-template-dto-transforms";
import type { QueryInstructionTemplatesDto } from "../dto/query-instruction-templates.dto";
import type { UpdateInstructionTemplateDto } from "../dto/update-instruction-template.dto";

const DEFAULT_CONTENT_TYPE = "geo_content";
const MIN_INSTRUCTION_LENGTH = 20;

export type NormalizedCreateInstructionTemplate = {
  name: string;
  instructionType: string;
  contentType: string;
  targetPromptType?: GeoPromptType;
  targetModel?: string;
  instruction: string;
  outputFormat?: string;
  qualityRules?: string;
  forbiddenRules?: string;
  createdBy?: string;
};

export type NormalizedUpdateInstructionTemplate = {
  name?: string;
  instructionType?: string;
  contentType?: string;
  targetPromptType?: GeoPromptType;
  targetModel?: string;
  instruction?: string;
  outputFormat?: string;
  qualityRules?: string;
  forbiddenRules?: string;
};

export type NormalizedDuplicateInstructionTemplate = {
  name?: string;
  createdBy?: string;
};

export type NormalizedQueryInstructionTemplates = {
  page: number;
  pageSize: number;
  search?: string;
  instructionType?: string;
  contentType?: string;
  targetPromptType?: GeoPromptType;
  targetModel?: string;
  createdBy?: string;
};

export function normalizeCreateInstructionTemplate(
  input: CreateInstructionTemplateDto
): NormalizedCreateInstructionTemplate {
  const normalized = {
    name: trimRequired(input.name),
    instructionType: trimRequired(input.instructionType),
    contentType: trimOptional(input.contentType) ?? DEFAULT_CONTENT_TYPE,
    targetPromptType: normalizeGeoPromptType(input.targetPromptType),
    targetModel: trimOptional(input.targetModel),
    instruction: trimRequired(input.instruction),
    outputFormat: trimOptional(input.outputFormat),
    qualityRules: trimOptional(input.qualityRules),
    forbiddenRules: trimOptional(input.forbiddenRules),
    createdBy: trimOptional(input.createdBy)
  };

  assertInstructionTemplateBasics(
    normalized.name,
    normalized.instructionType,
    normalized.instruction
  );
  return normalized;
}

export function normalizeUpdateInstructionTemplate(
  input: UpdateInstructionTemplateDto
): NormalizedUpdateInstructionTemplate {
  const normalized: NormalizedUpdateInstructionTemplate = {};

  if (input.name !== undefined) {
    normalized.name = trimRequired(input.name);
    assertRequired("GEO instruction template name", normalized.name);
  }
  if (input.instructionType !== undefined) {
    normalized.instructionType = trimRequired(input.instructionType);
    assertRequired("GEO instruction type", normalized.instructionType);
  }
  if (input.contentType !== undefined) {
    normalized.contentType = trimOptional(input.contentType);
  }
  if (input.targetPromptType !== undefined) {
    normalized.targetPromptType = normalizeGeoPromptType(input.targetPromptType);
  }
  if (input.targetModel !== undefined) {
    normalized.targetModel = trimOptional(input.targetModel);
  }
  if (input.instruction !== undefined) {
    normalized.instruction = trimRequired(input.instruction);
    assertInstructionLength(normalized.instruction);
  }
  if (input.outputFormat !== undefined) {
    normalized.outputFormat = trimOptional(input.outputFormat);
  }
  if (input.qualityRules !== undefined) {
    normalized.qualityRules = trimOptional(input.qualityRules);
  }
  if (input.forbiddenRules !== undefined) {
    normalized.forbiddenRules = trimOptional(input.forbiddenRules);
  }

  return normalized;
}

export function normalizeDuplicateInstructionTemplate(
  input: DuplicateInstructionTemplateDto
): NormalizedDuplicateInstructionTemplate {
  return {
    name: trimOptional(input.name),
    createdBy: trimOptional(input.createdBy)
  };
}

export function normalizeQueryInstructionTemplates(
  input: QueryInstructionTemplatesDto,
  defaultPage = 1,
  defaultPageSize = 20
): NormalizedQueryInstructionTemplates {
  return {
    page: Math.max(toOptionalInt(input.page) ?? defaultPage, 1),
    pageSize: Math.min(Math.max(toOptionalInt(input.pageSize) ?? defaultPageSize, 1), 100),
    search: trimOptional(input.search),
    instructionType: trimOptional(input.instructionType),
    contentType: trimOptional(input.contentType),
    targetPromptType: normalizeGeoPromptType(input.targetPromptType),
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

function normalizeGeoPromptType(value: unknown): GeoPromptType | undefined {
  const normalized = trimOptional(value);

  if (!normalized) {
    return undefined;
  }

  if (Object.values(GeoPromptType).includes(normalized as GeoPromptType)) {
    return normalized as GeoPromptType;
  }

  throw new BadRequestException(
    `Unsupported GEO prompt type for instruction template: ${normalized}`
  );
}

function assertInstructionTemplateBasics(
  name: string,
  instructionType: string,
  instruction: string
): void {
  assertRequired("GEO instruction template name", name);
  assertRequired("GEO instruction type", instructionType);
  assertInstructionLength(instruction);
}

function assertRequired(label: string, value: string): void {
  if (value.length === 0) {
    throw new BadRequestException(`${label} cannot be empty`);
  }
}

function assertInstructionLength(instruction: string): void {
  assertRequired("GEO instruction", instruction);

  if (instruction.length < MIN_INSTRUCTION_LENGTH) {
    throw new BadRequestException(
      `GEO instruction must be at least ${MIN_INSTRUCTION_LENGTH} characters`
    );
  }
}
