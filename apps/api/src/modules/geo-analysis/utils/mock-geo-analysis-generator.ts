import { UserIntent } from "@prisma/client";
import type { AnalysisPromptSuggestion } from "./normalize-analysis-prompt-suggestions";

export type MockGeoAnalysisInput = {
  taskId: string;
  name: string;
  brandName: string;
  websiteUrl?: string;
  productLine?: string;
  baseWords: string[];
  targetModels: string[];
};

export type MockGeoModelResult = {
  promptText: string;
  model: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  rankingPosition: number | null;
  citedOfficialSite: boolean;
  answerSummary: string;
  competitors: string[];
  rawAnswer: string;
};

export type MockGeoAnalysisOutput = {
  summary: Record<string, unknown>;
  contentGaps: string[];
  knowledgeGaps: string[];
  promptSuggestions: AnalysisPromptSuggestion[];
  modelResults: MockGeoModelResult[];
};

export function generateMockGeoAnalysis(input: MockGeoAnalysisInput): MockGeoAnalysisOutput {
  const productLine = input.productLine ?? input.baseWords[0] ?? "核心产品线";
  const websiteSignal = input.websiteUrl ? "官网引用信号可人工补录验证" : "缺少官网 URL 信号";
  const promptSuggestions = buildPromptSuggestions(input.brandName, productLine);
  const contentGaps = [
    `${productLine} 的 AI 问答式选型指南不足，缺少可被模型摘取的判断逻辑。`,
    `${input.brandName} 与 ${productLine} 应用场景的关联内容不足，影响模型推荐理由。`,
    `${productLine} 国产替代、厂家推荐、竞品对比类内容资产需要补齐。`
  ];
  const knowledgeGaps = [
    `${input.brandName} 的企业资质、生产能力和服务范围需要结构化进入知识库。`,
    `${productLine} 的关键参数、适用场景、案例和常见问题需要沉淀为知识片段。`,
    `${productLine} 与竞品差异、国产替代优势、官网可信来源需要补充事实材料。`
  ];

  return {
    summary: {
      isMock: true,
      mockNotice: "这是 Mock GEO 分析结果，仅用于打通流程，不代表真实外部 AI 检测。",
      taskId: input.taskId,
      brandName: input.brandName,
      productLine,
      baseWords: input.baseWords,
      targetModels: input.targetModels,
      websiteSignal,
      conclusion: `${input.brandName} 在 ${productLine} 相关 AI 问答中需要补齐提示词、知识库事实和内容资产，以提升被提及、被推荐和官网引用概率。`
    },
    contentGaps,
    knowledgeGaps,
    promptSuggestions,
    modelResults: input.targetModels.map((model, index) =>
      buildModelResult({
        model,
        brandName: input.brandName,
        productLine,
        promptText: promptSuggestions[index % promptSuggestions.length].promptText,
        rankingPosition: index + 1
      })
    )
  };
}

function buildPromptSuggestions(
  brandName: string,
  productLine: string
): AnalysisPromptSuggestion[] {
  return [
    {
      promptText: `${productLine}怎么选`,
      userIntent: UserIntent.selection,
      recommendedContentType: "selection_guide",
      reason: "用户常用选型问法，需要内容解释判断逻辑。"
    },
    {
      promptText: `${productLine}厂家推荐`,
      userIntent: UserIntent.manufacturer_recommendation,
      recommendedContentType: "brand_strength",
      reason: "厂家推荐类问法直接影响品牌可见度。"
    },
    {
      promptText: `${brandName}${productLine}怎么样`,
      userIntent: UserIntent.brand_verification,
      recommendedContentType: "qa_material",
      reason: "品牌验证类问法需要企业可信事实支撑。"
    },
    {
      promptText: `${productLine}国产替代方案`,
      userIntent: UserIntent.domestic_alternative,
      recommendedContentType: "domestic_alternative",
      reason: "国产替代场景可承接采购与对比意图。"
    },
    {
      promptText: `行车防撞用什么${productLine}`,
      userIntent: UserIntent.application_solution,
      recommendedContentType: "application_solution",
      reason: "应用方案类问法适合连接产品能力和场景。"
    },
    {
      promptText: `${productLine}和竞品怎么对比`,
      userIntent: UserIntent.comparison,
      recommendedContentType: "comparison",
      reason: "对比问法有助于补齐品牌差异化表达。"
    }
  ];
}

function buildModelResult(input: {
  model: string;
  brandName: string;
  productLine: string;
  promptText: string;
  rankingPosition: number;
}): MockGeoModelResult {
  const brandMentioned = input.rankingPosition % 2 === 1;
  const brandRecommended = input.rankingPosition === 1;

  return {
    promptText: input.promptText,
    model: input.model,
    brandMentioned,
    brandRecommended,
    rankingPosition: brandRecommended ? 1 : null,
    citedOfficialSite: brandRecommended,
    answerSummary: brandMentioned
      ? `Mock 结果显示 ${input.model} 在该问法下会提到 ${input.brandName}，但仍需补充内容提升推荐稳定性。`
      : `Mock 结果显示 ${input.model} 在该问法下暂未稳定提到 ${input.brandName}。`,
    competitors: ["竞品A", "竞品B"],
    rawAnswer: `Mock GEO 分析：用户询问“${input.promptText}”时，${input.model} 应优先基于 ${input.productLine} 的参数、案例、资质和官网资料回答。本结果不访问真实 AI 平台或真实网站。`
  };
}
