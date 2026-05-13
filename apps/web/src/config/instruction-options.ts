import type { GeoPromptType } from "@/api/geo-prompts";

export const instructionTypeOptions = [
  { label: "AI 问答优化", value: "ai_qa" },
  { label: "选型指南", value: "selection_guide" },
  { label: "厂家推荐", value: "manufacturer_recommendation" },
  { label: "国产替代", value: "domestic_alternative" },
  { label: "应用方案", value: "application_solution" },
  { label: "产品对比", value: "comparison" },
  { label: "故障排查", value: "troubleshooting" },
  { label: "技术科普", value: "tech_explainer" },
  { label: "FAQ", value: "faq" },
  { label: "官网落地页", value: "landing_page" }
];

export const contentTypeOptions = [
  { label: "文章", value: "article" },
  { label: "FAQ", value: "faq" },
  { label: "选型指南", value: "selection_guide" },
  { label: "应用方案", value: "application_solution" },
  { label: "AI 问答素材", value: "qa_material" },
  { label: "对比内容", value: "comparison" },
  { label: "品牌实力内容", value: "brand_strength" },
  { label: "销售问答", value: "sales_qa" },
  { label: "GEO 内容", value: "geo_content" }
];

export const targetPromptTypeOptions: Array<{ label: string; value: GeoPromptType }> = [
  { label: "训练词", value: "base" },
  { label: "蒸馏词", value: "distilled" },
  { label: "品牌词", value: "brand" },
  { label: "场景词", value: "scene" }
];

export const instructionTypeLabelMap = Object.fromEntries(
  instructionTypeOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const contentTypeLabelMap = Object.fromEntries(
  contentTypeOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const targetPromptTypeLabelMap = Object.fromEntries(
  targetPromptTypeOptions.map((item) => [item.value, item.label])
) as Record<GeoPromptType, string>;

export const formatInstructionText = (value?: string | null) => value || "--";

export const truncateInstructionText = (value?: string, maxLength = 120) => {
  if (!value) {
    return "--";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};
