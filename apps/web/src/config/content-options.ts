import type { TaskStatus } from "@/api/content";

export const contentTaskStatusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: "待执行", value: "pending" },
  { label: "生成中", value: "running" },
  { label: "已完成", value: "succeeded" },
  { label: "失败", value: "failed" },
  { label: "已取消", value: "cancelled" }
];

export const generationTypeOptions = [
  { label: "文章", value: "article" },
  { label: "FAQ", value: "faq" },
  { label: "选型指南", value: "selection_guide" },
  { label: "应用方案", value: "application_solution" },
  { label: "国产替代内容", value: "domestic_alternative" },
  { label: "对比内容", value: "comparison" },
  { label: "AI 问答素材", value: "qa_material" },
  { label: "品牌实力内容", value: "brand_strength" },
  { label: "销售问答", value: "sales_qa" }
];

export const contentItemStatusOptions = [
  { label: "草稿", value: "draft" },
  { label: "待复核", value: "reviewing" },
  { label: "可发布", value: "ready" },
  { label: "已发布", value: "published" },
  { label: "失败", value: "failed" }
];

export const contentTaskStatusLabelMap = Object.fromEntries(
  contentTaskStatusOptions.map((item) => [item.value, item.label])
) as Record<TaskStatus, string>;

export const generationTypeLabelMap = Object.fromEntries(
  generationTypeOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const contentItemStatusLabelMap = Object.fromEntries(
  contentItemStatusOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const formatPercentLike = (value?: string | null) => value || "--";

export const formatGeoOptimizationPoints = (points?: string[]) =>
  points && points.length > 0 ? points.join("；") : "--";

export const splitLinesToArray = (value: string) =>
  value
    .split(/\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);

export const truncateContentText = (value?: string, maxLength = 120) => {
  if (!value) {
    return "--";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};
