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

export type CoverageReviewStatus = "good" | "needs_attention" | "manual_review";

export type CoverageReviewResult = {
  status: CoverageReviewStatus;
  reasons: string[];
  nextActions: string[];
  contentTypes: string[];
  evidenceTypes: string[];
};

type CoverageReviewRecord = {
  brandMentioned?: boolean;
  brandRecommended?: boolean;
  citedOfficialSite?: boolean;
  citedContentAsset?: boolean;
  competitorMentioned?: boolean;
  hitLevel?: string;
  errorMessage?: string;
  isWebSearchEnabled?: boolean;
  entryPoint?: string;
  detectionMethod?: string;
  geoPrompt?: {
    promptText?: string;
  };
};

const positiveCoverageReview: CoverageReviewResult = {
  status: "good",
  reasons: ["当前记录表现较好"],
  nextActions: ["继续跟踪复测，暂不需要优先补救"],
  contentTypes: ["持续观察"],
  evidenceTypes: ["持续观察"]
};

const manualCoverageReviewDefaults = {
  reasons: ["检测结果无法判断或检测异常"],
  nextActions: ["人工复核原始回答后重新复测该提示词"],
  contentTypes: ["暂不判断"],
  evidenceTypes: ["暂不判断"]
};

const addUniqueItems = (target: string[], items: string[]) => {
  for (const item of items) {
    if (!target.includes(item)) {
      target.push(item);
    }
  }
};

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword.toLowerCase()));

const isWebSearchLikeRecord = (record: CoverageReviewRecord) =>
  Boolean(record.isWebSearchEnabled) ||
  record.entryPoint === "web_search_api" ||
  record.entryPoint === "web_pc" ||
  record.entryPoint === "web_mobile" ||
  record.detectionMethod === "web_search" ||
  record.detectionMethod === "browser_capture";

const applyPromptTextReviewHints = (
  promptText: string,
  review: Pick<CoverageReviewResult, "contentTypes" | "evidenceTypes">
) => {
  const normalizedPromptText = promptText.toLowerCase();

  // 根据提示词文本补充建议，避免只看命中布尔值导致复盘太粗。
  if (hasAnyKeyword(normalizedPromptText, ["参数", "量程", "精度", "分辨率", "输出", "响应时间"])) {
    addUniqueItems(review.contentTypes, ["产品参数内容"]);
    addUniqueItems(review.evidenceTypes, ["产品参数"]);
  }

  if (
    hasAnyKeyword(normalizedPromptText, [
      "场景",
      "工况",
      "粉尘",
      "水汽",
      "强光",
      "输送线",
      "料位",
      "液位"
    ])
  ) {
    addUniqueItems(review.contentTypes, ["应用场景内容"]);
    addUniqueItems(review.evidenceTypes, ["应用场景"]);
  }

  if (
    hasAnyKeyword(normalizedPromptText, [
      "对比",
      "替代",
      "品牌",
      "ifm",
      "baumer",
      "keyence",
      "基恩士"
    ])
  ) {
    addUniqueItems(review.contentTypes, ["品牌对比内容", "替代型号内容"]);
    addUniqueItems(review.evidenceTypes, ["产品参数", "选型建议"]);
  }

  if (hasAnyKeyword(normalizedPromptText, ["案例", "项目", "方案", "边坡", "桥梁", "矿山"])) {
    addUniqueItems(review.contentTypes, ["案例 / 项目内容"]);
    addUniqueItems(review.evidenceTypes, ["案例 / 项目"]);
  }

  if (hasAnyKeyword(normalizedPromptText, ["故障", "不稳定", "不准", "误报", "排查"])) {
    addUniqueItems(review.contentTypes, ["FAQ 问答内容"]);
    addUniqueItems(review.evidenceTypes, ["故障排查"]);
  }
};

export const inferCoverageReview = (record: CoverageReviewRecord): CoverageReviewResult => {
  if (record.hitLevel === "unclear" || record.errorMessage) {
    return {
      status: "manual_review",
      ...manualCoverageReviewDefaults
    };
  }

  if (record.brandMentioned && record.brandRecommended && record.citedOfficialSite) {
    return positiveCoverageReview;
  }

  const review: CoverageReviewResult = {
    status: "needs_attention",
    reasons: [],
    nextActions: [],
    contentTypes: [],
    evidenceTypes: []
  };

  if (record.competitorMentioned && !record.brandMentioned) {
    addUniqueItems(review.reasons, ["模型回答偏向竞品"]);
    addUniqueItems(review.nextActions, ["生成品牌对比 / 替代型号文章"]);
    addUniqueItems(review.contentTypes, ["品牌对比内容", "替代型号内容"]);
    addUniqueItems(review.evidenceTypes, ["产品参数", "选型建议", "案例 / 项目"]);
  }

  if (record.brandMentioned && !record.brandRecommended) {
    addUniqueItems(review.reasons, ["品牌露出不自然 / 缺少选型理由"]);
    addUniqueItems(review.nextActions, ["补充选型指南内容和应用场景说明"]);
    addUniqueItems(review.contentTypes, ["选型指南内容", "应用场景内容", "FAQ 问答内容"]);
    addUniqueItems(review.evidenceTypes, ["选型建议", "应用场景", "产品参数"]);
  }

  if (!record.citedOfficialSite) {
    if (isWebSearchLikeRecord(record)) {
      addUniqueItems(review.reasons, ["官网权威度不足或官网内容不可引用"]);
      addUniqueItems(review.nextActions, ["补官网可引用段落，并优化文章结构化内容"]);
      addUniqueItems(review.contentTypes, ["官网可引用内容", "FAQ 问答内容"]);
      addUniqueItems(review.evidenceTypes, ["品牌介绍", "产品参数", "应用场景"]);
    } else {
      addUniqueItems(review.reasons, ["当前检测环境可能未启用联网或引用链路不完整"]);
      addUniqueItems(review.nextActions, ["人工复核检测上下文后再判断官网引用情况"]);
    }
  }

  if (record.hitLevel === "not_mentioned" || !record.brandMentioned) {
    addUniqueItems(review.reasons, ["资料依据不足 / 内容覆盖不足"]);
    addUniqueItems(review.nextActions, ["补充知识库证据，并生成对应问法的文章"]);
    addUniqueItems(review.contentTypes, ["选型指南内容", "应用场景内容", "FAQ 问答内容"]);
    addUniqueItems(review.evidenceTypes, ["产品参数", "应用场景", "选型建议"]);
  }

  if (!record.citedContentAsset) {
    addUniqueItems(review.reasons, ["缺少第三方平台内容或已发布内容未进入回答链路"]);
    addUniqueItems(review.nextActions, ["补第三方平台内容，并围绕真实问法发布结构化文章"]);
    addUniqueItems(review.contentTypes, ["第三方平台内容", "品牌对比内容", "案例 / 项目内容"]);
    addUniqueItems(review.evidenceTypes, ["案例 / 项目", "品牌介绍", "选型建议"]);
  }

  applyPromptTextReviewHints(record.geoPrompt?.promptText ?? "", review);

  if (review.reasons.length === 0) {
    addUniqueItems(review.reasons, ["需要人工复核"]);
    addUniqueItems(review.nextActions, ["人工复核原始回答"]);
    addUniqueItems(review.contentTypes, ["暂不判断"]);
    addUniqueItems(review.evidenceTypes, ["暂不判断"]);
    review.status = "manual_review";
  }

  return review;
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
