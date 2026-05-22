import type { KnowledgeMaterialType } from "@/api/knowledge";
import { materialTopicOptions, materialTypeOptions } from "@/config/knowledge-options";

export type KnowledgeMaterialSuggestionSource = "filename" | "title_content";

export type KnowledgeMaterialSuggestionInput = {
  fileName?: string;
  title?: string;
  content?: string;
};

export type KnowledgeMaterialSuggestion = {
  materialType?: KnowledgeMaterialType;
  materialTopic?: string;
  reason: string;
  source: KnowledgeMaterialSuggestionSource;
};

type KnowledgeMaterialSuggestionRule = {
  keywords: string[];
  materialType: KnowledgeMaterialType;
  materialTopic: string;
  reason: string;
};

const supportedMaterialTypes = new Set(
  materialTypeOptions.map((option) => option.value as KnowledgeMaterialType)
);
const supportedMaterialTopics = new Set(materialTopicOptions.map((option) => option.value));

const suggestionRules: KnowledgeMaterialSuggestionRule[] = [
  {
    keywords: ["规格书", "参数", "技术参数", "datasheet"],
    materialType: "product_material",
    materialTopic: "产品参数",
    reason: "识别到规格书或技术参数资料"
  },
  {
    keywords: ["说明书", "使用说明", "安装", "接线"],
    materialType: "aftersales_material",
    materialTopic: "安装接线",
    reason: "识别到说明书、安装或接线资料"
  },
  {
    keywords: ["故障", "报错", "不亮", "无信号", "怎么调", "常见问题", "FAQ"],
    materialType: "aftersales_material",
    materialTopic: "故障排查",
    reason: "识别到故障排查或常见问题资料"
  },
  {
    keywords: ["选型", "怎么选", "对比", "型号区别"],
    materialType: "product_material",
    materialTopic: "选型资料",
    reason: "识别到选型或型号对比资料"
  },
  {
    keywords: ["案例", "应用", "现场", "方案"],
    materialType: "customer_case_material",
    materialTopic: "应用案例",
    reason: "识别到应用案例或现场方案资料"
  },
  {
    keywords: ["资质", "证书"],
    materialType: "company_trust_material",
    materialTopic: "资质证书",
    reason: "识别到公司资质或证书资料"
  },
  {
    keywords: ["公司", "品牌", "介绍"],
    materialType: "company_trust_material",
    materialTopic: "品牌介绍",
    reason: "识别到公司或品牌介绍资料"
  }
];

const normalizeText = (value?: string) => value?.trim().toLowerCase() ?? "";

const buildTitleContentText = (input: KnowledgeMaterialSuggestionInput) =>
  [input.title, input.content?.slice(0, 1000)].filter(Boolean).join("\n");

const matchRule = (text: string) =>
  suggestionRules.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );

const toSupportedSuggestion = (
  rule: KnowledgeMaterialSuggestionRule,
  source: KnowledgeMaterialSuggestionSource
): KnowledgeMaterialSuggestion => ({
  materialType: supportedMaterialTypes.has(rule.materialType) ? rule.materialType : undefined,
  materialTopic: supportedMaterialTopics.has(rule.materialTopic) ? rule.materialTopic : undefined,
  reason: rule.reason,
  source
});

export const suggestKnowledgeMaterial = (
  input: KnowledgeMaterialSuggestionInput
): KnowledgeMaterialSuggestion | null => {
  const fileNameText = normalizeText(input.fileName);
  const fileNameRule = fileNameText ? matchRule(fileNameText) : undefined;

  if (fileNameRule) {
    return toSupportedSuggestion(fileNameRule, "filename");
  }

  const titleContentText = normalizeText(buildTitleContentText(input));
  const titleContentRule = titleContentText ? matchRule(titleContentText) : undefined;

  return titleContentRule ? toSupportedSuggestion(titleContentRule, "title_content") : null;
};
