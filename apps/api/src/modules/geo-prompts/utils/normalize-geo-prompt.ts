import { GeoPromptType, UserIntent } from "@prisma/client";
import type { CreateGeoPromptDto } from "../dto/create-geo-prompt.dto";
import type { UpdateGeoPromptDto } from "../dto/update-geo-prompt.dto";
import { toOptionalBoolean, toOptionalInt, toTargetModels } from "../dto/geo-prompt-dto-transforms";

export type NormalizedCreateGeoPrompt = {
  type: GeoPromptType;
  baseWord?: string;
  promptText: string;
  productLine?: string;
  scenario?: string;
  userIntent: UserIntent;
  priority: number;
  targetModels: string[];
  source?: string;
  trackEnabled: boolean;
  latestCoverageStatus?: string;
  createdBy?: string;
};

export type NormalizedUpdateGeoPrompt = Partial<Omit<NormalizedCreateGeoPrompt, "createdBy">> & {
  createdBy?: string;
};

export function normalizeCreateGeoPrompt(input: CreateGeoPromptDto): NormalizedCreateGeoPrompt {
  return {
    type: input.type,
    baseWord: trimOptional(input.baseWord),
    promptText: trimRequired(input.promptText),
    productLine: trimOptional(input.productLine),
    scenario: trimOptional(input.scenario),
    userIntent: input.userIntent,
    priority: toOptionalInt(input.priority) ?? 3,
    targetModels: toTargetModels(input.targetModels),
    source: trimOptional(input.source),
    trackEnabled: toOptionalBoolean(input.trackEnabled) ?? false,
    latestCoverageStatus: trimOptional(input.latestCoverageStatus),
    createdBy: trimOptional(input.createdBy)
  };
}

export function normalizeUpdateGeoPrompt(input: UpdateGeoPromptDto): NormalizedUpdateGeoPrompt {
  const normalized: NormalizedUpdateGeoPrompt = {};

  if (input.type !== undefined) {
    normalized.type = input.type;
  }

  if ("baseWord" in input) {
    normalized.baseWord = trimOptional(input.baseWord);
  }

  if ("promptText" in input && input.promptText !== undefined) {
    normalized.promptText = trimRequired(input.promptText);
  }

  if ("productLine" in input) {
    normalized.productLine = trimOptional(input.productLine);
  }

  if ("scenario" in input) {
    normalized.scenario = trimOptional(input.scenario);
  }

  if (input.userIntent !== undefined) {
    normalized.userIntent = input.userIntent;
  }

  if (input.priority !== undefined) {
    normalized.priority = toOptionalInt(input.priority);
  }

  if ("targetModels" in input) {
    normalized.targetModels = toTargetModels(input.targetModels);
  }

  if ("source" in input) {
    normalized.source = trimOptional(input.source);
  }

  if (input.trackEnabled !== undefined) {
    normalized.trackEnabled = toOptionalBoolean(input.trackEnabled);
  }

  if ("latestCoverageStatus" in input) {
    normalized.latestCoverageStatus = trimOptional(input.latestCoverageStatus);
  }

  if ("createdBy" in input) {
    normalized.createdBy = trimOptional(input.createdBy);
  }

  return normalized;
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
