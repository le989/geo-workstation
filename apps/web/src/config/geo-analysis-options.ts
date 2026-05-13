import type { TaskStatus } from "@/api/content";

export const geoAnalysisStatusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: "待执行", value: "pending" },
  { label: "分析中", value: "running" },
  { label: "已完成", value: "succeeded" },
  { label: "失败", value: "failed" },
  { label: "已取消", value: "cancelled" }
];

export const geoAnalysisStatusLabelMap = Object.fromEntries(
  geoAnalysisStatusOptions.map((item) => [item.value, item.label])
) as Record<TaskStatus, string>;

export const geoAnalysisStatusTagTypeMap: Record<
  TaskStatus,
  "info" | "primary" | "success" | "warning" | "danger"
> = {
  cancelled: "info",
  failed: "danger",
  pending: "info",
  running: "warning",
  succeeded: "success"
};

export const convertPromptReasonLabelMap: Record<string, string> = {
  duplicate_in_database: "提示词库已存在",
  duplicate_in_selection: "本次选择重复"
};

export const analysisSummaryLabels: Record<string, string> = {
  brandName: "品牌名称",
  contentGapCount: "内容缺口数",
  isMock: "模拟分析",
  knowledgeGapCount: "知识库缺口数",
  modelCount: "目标模型数",
  promptSuggestionCount: "提示词建议数",
  productLine: "产品线",
  websiteUrl: "官网"
};

export const defaultTargetModels = ["deepseek-chat", "doubao", "kimi"];
