import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, Prisma, RecordMethod, UserIntent } from "@prisma/client";
import type { CreateModelInclusionRecordDto } from "../dto/create-model-inclusion-record.dto";
import type { ImportModelInclusionRecordRow } from "../dto/import-model-inclusion-records.dto";
import {
  toOptionalDate,
  toOptionalInt,
  toStringArray
} from "../dto/model-inclusion-dto-transforms";
import type { QueryModelInclusionRecordsDto } from "../dto/query-model-inclusion-records.dto";
import type { QueryModelInclusionSummaryDto } from "../dto/query-model-inclusion-summary.dto";
import type { QueryUncoveredPromptsDto } from "../dto/query-uncovered-prompts.dto";
import { deriveHitLevel, normalizeHitLevel, type GeoHitLevel } from "./derive-hit-level.util";
import { parseImportBoolean } from "./parse-import-bool.util";

export type NormalizedCreateModelInclusionRecord = {
  geoPromptId: string;
  model: string;
  platform?: string;
  entryPoint?: string;
  detectionMethod?: string;
  deviceType?: string;
  isWebSearchEnabled: boolean;
  isLoggedIn: boolean;
  checkedAt: Date;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition?: number;
  citedOfficialSite: boolean;
  citedContentAsset: boolean;
  competitorMentioned: boolean;
  hitLevel: GeoHitLevel;
  answerSummary?: string;
  rawAnswer?: string;
  citations?: Prisma.InputJsonValue;
  searchResults?: Prisma.InputJsonValue;
  screenshotPath?: string;
  errorMessage?: string;
  competitors: string[];
  recordMethod: RecordMethod;
  createdBy?: string;
};

export type NormalizedImportModelInclusionRecord = Omit<
  NormalizedCreateModelInclusionRecord,
  "geoPromptId"
> & {
  geoPromptId?: string;
  promptText?: string;
};

export type NormalizedQueryModelInclusionRecords = {
  page: number;
  pageSize: number;
  search?: string;
  geoPromptId?: string;
  model?: string;
  platform?: string;
  entryPoint?: string;
  detectionMethod?: string;
  deviceType?: string;
  isWebSearchEnabled?: boolean;
  isLoggedIn?: boolean;
  brandMentioned?: boolean;
  brandRecommended?: boolean;
  citedOfficialSite?: boolean;
  citedContentAsset?: boolean;
  competitorMentioned?: boolean;
  hitLevel?: GeoHitLevel;
  recordMethod?: RecordMethod;
  createdBy?: string;
  checkedFrom?: Date;
  checkedTo?: Date;
  productLine?: string;
  promptType?: GeoPromptType;
  userIntent?: UserIntent;
};

export type NormalizedQueryUncoveredPrompts = {
  page: number;
  pageSize: number;
  model?: string;
  productLine?: string;
  promptType?: GeoPromptType;
  userIntent?: UserIntent;
  trackEnabled: boolean;
  checkedFrom?: Date;
  checkedTo?: Date;
};

export type NormalizedQueryModelInclusionSummary = {
  model?: string;
  productLine?: string;
  checkedFrom?: Date;
  checkedTo?: Date;
};

export function normalizeCreateModelInclusionRecord(
  input: CreateModelInclusionRecordDto
): NormalizedCreateModelInclusionRecord {
  const normalized = {
    geoPromptId: trimRequired(input.geoPromptId),
    model: trimRequired(input.model),
    platform: trimOptional(input.platform),
    entryPoint: trimOptional(input.entryPoint),
    detectionMethod: trimOptional(input.detectionMethod),
    deviceType: trimOptional(input.deviceType),
    isWebSearchEnabled: input.isWebSearchEnabled ?? false,
    isLoggedIn: input.isLoggedIn ?? false,
    checkedAt: normalizeDate(input.checkedAt) ?? new Date(),
    brandMentioned: input.brandMentioned ?? false,
    brandRecommended: input.brandRecommended ?? false,
    rankingPosition: normalizeRankingPosition(input.rankingPosition),
    citedOfficialSite: input.citedOfficialSite ?? false,
    citedContentAsset: input.citedContentAsset ?? false,
    competitorMentioned: input.competitorMentioned ?? false,
    hitLevel: normalizeHitLevel(input.hitLevel),
    answerSummary: trimOptional(input.answerSummary),
    rawAnswer: trimOptional(input.rawAnswer),
    citations: normalizeJsonField(input.citations, "citations"),
    searchResults: normalizeJsonField(input.searchResults, "searchResults"),
    screenshotPath: trimOptional(input.screenshotPath),
    errorMessage: trimOptional(input.errorMessage),
    competitors: toStringArray(input.competitors),
    recordMethod: normalizeRecordMethod(input.recordMethod) ?? RecordMethod.manual,
    createdBy: trimOptional(input.createdBy)
  };

  assertRequired("geoPromptId", normalized.geoPromptId);
  assertRequired("model", normalized.model);

  return {
    ...normalized,
    hitLevel:
      normalized.hitLevel ??
      deriveHitLevel({
        brandMentioned: normalized.brandMentioned,
        brandRecommended: normalized.brandRecommended,
        citedOfficialSite: normalized.citedOfficialSite,
        citedContentAsset: normalized.citedContentAsset,
        competitorMentioned: normalized.competitorMentioned
      })
  };
}

export function normalizeImportModelInclusionRecordRow(
  row: ImportModelInclusionRecordRow
): NormalizedImportModelInclusionRecord {
  const model = trimRequired(row.model);
  assertRequired("model", model);

  const geoPromptId = trimOptional(row.geoPromptId);
  const promptText = trimOptional(row.promptText);

  if (!geoPromptId && !promptText) {
    throw new BadRequestException("geoPromptId or promptText is required");
  }

  const normalized = {
    geoPromptId,
    promptText,
    model,
    platform: trimOptional(row.platform),
    entryPoint: trimOptional(row.entryPoint),
    detectionMethod: trimOptional(row.detectionMethod),
    deviceType: trimOptional(row.deviceType),
    isWebSearchEnabled: parseImportBoolean(row.isWebSearchEnabled, "isWebSearchEnabled") ?? false,
    isLoggedIn: parseImportBoolean(row.isLoggedIn, "isLoggedIn") ?? false,
    checkedAt: normalizeDate(row.checkedAt) ?? new Date(),
    brandMentioned: parseImportBoolean(row.brandMentioned, "brandMentioned") ?? false,
    brandRecommended: parseImportBoolean(row.brandRecommended, "brandRecommended") ?? false,
    rankingPosition: normalizeRankingPosition(toOptionalInt(row.rankingPosition)),
    citedOfficialSite: parseImportBoolean(row.citedOfficialSite, "citedOfficialSite") ?? false,
    citedContentAsset: parseImportBoolean(row.citedContentAsset, "citedContentAsset") ?? false,
    competitorMentioned:
      parseImportBoolean(row.competitorMentioned, "competitorMentioned") ?? false,
    hitLevel: normalizeHitLevel(row.hitLevel),
    answerSummary: trimOptional(row.answerSummary),
    rawAnswer: trimOptional(row.rawAnswer),
    citations: normalizeJsonField(row.citations, "citations"),
    searchResults: normalizeJsonField(row.searchResults, "searchResults"),
    screenshotPath: trimOptional(row.screenshotPath),
    errorMessage: trimOptional(row.errorMessage),
    competitors: toStringArray(row.competitors),
    recordMethod: RecordMethod.import,
    createdBy: trimOptional(row.createdBy)
  };

  return {
    ...normalized,
    hitLevel:
      normalized.hitLevel ??
      deriveHitLevel({
        brandMentioned: normalized.brandMentioned,
        brandRecommended: normalized.brandRecommended,
        citedOfficialSite: normalized.citedOfficialSite,
        citedContentAsset: normalized.citedContentAsset,
        competitorMentioned: normalized.competitorMentioned
      })
  };
}

export function normalizeQueryModelInclusionRecords(
  input: QueryModelInclusionRecordsDto,
  defaultPage = 1,
  defaultPageSize = 20
): NormalizedQueryModelInclusionRecords {
  return {
    page: Math.max(toOptionalInt(input.page) ?? defaultPage, 1),
    pageSize: Math.min(Math.max(toOptionalInt(input.pageSize) ?? defaultPageSize, 1), 100),
    search: trimOptional(input.search),
    geoPromptId: trimOptional(input.geoPromptId),
    model: trimOptional(input.model),
    platform: trimOptional(input.platform),
    entryPoint: trimOptional(input.entryPoint),
    detectionMethod: trimOptional(input.detectionMethod),
    deviceType: trimOptional(input.deviceType),
    isWebSearchEnabled: input.isWebSearchEnabled,
    isLoggedIn: input.isLoggedIn,
    brandMentioned: input.brandMentioned,
    brandRecommended: input.brandRecommended,
    citedOfficialSite: input.citedOfficialSite,
    citedContentAsset: input.citedContentAsset,
    competitorMentioned: input.competitorMentioned,
    hitLevel: normalizeHitLevel(input.hitLevel),
    recordMethod: normalizeRecordMethod(input.recordMethod),
    createdBy: trimOptional(input.createdBy),
    checkedFrom: normalizeDate(input.checkedFrom),
    checkedTo: normalizeDate(input.checkedTo),
    productLine: trimOptional(input.productLine),
    promptType: normalizeGeoPromptType(input.promptType),
    userIntent: normalizeUserIntent(input.userIntent)
  };
}

export function normalizeQueryUncoveredPrompts(
  input: QueryUncoveredPromptsDto,
  defaultPage = 1,
  defaultPageSize = 20
): NormalizedQueryUncoveredPrompts {
  return {
    page: Math.max(toOptionalInt(input.page) ?? defaultPage, 1),
    pageSize: Math.min(Math.max(toOptionalInt(input.pageSize) ?? defaultPageSize, 1), 100),
    model: trimOptional(input.model),
    productLine: trimOptional(input.productLine),
    promptType: normalizeGeoPromptType(input.promptType),
    userIntent: normalizeUserIntent(input.userIntent),
    trackEnabled: input.trackEnabled ?? true,
    checkedFrom: normalizeDate(input.checkedFrom),
    checkedTo: normalizeDate(input.checkedTo)
  };
}

export function normalizeQueryModelInclusionSummary(
  input: QueryModelInclusionSummaryDto
): NormalizedQueryModelInclusionSummary {
  return {
    model: trimOptional(input.model),
    productLine: trimOptional(input.productLine),
    checkedFrom: normalizeDate(input.checkedFrom),
    checkedTo: normalizeDate(input.checkedTo)
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

function normalizeRankingPosition(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException("rankingPosition must be a positive integer");
  }

  return value;
}

function normalizeDate(value: unknown): Date | undefined {
  const date = toOptionalDate(value);

  if (!date) {
    return undefined;
  }

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Date value is invalid");
  }

  return date;
}

function normalizeJsonField(
  value: unknown,
  label: "citations" | "searchResults"
): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    try {
      return JSON.parse(trimmed) as Prisma.InputJsonValue;
    } catch {
      throw new BadRequestException(`${label} must be valid JSON`);
    }
  }

  if (Array.isArray(value) || typeof value === "object") {
    return value as Prisma.InputJsonValue;
  }

  throw new BadRequestException(`${label} must be a JSON array or object`);
}

function normalizeRecordMethod(
  value: unknown,
  defaultValue?: RecordMethod
): RecordMethod | undefined {
  const normalized = trimOptional(value);

  if (!normalized) {
    return defaultValue;
  }

  if (Object.values(RecordMethod).includes(normalized as RecordMethod)) {
    return normalized as RecordMethod;
  }

  throw new BadRequestException(`Unsupported recordMethod: ${normalized}`);
}

function normalizeGeoPromptType(value: unknown): GeoPromptType | undefined {
  const normalized = trimOptional(value);

  if (!normalized) {
    return undefined;
  }

  if (Object.values(GeoPromptType).includes(normalized as GeoPromptType)) {
    return normalized as GeoPromptType;
  }

  throw new BadRequestException(`Unsupported promptType: ${normalized}`);
}

function normalizeUserIntent(value: unknown): UserIntent | undefined {
  const normalized = trimOptional(value);

  if (!normalized) {
    return undefined;
  }

  if (Object.values(UserIntent).includes(normalized as UserIntent)) {
    return normalized as UserIntent;
  }

  throw new BadRequestException(`Unsupported userIntent: ${normalized}`);
}
