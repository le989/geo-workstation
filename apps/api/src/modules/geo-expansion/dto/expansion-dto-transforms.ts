import {
  toOptionalBoolean,
  toOptionalInt,
  toTargetModels
} from "../../geo-prompts/dto/geo-prompt-dto-transforms";

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

export function toStringArray(value: unknown): string[] {
  return toTargetModels(value);
}

export { toOptionalBoolean, toOptionalInt, toTargetModels };
