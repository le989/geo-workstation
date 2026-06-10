import type {
  KnowledgeApplicableModule,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  ParseStatus
} from "@/api/knowledge";

export const knowledgeBaseStatusOptions = [
  { label: "启用", value: "active" },
  { label: "停用", value: "disabled" }
];

export const sourceTypeOptions = [
  { label: "粘贴文本", value: "pasted_text" },
  { label: "文本导入", value: "text_import" },
  { label: "上传文件", value: "uploaded_file" },
  { label: "手动录入", value: "manual" },
  { label: "文件上传", value: "upload" }
];

export const materialTypeOptions = [
  { label: "产品资料", value: "product_material" },
  { label: "售后资料", value: "aftersales_material" },
  { label: "公司可信信息", value: "company_trust_material" },
  { label: "内容引用资料", value: "content_reference_material" },
  { label: "内部制度 / 流程资料", value: "internal_process_material" },
  { label: "客户案例资料", value: "customer_case_material" }
];

export const materialTopicOptions = [
  { label: "公司新闻", value: "公司新闻" },
  { label: "活动资讯", value: "活动资讯" },
  { label: "资质证书", value: "资质证书" },
  { label: "培训资料", value: "培训资料" },
  { label: "行业动态", value: "行业动态" },
  { label: "选型资料", value: "选型资料" },
  { label: "故障排查", value: "故障排查" },
  { label: "安装接线", value: "安装接线" },
  { label: "应用案例", value: "应用案例" },
  { label: "品牌介绍", value: "品牌介绍" },
  { label: "产品参数", value: "产品参数" },
  { label: "售后流程", value: "售后流程" }
];

export type EvidenceTypeValue =
  | "product_parameter"
  | "application_scenario"
  | "selection_advice"
  | "installation_wiring"
  | "troubleshooting"
  | "brand_intro"
  | "case_project"
  | "forbidden_expression";

export type EvidenceTypeOption = {
  label: string;
  value: EvidenceTypeValue;
};

export type EvidenceTypeInferenceInput = {
  title?: string;
  fileName?: string;
  name?: string;
  materialType?: string;
  materialTopic?: string;
  sourceName?: string;
  sourceDescription?: string;
  summary?: string;
  tags?: string[] | string;
  applicableModules?: string[] | string;
};

export const evidenceTypeOptions: EvidenceTypeOption[] = [
  { label: "产品参数", value: "product_parameter" },
  { label: "应用场景", value: "application_scenario" },
  { label: "选型建议", value: "selection_advice" },
  { label: "安装接线", value: "installation_wiring" },
  { label: "故障排查", value: "troubleshooting" },
  { label: "品牌介绍", value: "brand_intro" },
  { label: "案例 / 项目", value: "case_project" },
  { label: "禁用表达", value: "forbidden_expression" }
];

export const reviewStatusOptions: Array<{ label: string; value: KnowledgeReviewStatus }> = [
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "已停用", value: "disabled" }
];

export const trustLevelOptions: Array<{ label: string; value: KnowledgeTrustLevel }> = [
  { label: "高可靠", value: "high" },
  { label: "中可靠", value: "medium" },
  { label: "低可靠", value: "low" }
];

export const applicableModuleOptions: Array<{ label: string; value: KnowledgeApplicableModule }> = [
  { label: "内部检索", value: "internal-search" },
  { label: "GEO 内容生成", value: "geo-content" },
  { label: "售后问答", value: "aftersales-qa" },
  { label: "GEO 分析", value: "geo-analysis" }
];

export const officialCitationStatusOptions = [
  { label: "可被 AI 引用", value: "citable" },
  { label: "暂不可引用", value: "not_citable" }
];

export const materialTypeDefaults: Record<
  string,
  {
    applicableModules: KnowledgeApplicableModule[];
    reviewStatus: KnowledgeReviewStatus;
    trustLevel: KnowledgeTrustLevel;
  }
> = {
  aftersales_material: {
    applicableModules: ["aftersales-qa", "internal-search"],
    reviewStatus: "pending",
    trustLevel: "medium"
  },
  product_material: {
    applicableModules: ["aftersales-qa", "geo-content", "internal-search"],
    reviewStatus: "pending",
    trustLevel: "medium"
  },
  company_trust_material: {
    applicableModules: ["geo-content", "internal-search"],
    reviewStatus: "pending",
    trustLevel: "high"
  },
  content_reference_material: {
    applicableModules: ["geo-content", "internal-search"],
    reviewStatus: "pending",
    trustLevel: "medium"
  },
  internal_process_material: {
    applicableModules: ["internal-search"],
    reviewStatus: "pending",
    trustLevel: "medium"
  },
  customer_case_material: {
    applicableModules: ["geo-content", "internal-search"],
    reviewStatus: "pending",
    trustLevel: "medium"
  }
};

export const parseStatusOptions: Array<{ label: string; value: ParseStatus }> = [
  { label: "待解析", value: "pending" },
  { label: "解析中", value: "parsing" },
  { label: "解析成功", value: "succeeded" },
  { label: "解析失败", value: "failed" }
];

export const knowledgeBaseStatusLabelMap: Record<string, string> = {
  active: "启用",
  disabled: "停用",
  enabled: "启用"
};

export const sourceTypeLabelMap = Object.fromEntries(
  sourceTypeOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const materialTypeLabelMap = Object.fromEntries(
  materialTypeOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const materialTopicLabelMap = Object.fromEntries(
  materialTopicOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const evidenceTypeLabelMap = Object.fromEntries(
  evidenceTypeOptions.map((item) => [item.value, item.label])
) as Record<EvidenceTypeValue, string>;

Object.assign(materialTypeLabelMap, {
  case: "客户案例",
  comparison: "对比资料",
  faq: "常见问题",
  file_import: "文件导入",
  product_info: "产品资料",
  qualification: "资质认证",
  service: "服务说明",
  solution: "解决方案"
});

export const reviewStatusLabelMap = Object.fromEntries(
  reviewStatusOptions.map((item) => [item.value, item.label])
) as Record<KnowledgeReviewStatus, string>;

export const trustLevelLabelMap = Object.fromEntries(
  trustLevelOptions.map((item) => [item.value, item.label])
) as Record<KnowledgeTrustLevel, string>;

export const applicableModuleLabelMap = Object.fromEntries(
  applicableModuleOptions.map((item) => [item.value, item.label])
) as Record<KnowledgeApplicableModule, string>;

export const parseStatusLabelMap = Object.fromEntries(
  parseStatusOptions.map((item) => [item.value, item.label])
) as Record<ParseStatus, string>;

export const supportedKnowledgeFileExtensions = ["txt", "md", "csv", "xlsx", "xls", "docx"];

export const isSupportedKnowledgeFileName = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return Boolean(extension && supportedKnowledgeFileExtensions.includes(extension));
};

export const formatFileSize = (value?: number) => {
  if (!value || value <= 0) {
    return "--";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

export const formatTags = (tags?: string[]) => (tags && tags.length > 0 ? tags.join("、") : "--");

const evidenceTypeKeywordRules: Array<{
  value: EvidenceTypeValue;
  keywords: string[];
}> = [
  {
    value: "forbidden_expression",
    keywords: [
      "禁用",
      "不能说",
      "不要写",
      "禁止",
      "风险词",
      "绝对化",
      "唯一",
      "第一",
      "最好",
      "保证",
      "替代基恩士",
      "替代西克",
      "替代欧姆龙",
      "合规",
      "违规",
      "夸大"
    ]
  },
  {
    value: "troubleshooting",
    keywords: [
      "故障",
      "排查",
      "异常",
      "不稳定",
      "不准",
      "误报",
      "无信号",
      "跳动",
      "失效",
      "报警",
      "维修",
      "售后",
      "处理方法",
      "解决办法",
      "原因"
    ]
  },
  {
    value: "installation_wiring",
    keywords: [
      "安装",
      "接线",
      "调试",
      "布线",
      "固定",
      "支架",
      "安装方式",
      "接线图",
      "线序",
      "pnp",
      "npn",
      "模拟量",
      "485",
      "modbus",
      "供电接线"
    ]
  },
  {
    value: "product_parameter",
    keywords: [
      "参数",
      "规格",
      "型号",
      "量程",
      "精度",
      "分辨率",
      "输出",
      "响应时间",
      "防护等级",
      "检测距离",
      "安装距离",
      "供电",
      "接口",
      "尺寸",
      "规格书",
      "datasheet",
      "说明书"
    ]
  },
  {
    value: "case_project",
    keywords: [
      "案例",
      "项目",
      "客户",
      "现场案例",
      "应用案例",
      "落地",
      "实施",
      "交付",
      "项目经验",
      "工程",
      "改造",
      "部署"
    ]
  },
  {
    value: "selection_advice",
    keywords: [
      "选型",
      "怎么选",
      "如何选",
      "选择",
      "对比",
      "建议",
      "适合",
      "推荐",
      "注意事项",
      "选购",
      "选配",
      "方案选择"
    ]
  },
  {
    value: "application_scenario",
    keywords: [
      "应用",
      "场景",
      "工况",
      "现场",
      "粉尘",
      "水汽",
      "强光",
      "高温",
      "户外",
      "输送线",
      "料位",
      "液位",
      "防撞",
      "定位",
      "测距",
      "检测"
    ]
  },
  {
    value: "brand_intro",
    keywords: [
      "品牌",
      "公司",
      "企业",
      "凯基特",
      "凯路智联",
      "介绍",
      "资质",
      "实力",
      "厂家",
      "供应商",
      "官网",
      "业务范围"
    ]
  }
];

const materialTopicEvidenceTypeMap: Record<string, EvidenceTypeValue> = {
  产品参数: "product_parameter",
  应用案例: "case_project",
  安装接线: "installation_wiring",
  品牌介绍: "brand_intro",
  售后流程: "troubleshooting",
  故障排查: "troubleshooting",
  选型资料: "selection_advice"
};

const materialTypeEvidenceTypeMap: Record<string, EvidenceTypeValue> = {
  aftersales_material: "troubleshooting",
  company_trust_material: "brand_intro",
  content_reference_material: "selection_advice",
  customer_case_material: "case_project",
  product_material: "product_parameter"
};

const normalizeEvidenceTypeText = (value?: string[] | string) => {
  if (Array.isArray(value)) {
    return value.join(" ");
  }

  return value ?? "";
};

export const inferEvidenceType = (material: EvidenceTypeInferenceInput): EvidenceTypeOption => {
  const searchText = [
    material.title,
    material.fileName,
    material.name,
    material.materialTopic,
    material.materialType,
    material.sourceName,
    material.sourceDescription,
    material.summary,
    normalizeEvidenceTypeText(material.tags),
    normalizeEvidenceTypeText(material.applicableModules)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 证据类型只做前端辅助识别，不保存为审核结论，也不改变正式引用规则。
  for (const rule of evidenceTypeKeywordRules) {
    if (rule.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()))) {
      return {
        label: evidenceTypeLabelMap[rule.value],
        value: rule.value
      };
    }
  }

  const fallbackValue =
    (material.materialTopic && materialTopicEvidenceTypeMap[material.materialTopic]) ||
    (material.materialType && materialTypeEvidenceTypeMap[material.materialType]) ||
    "selection_advice";

  return {
    label: evidenceTypeLabelMap[fallbackValue],
    value: fallbackValue
  };
};

export const truncateKnowledgeText = (value?: string, maxLength = 96) => {
  if (!value) {
    return "--";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};
