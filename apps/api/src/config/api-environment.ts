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
    BYPASS_AUTH_FOR_TESTS: getOptionalString(config.BYPASS_AUTH_FOR_TESTS)
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

function getJwtSecret(value: unknown, nodeEnv: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (nodeEnv === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }

  return randomUUID();
}
