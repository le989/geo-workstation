import { randomUUID } from "node:crypto";

export const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";

export type ApiEnvironment = {
  NODE_ENV: string;
  API_PORT: number;
  DATABASE_URL: string;
  REDIS_URL?: string;
  LOCAL_STORAGE_ROOT: string;
  CORS_ORIGIN?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DEFAULT_ADMIN_EMAIL: string;
  DEFAULT_ADMIN_PASSWORD: string;
  BYPASS_AUTH_FOR_TESTS?: string;
  AI_PROVIDER: string;
  AI_OPENAI_COMPATIBLE_BASE_URL: string;
  AI_OPENAI_COMPATIBLE_API_KEY?: string;
  AI_OPENAI_COMPATIBLE_MODEL: string;
  AI_REQUEST_TIMEOUT_MS: number;
  AI_MAX_TOKENS: number;
  AI_TEMPERATURE: number;
  KIMI_API_KEY?: string;
  KIMI_BASE_URL: string;
  KIMI_MODEL: string;
  KIMI_WEB_SEARCH_ENABLED: string;
  KIMI_WEB_SEARCH_TOOL_NAME: string;
  KIMI_TIMEOUT_MS: number;
  VOLCENGINE_WEB_SEARCH_API_KEY?: string;
  VOLCENGINE_WEB_SEARCH_BASE_URL: string;
  VOLCENGINE_WEB_SEARCH_RESPONSES_URL: string;
  VOLCENGINE_WEB_SEARCH_MODEL: string;
  VOLCENGINE_WEB_SEARCH_FORCE_SEARCH: string;
  VOLCENGINE_WEB_SEARCH_MAX_OUTPUT_TOKENS: number;
  VOLCENGINE_WEB_SEARCH_TIMEOUT_MS: number;
};

export function validateApiEnvironment(config: Record<string, unknown>): ApiEnvironment {
  const nodeEnv = getString(config.NODE_ENV, "development");

  return {
    NODE_ENV: nodeEnv,
    API_PORT: getPort(config.API_PORT, 3000),
    DATABASE_URL: getString(config.DATABASE_URL, DEFAULT_LOCAL_DATABASE_URL),
    REDIS_URL: getOptionalString(config.REDIS_URL),
    LOCAL_STORAGE_ROOT: getString(config.LOCAL_STORAGE_ROOT, "./storage"),
    CORS_ORIGIN: getOptionalString(config.CORS_ORIGIN),
    JWT_SECRET: getJwtSecret(config.JWT_SECRET, nodeEnv),
    JWT_EXPIRES_IN: getString(config.JWT_EXPIRES_IN, "12h"),
    DEFAULT_ADMIN_EMAIL: getString(config.DEFAULT_ADMIN_EMAIL, "admin@geo-workstation.local"),
    DEFAULT_ADMIN_PASSWORD: getString(config.DEFAULT_ADMIN_PASSWORD, "change_me_admin_password"),
    BYPASS_AUTH_FOR_TESTS: getOptionalString(config.BYPASS_AUTH_FOR_TESTS),
    AI_PROVIDER: getString(config.AI_PROVIDER, "mock"),
    AI_OPENAI_COMPATIBLE_BASE_URL: getString(
      config.AI_OPENAI_COMPATIBLE_BASE_URL,
      "https://api.deepseek.com/v1"
    ),
    AI_OPENAI_COMPATIBLE_API_KEY: getOptionalString(config.AI_OPENAI_COMPATIBLE_API_KEY),
    AI_OPENAI_COMPATIBLE_MODEL: getString(config.AI_OPENAI_COMPATIBLE_MODEL, "deepseek-chat"),
    AI_REQUEST_TIMEOUT_MS: getPositiveNumber(config.AI_REQUEST_TIMEOUT_MS, 60000),
    AI_MAX_TOKENS: getPositiveNumber(config.AI_MAX_TOKENS, 3000),
    AI_TEMPERATURE: getPositiveNumber(config.AI_TEMPERATURE, 0.7),
    KIMI_API_KEY: getOptionalString(config.KIMI_API_KEY),
    KIMI_BASE_URL: getString(config.KIMI_BASE_URL, "https://api.moonshot.cn/v1"),
    KIMI_MODEL: getString(config.KIMI_MODEL, "kimi-k2.6"),
    KIMI_WEB_SEARCH_ENABLED: getString(config.KIMI_WEB_SEARCH_ENABLED, "true"),
    KIMI_WEB_SEARCH_TOOL_NAME: getString(config.KIMI_WEB_SEARCH_TOOL_NAME, "$web_search"),
    KIMI_TIMEOUT_MS: getPositiveNumber(config.KIMI_TIMEOUT_MS, 120000),
    VOLCENGINE_WEB_SEARCH_API_KEY: getOptionalString(config.VOLCENGINE_WEB_SEARCH_API_KEY),
    VOLCENGINE_WEB_SEARCH_BASE_URL: getString(
      config.VOLCENGINE_WEB_SEARCH_BASE_URL,
      "https://ark.cn-beijing.volces.com/api/v3"
    ),
    VOLCENGINE_WEB_SEARCH_RESPONSES_URL: getString(
      config.VOLCENGINE_WEB_SEARCH_RESPONSES_URL,
      "https://ark.cn-beijing.volces.com/api/v3/responses"
    ),
    VOLCENGINE_WEB_SEARCH_MODEL: getString(
      config.VOLCENGINE_WEB_SEARCH_MODEL,
      "doubao-seed-1-6-250615"
    ),
    VOLCENGINE_WEB_SEARCH_FORCE_SEARCH: getString(
      config.VOLCENGINE_WEB_SEARCH_FORCE_SEARCH,
      "true"
    ),
    VOLCENGINE_WEB_SEARCH_MAX_OUTPUT_TOKENS: getPositiveNumber(
      config.VOLCENGINE_WEB_SEARCH_MAX_OUTPUT_TOKENS,
      1200
    ),
    VOLCENGINE_WEB_SEARCH_TIMEOUT_MS: getPositiveNumber(
      config.VOLCENGINE_WEB_SEARCH_TIMEOUT_MS,
      180000
    )
  };
}

function getString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return undefined;
}

function getPort(value: unknown, fallback: number): number {
  const port = typeof value === "number" ? value : Number(value ?? fallback);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("API_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function getPositiveNumber(value: unknown, fallback: number): number {
  const numericValue = typeof value === "number" ? value : Number(value ?? fallback);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return numericValue;
}

function getJwtSecret(value: unknown, nodeEnv: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (nodeEnv === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }

  return randomUUID();
}
