import { GeoPromptType, TaskStatus, UserIntent } from "@prisma/client";

export function trimOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

export function toOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(String(value));
}

export function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "是"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n", "否"].includes(normalized)) {
      return false;
    }
  }

  return value as boolean;
}

export const GEO_PROMPT_TYPE_VALUES = Object.values(GeoPromptType);
export const USER_INTENT_VALUES = Object.values(UserIntent);
export const TASK_STATUS_VALUES = Object.values(TaskStatus);
export const REPORT_TYPE_VALUES = [
  "geo_overview",
  "prompt_coverage",
  "model_coverage",
  "content_coverage",
  "knowledge_coverage",
  "optimization_suggestions"
] as const;

export type ReportType = (typeof REPORT_TYPE_VALUES)[number];
