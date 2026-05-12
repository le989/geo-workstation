import { GeoPromptType } from "@prisma/client";

export function trimRequiredString(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

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

export const GEO_PROMPT_TYPE_VALUES = Object.values(GeoPromptType);
