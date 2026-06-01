import type {
  GeoHitDetectionMethod,
  GeoHitDeviceType,
  GeoHitEntryPoint,
  GeoHitLevel,
  ModelInclusionVoidStatus,
  RecordMethod
} from "@/api/model-inclusion";

export const recordMethodOptions: Array<{ label: string; value: RecordMethod }> = [
  { label: "人工录入", value: "manual" },
  { label: "批量导入", value: "import" },
  { label: "API 记录", value: "api" }
];

export const booleanFilterOptions = [
  { label: "是", value: true },
  { label: "否", value: false }
];

export const modelInclusionVoidStatusOptions: Array<{
  label: string;
  value: ModelInclusionVoidStatus;
}> = [
  { label: "正常", value: "normal" },
  { label: "已作废", value: "voided" },
  { label: "全部", value: "all" }
];

export const enabledMonitoringModelOptions = [
  {
    label: "豆包",
    value: "doubao-seed-1-6-250615",
    platform: "豆包 / 火山方舟",
    helper: "火山方舟 Web Search 监测入口",
    keywords: ["doubao", "豆包", "火山", "volcengine", "ark"]
  },
  {
    label: "通义千问",
    value: "qwen3-max",
    platform: "通义千问 / 阿里云百炼",
    helper: "阿里云百炼 Web Search 监测入口",
    keywords: ["qwen", "通义", "千问", "百炼", "aliyun", "dashscope"]
  },
  {
    label: "Kimi",
    value: "kimi-k2.6",
    platform: "Kimi / Moonshot",
    helper: "Kimi Web Search 监测入口",
    keywords: ["kimi", "moonshot"]
  }
] as const;

type MonitoringModelRecord = {
  model?: string;
  platform?: string;
};

export const isEnabledMonitoringRecord = (record: MonitoringModelRecord) => {
  const text = `${record.model ?? ""} ${record.platform ?? ""}`.toLowerCase();

  return enabledMonitoringModelOptions.some((option) =>
    option.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );
};

export const entryPointOptions: Array<{ label: string; value: GeoHitEntryPoint }> = [
  { label: "模型 API", value: "api_model" },
  { label: "联网搜索 API", value: "web_search_api" },
  { label: "PC 网页端", value: "web_pc" },
  { label: "移动网页端", value: "web_mobile" },
  { label: "iOS App", value: "app_ios" },
  { label: "Android App", value: "app_android" },
  { label: "人工录入", value: "manual" }
];

export const detectionMethodOptions: Array<{ label: string; value: GeoHitDetectionMethod }> = [
  { label: "人工录入", value: "manual" },
  { label: "API 检测", value: "api" },
  { label: "联网搜索", value: "web_search" },
  { label: "浏览器采集", value: "browser_capture" },
  { label: "移动端模拟", value: "mobile_emulation" },
  { label: "App 人工抽查", value: "app_manual" }
];

export const deviceTypeOptions: Array<{ label: string; value: GeoHitDeviceType }> = [
  { label: "桌面端", value: "desktop" },
  { label: "移动端", value: "mobile" },
  { label: "iOS", value: "ios" },
  { label: "Android", value: "android" },
  { label: "API", value: "api" }
];

export const hitLevelOptions: Array<{ label: string; value: GeoHitLevel; type?: string }> = [
  { label: "推荐命中", value: "recommended", type: "success" },
  { label: "提及命中", value: "mentioned", type: "primary" },
  { label: "引用命中", value: "cited", type: "success" },
  { label: "竞品命中", value: "competitor_only", type: "warning" },
  { label: "未命中", value: "not_mentioned", type: "danger" },
  { label: "无法判断", value: "unclear", type: "info" }
];

export const recordMethodLabelMap = Object.fromEntries(
  recordMethodOptions.map((item) => [item.value, item.label])
) as Record<RecordMethod, string>;

export const entryPointLabelMap = Object.fromEntries(
  entryPointOptions.map((item) => [item.value, item.label])
) as Record<GeoHitEntryPoint, string>;

export const detectionMethodLabelMap = Object.fromEntries(
  detectionMethodOptions.map((item) => [item.value, item.label])
) as Record<GeoHitDetectionMethod, string>;

export const deviceTypeLabelMap = Object.fromEntries(
  deviceTypeOptions.map((item) => [item.value, item.label])
) as Record<GeoHitDeviceType, string>;

export const hitLevelLabelMap = Object.fromEntries(
  hitLevelOptions.map((item) => [item.value, item.label])
) as Record<GeoHitLevel, string>;

export const hitLevelTypeMap = Object.fromEntries(
  hitLevelOptions.map((item) => [item.value, item.type ?? "info"])
) as Record<GeoHitLevel, string>;

export const formatRate = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
};

export const formatDistribution = (distribution?: Record<string, number>) =>
  Object.entries(distribution ?? {}).sort((a, b) => b[1] - a[1]);

export const formatDisplayLabel = (value?: string, fallback = "未填写") => {
  if (!value) {
    return fallback;
  }

  const cleaned = value
    .replace(/\b(?:Phase|Auth|UX|User)[\s-]*[0-9A-Za-z-]+[:：]?\s*/gi, "")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
    .replace(/\b\d{10,}\b/g, "")
    .replace(/\b(?:batch|mock|test)[-_][A-Za-z0-9-]{6,}\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[：:·\-/\s]+|[：:·\-/\s]+$/g, "")
    .trim();

  return cleaned || fallback;
};

export const formatCompetitors = (competitors?: string[]) =>
  competitors && competitors.length > 0 ? competitors.join("、") : "--";

export const truncateSummary = (value?: string, maxLength = 110) => {
  if (!value) {
    return "--";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};
