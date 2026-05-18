import type { TaskStatus } from "@/api/content";

export const geoAnalysisStatusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: "待执行", value: "pending" },
  { label: "分析中", value: "running" },
  { label: "已完成", value: "succeeded" },
  { label: "失败", value: "failed" },
  { label: "已归档", value: "cancelled" }
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
  conclusion: "诊断结论",
  contentGapCount: "内容缺口数",
  isMock: "诊断标记",
  knowledgeGapCount: "知识库缺口数",
  modelCount: "目标模型数",
  promptSuggestionCount: "提示词建议数",
  productLine: "产品线",
  targetModels: "目标模型",
  websiteSignal: "官网引用信号",
  websiteUrl: "官网"
};

export const defaultTargetModels = ["doubao-seed-1-6-250615", "qwen3-max", "kimi-k2.6"];

export const targetModelOptions = [
  { label: "豆包", value: "doubao-seed-1-6-250615" },
  { label: "通义千问", value: "qwen3-max" },
  { label: "Kimi", value: "kimi-k2.6" }
];

const technicalTracePattern =
  /\b(?:Phase|Auth|UX|User)[\s-]*[0-9A-Za-z-]+|smoke|mock|debug|test|batch|running|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{8,}\b|\b\d{10,}\b/gi;

export const hasGeoAnalysisTechnicalTrace = (value?: string) =>
  Boolean(value && new RegExp(technicalTracePattern.source, "i").test(value));

export const formatGeoAnalysisDisplayText = (value?: string, fallback = "未填写") => {
  if (!value) {
    return fallback;
  }

  const cleaned = value
    .replace(technicalTracePattern, "")
    .replace(/\bdeepseek-chat\b/gi, "DeepSeek")
    .replace(/\bdoubao\b/gi, "豆包")
    .replace(/\bkimi\b/gi, "Kimi")
    .replace(/\bqwen[-_\w]*\b/gi, "通义千问")
    .replace(/\b(?:API|PC|UUID|ID)\b/gi, "")
    .replace(/\b(?:已编辑|已更新|执行分析|列表筛选|创建内容任务|转提示词|创建)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[：:·\-/\s]+|[：:·\-/\s]+$/g, "")
    .trim();

  return cleaned || fallback;
};

export const formatGeoAnalysisTaskTitle = (value: string, brandName?: string) => {
  const fallback = brandName ? `${brandName}品牌覆盖诊断` : "品牌覆盖诊断";
  const cleaned = formatGeoAnalysisDisplayText(value, fallback);

  if (cleaned.length <= 3 || /^(api|pc|web)$/i.test(cleaned)) {
    return fallback;
  }

  return cleaned;
};

export const formatTargetModelName = (value?: string) => {
  if (!value) {
    return "未填写";
  }

  const normalized = value.toLowerCase();
  if (normalized.includes("deepseek")) {
    return "DeepSeek";
  }
  if (normalized.includes("doubao") || normalized.includes("豆包")) {
    return "豆包";
  }
  if (normalized.includes("kimi")) {
    return "Kimi";
  }
  if (normalized.includes("qwen") || normalized.includes("通义")) {
    return "通义千问";
  }

  return value;
};

export const formatTargetModelNames = (values: string[] = []) =>
  values.length > 0 ? values.map(formatTargetModelName).join("、") : "未填写";
