import { GeoPromptType, UserIntent } from "@prisma/client";
import {
  toOptionalBoolean,
  toOptionalInt,
  toStringArray,
  toTargetModels,
  trimOptionalString
} from "../dto/expansion-dto-transforms";

export type NormalizedRuleExpansionInput = {
  baseWord: string;
  prefixes: string[];
  serviceSuffixes: string[];
  applicationSuffixes: string[];
  promptType: GeoPromptType;
  productLine?: string;
  scenario?: string;
  userIntent?: UserIntent;
  priority: number;
  targetModels: string[];
  source: string;
  trackEnabled: boolean;
  createdBy?: string;
};

export type NormalizedAiExpansionInput = {
  baseWord: string;
  knowledgeBaseId?: string;
  promptType: GeoPromptType;
  userIntent?: UserIntent;
  productLine?: string;
  scenario?: string;
  count: number;
  constraints?: string;
  targetModels: string[];
  createdBy?: string;
};

export type NormalizedSaveExpansionCandidatesInput = {
  candidateIds: string[];
  createdBy?: string;
  defaultProductLine?: string;
  defaultPriority?: number;
  defaultTrackEnabled?: boolean;
};

export function normalizeRuleExpansionInput(
  input: Partial<NormalizedRuleExpansionInput>
): NormalizedRuleExpansionInput {
  return {
    baseWord: String(input.baseWord ?? "").trim(),
    prefixes: toStringArray(input.prefixes),
    serviceSuffixes: toStringArray(input.serviceSuffixes),
    applicationSuffixes: toStringArray(input.applicationSuffixes),
    promptType: input.promptType ?? GeoPromptType.distilled,
    productLine: trimOptionalString(input.productLine),
    scenario: trimOptionalString(input.scenario),
    userIntent: input.userIntent,
    priority: toOptionalInt(input.priority) ?? 3,
    targetModels: toTargetModels(input.targetModels),
    source: trimOptionalString(input.source) ?? "rule_expansion",
    trackEnabled: toOptionalBoolean(input.trackEnabled) ?? false,
    createdBy: trimOptionalString(input.createdBy)
  };
}

export function normalizeAiExpansionInput(
  input: Partial<NormalizedAiExpansionInput>
): NormalizedAiExpansionInput {
  return {
    baseWord: String(input.baseWord ?? "").trim(),
    knowledgeBaseId: trimOptionalString(input.knowledgeBaseId),
    promptType: input.promptType as GeoPromptType,
    userIntent: input.userIntent,
    productLine: trimOptionalString(input.productLine),
    scenario: trimOptionalString(input.scenario),
    count: toOptionalInt(input.count) ?? 10,
    constraints: trimOptionalString(input.constraints),
    targetModels: toTargetModels(input.targetModels),
    createdBy: trimOptionalString(input.createdBy)
  };
}

export function normalizeSaveExpansionCandidatesInput(
  input: Partial<NormalizedSaveExpansionCandidatesInput>
): NormalizedSaveExpansionCandidatesInput {
  return {
    candidateIds: toStringArray(input.candidateIds),
    createdBy: trimOptionalString(input.createdBy),
    defaultProductLine: trimOptionalString(input.defaultProductLine),
    defaultPriority: toOptionalInt(input.defaultPriority),
    defaultTrackEnabled: toOptionalBoolean(input.defaultTrackEnabled)
  };
}

export function compactJson<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}
