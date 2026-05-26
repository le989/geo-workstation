export type AppEnv = "development" | "smoke" | "production";

const APP_ENV_VALUES = new Set<AppEnv>(["development", "smoke", "production"]);

export type AppEnvironment = {
  env: AppEnv;
  label: string;
  mockEnabled: boolean;
  isProduction: boolean;
};

export function normalizeAppEnv(value?: string, fallback: AppEnv = "development"): AppEnv {
  const normalized = value?.trim().toLowerCase();

  if (normalized && APP_ENV_VALUES.has(normalized as AppEnv)) {
    return normalized as AppEnv;
  }

  return fallback;
}

export function deriveEnvironmentLabel(env: AppEnv, explicitLabel?: string): string {
  const label = explicitLabel?.trim();

  if (label) {
    return label;
  }

  if (env === "production") {
    return "正式环境 / API";
  }

  if (env === "smoke") {
    return "测试环境 / Smoke";
  }

  return "开发环境 / Mock";
}

export function resolveMockEnabled(env: AppEnv, rawValue?: string): boolean {
  const normalized = rawValue?.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return env !== "production";
}

export function resolveAppEnvironment(metaEnv: ImportMetaEnv = import.meta.env): AppEnvironment {
  const fallback = metaEnv.PROD ? "production" : "development";
  const env = normalizeAppEnv(metaEnv.VITE_APP_ENV, fallback);

  return {
    env,
    label: deriveEnvironmentLabel(env, metaEnv.VITE_APP_ENV_LABEL),
    mockEnabled: resolveMockEnabled(env, metaEnv.VITE_ENABLE_MOCK),
    isProduction: env === "production"
  };
}

export const appEnvironment = resolveAppEnvironment();
