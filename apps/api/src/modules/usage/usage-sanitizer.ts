import type { Prisma } from "@prisma/client";

const SENSITIVE_KEY_PATTERN =
  /password|passwordhash|jwt|token|apikey|api_key|secret|database_url|databaseurl|storagepath|storage_path|absolute_path|local_path|prompt|rawanswer|raw_answer/i;
const LOCAL_PATH_PATTERN = /\/Users\/|\/var\/|\/tmp\/|\\Users\\|^[A-Za-z]:\\/;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;

export function sanitizeErrorMessage(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const message = value instanceof Error ? value.message : String(value);
  const sanitized = sanitizeString(message);

  return sanitized || undefined;
}

export function sanitizeMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  const sanitized = sanitizeJson(value);

  if (sanitized === undefined) {
    return undefined;
  }

  return sanitized as Prisma.InputJsonValue;
}

function sanitizeJson(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map(sanitizeJson).filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS);
    const sanitized: Record<string, unknown> = {};

    for (const [key, item] of entries) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        continue;
      }

      const nextValue = sanitizeJson(item);

      if (nextValue !== undefined) {
        sanitized[key] = nextValue;
      }
    }

    return sanitized;
  }

  return String(value);
}

function sanitizeString(value: string): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || LOCAL_PATH_PATTERN.test(normalized)) {
    return undefined;
  }

  return normalized.length > MAX_STRING_LENGTH
    ? `${normalized.slice(0, MAX_STRING_LENGTH)}...`
    : normalized;
}
