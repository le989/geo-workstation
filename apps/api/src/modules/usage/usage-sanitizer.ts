import type { Prisma } from "@prisma/client";

const LOCAL_PATH_PATTERN = /\/Users\/|\/var\/|\/tmp\/|\\Users\\|^[A-Za-z]:\\/;
const DATABASE_URL_PATTERN =
  /\b(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s"'<>]+/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const API_KEY_PATTERN = /\b(?:sk|pk|rk|ak)[-_][A-Za-z0-9._-]{8,}\b/g;
const MAINLAND_PHONE_PATTERN = /(?<!\d)(1[3-9]\d)\d{4}(\d{4})(?!\d)/g;
const WECHAT_VALUE_PATTERN =
  /((?:微信号?|wechat|weixin|wx)\s*[:：=]?\s*)[A-Za-z][-_A-Za-z0-9]{5,19}/gi;
const URL_SECRET_QUERY_PATTERN =
  /([?&](?:access_token|refresh_token|api[_-]?key|apikey|token|key|secret|password|authorization)=)[^&#\s]+/gi;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b(?:api[_ -]?key|jwt(?:[_ -]?secret)?|token|secret|database[_ -]?url|databaseurl|password|cookie|authorization)\s*[:=]\s*(?:"[^"]+"|'[^']+'|Bearer\s+[^\s,;]+|[^\s,;]+)/gi;
const MAX_STRING_LENGTH = 500;
const MAX_TITLE_LENGTH = 60;
const MAX_ERROR_PREVIEW_LENGTH = 240;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;
const SENSITIVE_METADATA_KEYS = new Set([
  "password",
  "passwordhash",
  "jwt",
  "jwtsecret",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secret",
  "authorization",
  "cookie",
  "databaseurl",
  "storagepath",
  "absolutepath",
  "localpath",
  "prompt",
  "systemprompt",
  "userprompt",
  "prompttext",
  "rawanswer",
  "rawresponse",
  "airesponse",
  "response",
  "responsebody",
  "body",
  "content",
  "rawcontent",
  "originaltext",
  "requestbody"
]);

export function sanitizeErrorMessage(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const message = value instanceof Error ? value.message : String(value);
  const sanitized = sanitizeString(message, MAX_STRING_LENGTH);

  return sanitized || undefined;
}

export function sanitizeErrorPreview(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const message = value instanceof Error ? value.message : String(value);
  const sanitized = sanitizeString(message, MAX_ERROR_PREVIEW_LENGTH);

  return sanitized || undefined;
}

export function sanitizeLogTitle(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const sanitized = sanitizeString(String(value), MAX_TITLE_LENGTH);

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
  return sanitizeLogMetadata(value);
}

export function sanitizeLogMetadata(value: unknown): Prisma.InputJsonValue | undefined {
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
      if (isSensitiveMetadataKey(key)) {
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

function isSensitiveMetadataKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  return SENSITIVE_METADATA_KEYS.has(normalizedKey);
}

function sanitizeString(value: string, maxLength = MAX_STRING_LENGTH): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || LOCAL_PATH_PATTERN.test(normalized)) {
    return undefined;
  }

  // 审计日志只保留定位信息，不保留客户联系方式、密钥、prompt、正文或 AI 原文。
  const redacted = normalized
    .replace(URL_SECRET_QUERY_PATTERN, "$1[secret_redacted]")
    .replace(DATABASE_URL_PATTERN, "[REDACTED_DATABASE_URL]")
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, (match) => {
      const key = match.split(/[:=]/)[0]?.trim() || "sensitive";
      return `${key}=[secret_redacted]`;
    })
    .replace(BEARER_TOKEN_PATTERN, "Bearer [REDACTED_TOKEN]")
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(API_KEY_PATTERN, "[REDACTED_API_KEY]")
    .replace(MAINLAND_PHONE_PATTERN, "$1****$2")
    .replace(WECHAT_VALUE_PATTERN, "$1[wechat_redacted]");

  return redacted.length > maxLength
    ? `${redacted.slice(0, maxLength)}...`
    : redacted;
}
