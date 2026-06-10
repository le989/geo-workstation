import type { GeoPromptType, UserIntent } from "@/api/geo-prompts";

export type QuestionTypeValue =
  | "selection"
  | "parameter"
  | "application"
  | "brand_comparison"
  | "troubleshooting"
  | "purchase"
  | "replacement"
  | "industry_solution";

export type QuestionTypeOption = {
  label: string;
  value: QuestionTypeValue;
};

export type PromptBusinessValueValue = "high" | "medium" | "low" | "unknown";

export type PromptBusinessValueOption = {
  label: string;
  value: PromptBusinessValueValue;
  description: string;
};

export type BuyingStageValue =
  | "awareness"
  | "selection"
  | "comparison"
  | "purchase"
  | "aftersales"
  | "unknown";

export type BuyingStageOption = {
  label: string;
  value: BuyingStageValue;
  description: string;
};

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

export const questionTypeOptions: QuestionTypeOption[] = [
  { label: "选型问题", value: "selection" },
  { label: "参数问题", value: "parameter" },
  { label: "应用场景问题", value: "application" },
  { label: "品牌对比问题", value: "brand_comparison" },
  { label: "故障排查问题", value: "troubleshooting" },
  { label: "价格 / 采购问题", value: "purchase" },
  { label: "替代型号问题", value: "replacement" },
  { label: "行业方案问题", value: "industry_solution" }
];

export const promptBusinessValueOptions: PromptBusinessValueOption[] = [
  {
    label: "高意向",
    value: "high",
    description: "更接近采购、转化或品牌替代，建议优先监测、补证据和写文章。"
  },
  {
    label: "中意向",
    value: "medium",
    description: "适合做内容覆盖和知识库补证据，常见于选型、参数、场景和排查问题。"
  },
  {
    label: "低意向",
    value: "low",
    description: "偏认知科普，可做基础覆盖，但优先级通常低于采购和选型问题。"
  },
  {
    label: "待判断",
    value: "unknown",
    description: "规则暂时无法稳定判断，需要人工结合业务上下文确认。"
  }
];

export const buyingStageOptions: BuyingStageOption[] = [
  {
    label: "认知阶段",
    value: "awareness",
    description: "用户在了解概念、原理或基础区别。"
  },
  {
    label: "选型阶段",
    value: "selection",
    description: "用户在比较参数、工况和方案适配性。"
  },
  {
    label: "对比阶段",
    value: "comparison",
    description: "用户在比较品牌、竞品或替代型号。"
  },
  {
    label: "采购阶段",
    value: "purchase",
    description: "用户接近询价、采购、厂家或供应商选择。"
  },
  {
    label: "售后阶段",
    value: "aftersales",
    description: "用户关注故障、调试、维修和使用异常。"
  },
  {
    label: "待判断",
    value: "unknown",
    description: "当前问法缺少稳定意图词，需要人工确认。"
  }
];

export const geoPromptTypeLabelMap = Object.fromEntries(
  geoPromptTypeOptions.map((item) => [item.value, item.label])
) as Record<GeoPromptType, string>;

export const userIntentLabelMap = Object.fromEntries(
  userIntentOptions.map((item) => [item.value, item.label])
) as Record<UserIntent, string>;

export const questionTypeLabelMap = Object.fromEntries(
  questionTypeOptions.map((item) => [item.value, item.label])
) as Record<QuestionTypeValue, string>;

export const promptBusinessValueLabelMap = Object.fromEntries(
  promptBusinessValueOptions.map((item) => [item.value, item.label])
) as Record<PromptBusinessValueValue, string>;

export const promptBusinessValueDescriptionMap = Object.fromEntries(
  promptBusinessValueOptions.map((item) => [item.value, item.description])
) as Record<PromptBusinessValueValue, string>;

export const buyingStageLabelMap = Object.fromEntries(
  buyingStageOptions.map((item) => [item.value, item.label])
) as Record<BuyingStageValue, string>;

export const buyingStageDescriptionMap = Object.fromEntries(
  buyingStageOptions.map((item) => [item.value, item.description])
) as Record<BuyingStageValue, string>;

export const coverageStatusLabelMap: Record<string, string> = {
  mentioned: "已提及",
  not_mentioned: "未提及",
  recommended: "已推荐",
  unknown: "未知"
};

const questionTypeKeywordRules: Array<{
  value: QuestionTypeValue;
  keywords: string[];
}> = [
  {
    value: "replacement",
    keywords: ["替代", "替换", "兼容", "代替", "同款", "替代型号", "替换型号", "能不能替", "可以替"]
  },
  {
    value: "troubleshooting",
    keywords: ["故障", "不稳定", "不准", "误报", "无信号", "跳动", "排查", "异常", "怎么处理", "为什么"]
  },
  {
    value: "brand_comparison",
    keywords: [
      "对比",
      "区别",
      "哪个好",
      "哪家好",
      "品牌",
      "凯基特",
      "凯路智联",
      "ifm",
      "baumer",
      "keyence",
      "基恩士",
      "倍加福",
      "西克"
    ]
  },
  {
    value: "parameter",
    keywords: [
      "参数",
      "量程",
      "精度",
      "分辨率",
      "输出",
      "响应时间",
      "防护等级",
      "安装距离",
      "检测距离",
      "供电",
      "接口"
    ]
  },
  {
    value: "selection",
    keywords: ["怎么选", "如何选", "选型", "选择", "适合哪种", "用哪种", "推荐哪种", "需要看哪些"]
  },
  {
    value: "application",
    keywords: [
      "应用场景",
      "适用场景",
      "适合用于",
      "可用于",
      "工况",
      "现场",
      "粉尘",
      "水汽",
      "强光",
      "高温",
      "户外",
      "输送线",
      "料位",
      "液位"
    ]
  },
  {
    value: "industry_solution",
    keywords: [
      "方案",
      "系统",
      "行业",
      "项目",
      "边坡",
      "桥梁",
      "矿山",
      "水利",
      "工厂",
      "产线",
      "智慧工地",
      "监测方案"
    ]
  },
  {
    value: "purchase",
    keywords: ["价格", "多少钱", "报价", "采购", "厂家", "供应商", "交期", "现货", "购买", "成本"]
  }
];

const userIntentQuestionTypeMap: Partial<Record<UserIntent, QuestionTypeValue>> = {
  application_solution: "application",
  brand_verification: "brand_comparison",
  comparison: "brand_comparison",
  domestic_alternative: "replacement",
  manufacturer_recommendation: "brand_comparison",
  purchase: "purchase",
  selection: "selection",
  troubleshooting: "troubleshooting"
};

const promptBusinessValueKeywordRules: Array<{
  value: PromptBusinessValueValue;
  keywords: string[];
}> = [
  {
    value: "high",
    keywords: [
      "厂家",
      "推荐",
      "哪家好",
      "价格",
      "报价",
      "采购",
      "购买",
      "供应商",
      "国产替代",
      "替代",
      "替换",
      "方案推荐",
      "型号推荐",
      "ifm",
      "baumer",
      "keyence",
      "基恩士",
      "堡盟"
    ]
  },
  {
    value: "medium",
    keywords: [
      "怎么选",
      "选型",
      "应用",
      "场景",
      "工况",
      "参数",
      "量程",
      "输出方式",
      "输出",
      "安装",
      "接线",
      "检测距离",
      "粉尘",
      "水汽",
      "料位",
      "防撞",
      "对比",
      "区别",
      "故障",
      "排查"
    ]
  },
  {
    value: "low",
    keywords: ["是什么", "原理", "工作原理", "定义", "基础", "百科", "简介"]
  }
];

const questionTypeBusinessValueMap: Partial<Record<QuestionTypeValue, PromptBusinessValueValue>> = {
  application: "medium",
  brand_comparison: "medium",
  industry_solution: "medium",
  parameter: "medium",
  purchase: "high",
  replacement: "high",
  selection: "medium",
  troubleshooting: "medium"
};

const userIntentBusinessValueMap: Partial<Record<UserIntent, PromptBusinessValueValue>> = {
  application_solution: "medium",
  brand_verification: "medium",
  comparison: "medium",
  domestic_alternative: "high",
  manufacturer_recommendation: "high",
  purchase: "high",
  selection: "medium",
  troubleshooting: "medium"
};

const buyingStageKeywordRules: Array<{
  value: BuyingStageValue;
  keywords: string[];
}> = [
  {
    value: "aftersales",
    keywords: ["故障", "不稳定", "没信号", "无信号", "误检", "误报", "不准", "调试", "维修", "接线问题", "报警"]
  },
  {
    value: "comparison",
    keywords: [
      "对比",
      "区别",
      "替代",
      "替换",
      "国产替代",
      "ifm",
      "baumer",
      "keyence",
      "基恩士",
      "堡盟",
      "sick",
      "西克",
      "omron",
      "欧姆龙"
    ]
  },
  {
    value: "purchase",
    keywords: ["厂家", "供应商", "报价", "价格", "采购", "购买", "哪家好", "推荐", "选哪家"]
  },
  {
    value: "selection",
    keywords: ["怎么选", "选型", "参数", "量程", "输出", "安装", "工况", "应用场景", "方案", "检测距离"]
  },
  {
    value: "awareness",
    keywords: ["是什么", "原理", "工作原理", "区别", "简介", "基础介绍"]
  }
];

const questionTypeBuyingStageMap: Partial<Record<QuestionTypeValue, BuyingStageValue>> = {
  application: "selection",
  brand_comparison: "comparison",
  industry_solution: "selection",
  parameter: "selection",
  purchase: "purchase",
  replacement: "comparison",
  selection: "selection",
  troubleshooting: "aftersales"
};

const userIntentBuyingStageMap: Partial<Record<UserIntent, BuyingStageValue>> = {
  application_solution: "selection",
  brand_verification: "comparison",
  comparison: "comparison",
  domestic_alternative: "comparison",
  manufacturer_recommendation: "purchase",
  purchase: "purchase",
  selection: "selection",
  troubleshooting: "aftersales"
};

const normalizePromptForInference = (...values: Array<string | undefined | null>) =>
  values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim()
    .toLowerCase();

const matchesKeywords = (normalizedText: string, keywords: string[]) =>
  keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()));

export const inferQuestionType = (
  promptText: string,
  userIntent?: string
): QuestionTypeOption => {
  const normalizedPromptText = promptText.trim().toLowerCase();

  // 先按真实问句文本判断，避免把同一意图下的参数、替代和故障问题混在一起。
  for (const rule of questionTypeKeywordRules) {
    if (rule.keywords.some((keyword) => normalizedPromptText.includes(keyword.toLowerCase()))) {
      return {
        label: questionTypeLabelMap[rule.value],
        value: rule.value
      };
    }
  }

  const fallbackValue = userIntent ? userIntentQuestionTypeMap[userIntent as UserIntent] : undefined;
  const questionTypeValue = fallbackValue ?? "selection";

  return {
    label: questionTypeLabelMap[questionTypeValue],
    value: questionTypeValue
  };
};

export const inferPromptBusinessValue = (
  promptText: string,
  questionType?: string,
  userIntent?: string
): PromptBusinessValueOption => {
  const normalizedPromptText = normalizePromptForInference(promptText);

  // 业务价值只是前端轻量判断，不等于正式商机评分或后端数据结论。
  for (const rule of promptBusinessValueKeywordRules) {
    if (matchesKeywords(normalizedPromptText, rule.keywords)) {
      return {
        description: promptBusinessValueDescriptionMap[rule.value],
        label: promptBusinessValueLabelMap[rule.value],
        value: rule.value
      };
    }
  }

  const fallbackValue =
    questionTypeBusinessValueMap[questionType as QuestionTypeValue] ??
    (userIntent ? userIntentBusinessValueMap[userIntent as UserIntent] : undefined) ??
    "unknown";

  return {
    description: promptBusinessValueDescriptionMap[fallbackValue],
    label: promptBusinessValueLabelMap[fallbackValue],
    value: fallbackValue
  };
};

export const inferBuyingStage = (
  promptText: string,
  questionType?: string,
  userIntent?: string
): BuyingStageOption => {
  const normalizedPromptText = normalizePromptForInference(promptText);

  // 购买阶段按售后、对比、采购、选型、认知的顺序判断，避免竞品和故障问题被泛化。
  for (const rule of buyingStageKeywordRules) {
    if (matchesKeywords(normalizedPromptText, rule.keywords)) {
      return {
        description: buyingStageDescriptionMap[rule.value],
        label: buyingStageLabelMap[rule.value],
        value: rule.value
      };
    }
  }

  const fallbackValue =
    questionTypeBuyingStageMap[questionType as QuestionTypeValue] ??
    (userIntent ? userIntentBuyingStageMap[userIntent as UserIntent] : undefined) ??
    "unknown";

  return {
    description: buyingStageDescriptionMap[fallbackValue],
    label: buyingStageLabelMap[fallbackValue],
    value: fallbackValue
  };
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
