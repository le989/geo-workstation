import type { Prisma } from "@prisma/client";

const SENSITIVE_KEY_PATTERN =
  /password|passwordhash|jwt|token|apikey|api_key|secret|database_url|databaseurl|storagepath|storage_path|absolute_path|local_path|prompt|rawanswer|raw_answer/i;
const LOCAL_PATH_PATTERN = /\/Users\/|\/var\/|\/tmp\/|\\Users\\|^[A-Za-z]:\\/;
const DATABASE_URL_PATTERN =
  /\b(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s"'<>]+/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const API_KEY_PATTERN = /\b(?:sk|pk|rk|ak)[-_][A-Za-z0-9._-]{8,}\b/g;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b(?:api[_ -]?key|jwt(?:[_ -]?secret)?|token|secret|database[_ -]?url|databaseurl|password|authorization)\s*[:=]\s*(?:"[^"]+"|'[^']+'|[^\s,;]+)/gi;
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

export function redactSensitiveValue(value: unknown): string | undefined {
  return sanitizeErrorMessage(value);
}

export function sanitizeProviderErrorMessage(value: unknown): string {
  return sanitizeErrorMessage(value) ?? "Provider error";
}

export function sanitizeAiProviderError(value: unknown): string {
  return sanitizeProviderErrorMessage(value);
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

  const redacted = normalized
    .replace(DATABASE_URL_PATTERN, "[REDACTED_DATABASE_URL]")
    .replace(BEARER_TOKEN_PATTERN, "Bearer [REDACTED_TOKEN]")
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(API_KEY_PATTERN, "[REDACTED_API_KEY]")
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, (match) => {
      const key = match.split(/[:=]/)[0]?.trim() || "sensitive";
      return `${key}=[REDACTED]`;
    });

  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}...`
    : redacted;
}
