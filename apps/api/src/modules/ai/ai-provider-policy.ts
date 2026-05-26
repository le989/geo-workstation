import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { isMockAiProvider } from "./ai-provider.interface";

export type AppRuntimeEnv = "development" | "smoke" | "production";

const APP_ENV_VALUES = new Set<AppRuntimeEnv>(["development", "smoke", "production"]);

export function normalizeAppEnv(value?: string, fallback: AppRuntimeEnv = "development") {
  const normalized = value?.trim().toLowerCase();

  if (normalized && APP_ENV_VALUES.has(normalized as AppRuntimeEnv)) {
    return normalized as AppRuntimeEnv;
  }

  return fallback;
}

export function normalizeBooleanEnv(
  value: string | undefined,
  fallback: boolean
): boolean {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

export function isMockProviderEnabled(configService?: ConfigService): boolean {
  const appEnv = normalizeAppEnv(configService?.get<string>("APP_ENV"));

  return normalizeBooleanEnv(
    configService?.get<string>("ENABLE_MOCK_PROVIDER"),
    appEnv !== "production"
  );
}

export function isMockAuthEnabled(configService?: ConfigService): boolean {
  const appEnv = normalizeAppEnv(configService?.get<string>("APP_ENV"));

  return normalizeBooleanEnv(
    configService?.get<string>("ENABLE_MOCK_AUTH"),
    appEnv !== "production"
  );
}

export function assertMockProviderAllowed(
  configService: ConfigService | undefined,
  provider: string | undefined,
  actionLabel = "当前操作"
): void {
  if (!isMockAiProvider(provider)) {
    return;
  }

  if (isMockProviderEnabled(configService)) {
    return;
  }

  throw new BadRequestException(
    `${actionLabel}在正式环境已禁用 Mock AI Provider，请配置并选择真实 AI Provider。`
  );
}

export function getDatabaseNameFromUrl(databaseUrl?: string): string {
  if (!databaseUrl) {
    return "unknown";
  }

  try {
    const url = new URL(databaseUrl);
    return url.pathname.replace(/^\//, "") || "unknown";
  } catch {
    return "unknown";
  }
}
