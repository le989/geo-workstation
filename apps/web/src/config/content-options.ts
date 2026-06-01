import type { PublishStatus, TaskStatus } from "@/api/content";

export const contentTaskStatusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: "待处理", value: "pending" },
  { label: "生成中", value: "running" },
  { label: "已完成", value: "succeeded" },
  { label: "需人工检查", value: "failed" },
  { label: "已归档", value: "cancelled" }
];

export const generationTypeOptions = [
  { label: "文章", value: "article" },
  { label: "FAQ", value: "faq" },
  { label: "需求决策指南", value: "selection_guide" },
  { label: "场景解决方案", value: "application_solution" },
  { label: "对比与替代内容", value: "domestic_alternative" },
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

export const publishStatusOptions: Array<{ label: string; value: PublishStatus; type: string }> = [
  { label: "可复制", value: "publish_ready", type: "success" },
  { label: "需人工检查", value: "needs_review", type: "warning" },
  { label: "需人工检查", value: "not_recommended", type: "danger" }
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

export const publishStatusLabelMap = Object.fromEntries(
  publishStatusOptions.map((item) => [item.value, item.label])
) as Record<PublishStatus, string>;

export const publishStatusTypeMap = Object.fromEntries(
  publishStatusOptions.map((item) => [item.value, item.type])
) as Record<PublishStatus, string>;

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
