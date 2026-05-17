import type { GeoPromptType, UserIntent } from "@/api/geo-prompts";

export const geoPromptTypeOptions: Array<{ label: string; value: GeoPromptType }> = [
  { label: "训练词", value: "base" },
  { label: "蒸馏词", value: "distilled" },
  { label: "品牌词", value: "brand" },
  { label: "场景词", value: "scene" }
];

export const userIntentOptions: Array<{ label: string; value: UserIntent }> = [
  { label: "需求决策", value: "selection" },
  { label: "购买 / 合作意向", value: "purchase" },
  { label: "供给方 / 服务方推荐", value: "manufacturer_recommendation" },
  { label: "对比与替代", value: "domestic_alternative" },
  { label: "对比", value: "comparison" },
  { label: "问题诊断", value: "troubleshooting" },
  { label: "场景方案", value: "application_solution" },
  { label: "品牌验证", value: "brand_verification" }
];

export const coverageStatusOptions = [
  { label: "已推荐", value: "recommended" },
  { label: "已提及", value: "mentioned" },
  { label: "未提及", value: "not_mentioned" },
  { label: "未知", value: "unknown" }
];

export const geoPromptTypeLabelMap = Object.fromEntries(
  geoPromptTypeOptions.map((item) => [item.value, item.label])
) as Record<GeoPromptType, string>;

export const userIntentLabelMap = Object.fromEntries(
  userIntentOptions.map((item) => [item.value, item.label])
) as Record<UserIntent, string>;

export const coverageStatusLabelMap: Record<string, string> = {
  mentioned: "已提及",
  not_mentioned: "未提及",
  recommended: "已推荐",
  unknown: "未知"
};

export const splitCommaValues = (value: string) =>
  value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const formatDateTime = (value?: string) => {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString();
};

export const formatOptional = (value?: string | null) => value || "--";

const technicalTracePattern =
  /\b(?:Phase|Auth|UX|User)[\s-]*[0-9A-Za-z-]+|GEOAuth[0-9A-Za-z-]*|smoke|mock|debug|test|batch|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{8,}\b|\b\d{10,}\b/gi;

export const formatGeoPromptDisplayText = (value?: string | null, fallback = "GEO 提示词") => {
  if (!value) {
    return fallback;
  }

  const cleaned = value
    .replace(technicalTracePattern, "")
    .replace(/\b(?:UUID|ID|PLATFORM|COMPANY|PRIVATE)\b/gi, "")
    .replace(/(?:隔离列表|已编辑|已更新)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[：:·\-/\s]+|[：:·\-/\s]+$/g, "")
    .trim();

  return cleaned && cleaned.length > 2 ? cleaned : fallback;
};

export const formatTargetModelName = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  const normalized = value.toLowerCase();
  if (normalized.includes("doubao") || normalized.includes("豆包") || normalized.includes("seed")) {
    return "豆包";
  }
  if (
    normalized.includes("qwen") ||
    normalized.includes("通义") ||
    normalized.includes("千问") ||
    normalized.includes("dashscope")
  ) {
    return "通义千问";
  }
  if (normalized.includes("kimi") || normalized.includes("moonshot")) {
    return "Kimi";
  }
  if (normalized.includes("deepseek")) {
    return "DeepSeek";
  }

  return formatGeoPromptDisplayText(value, value);
};

export const formatTargetModels = (targetModels?: string[]) =>
  targetModels && targetModels.length > 0 ? targetModels.map(formatTargetModelName).join("、") : "--";
