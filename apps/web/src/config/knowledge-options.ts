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

export const reviewStatusOptions: Array<{ label: string; value: KnowledgeReviewStatus }> = [
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "已停用", value: "disabled" }
];

export const trustLevelOptions: Array<{ label: string; value: KnowledgeTrustLevel }> = [
  { label: "高", value: "high" },
  { label: "中", value: "medium" },
  { label: "低", value: "low" }
];

export const applicableModuleOptions: Array<{ label: string; value: KnowledgeApplicableModule }> = [
  { label: "内部检索", value: "internal-search" },
  { label: "GEO 内容生成", value: "geo-content" },
  { label: "售后问答", value: "aftersales-qa" },
  { label: "GEO 分析", value: "geo-analysis" }
];

export const officialCitationStatusOptions = [
  { label: "可正式引用", value: "citable" },
  { label: "不正式引用", value: "not_citable" }
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

export const truncateKnowledgeText = (value?: string, maxLength = 96) => {
  if (!value) {
    return "--";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};
