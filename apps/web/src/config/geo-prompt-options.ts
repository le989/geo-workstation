import type { GeoPromptType, UserIntent } from "@/api/geo-prompts";

export const geoPromptTypeOptions: Array<{ label: string; value: GeoPromptType }> = [
  { label: "训练词", value: "base" },
  { label: "蒸馏词", value: "distilled" },
  { label: "品牌词", value: "brand" },
  { label: "场景词", value: "scene" }
];

export const userIntentOptions: Array<{ label: string; value: UserIntent }> = [
  { label: "选型", value: "selection" },
  { label: "采购", value: "purchase" },
  { label: "厂家推荐", value: "manufacturer_recommendation" },
  { label: "国产替代", value: "domestic_alternative" },
  { label: "对比", value: "comparison" },
  { label: "故障排查", value: "troubleshooting" },
  { label: "应用方案", value: "application_solution" },
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

export const formatTargetModels = (targetModels?: string[]) =>
  targetModels && targetModels.length > 0 ? targetModels.join("、") : "--";
