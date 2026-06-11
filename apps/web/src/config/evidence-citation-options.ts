import type { ContentItem } from "@/api/content";
import type { GeoPrompt } from "@/api/geo-prompts";
import type { KnowledgeBase, KnowledgeFile } from "@/api/knowledge";
import type { ModelInclusionRecord } from "@/api/model-inclusion";
import {
  buyingStageLabelMap,
  inferBuyingStage,
  inferPromptBusinessValue,
  inferQuestionType,
  promptBusinessValueLabelMap
} from "@/config/geo-prompt-options";
import { evidenceTypeLabelMap, inferEvidenceType } from "@/config/knowledge-options";
import { inferCoverageReview } from "@/config/model-inclusion-options";
import { isKnowledgeFileOfficiallyCitable } from "@/utils/knowledge-citation";

export type EvidenceSupportStatus = "citable" | "needs_label" | "needs_evidence" | "manual_review";
export type ArticleCitationStatus = "friendly" | "needs_review" | "manual_review" | "missing";
export type ModelCoverageCitationStatus = "recommended" | "mentioned" | "not_recommended" | "missing";
export type EvidenceCitationGap =
  | "缺证据"
  | "缺文章"
  | "缺引用来源"
  | "未推荐"
  | "竞品占位"
  | "需人工确认";

export type KnowledgeFileWithBase = KnowledgeFile & {
  knowledgeBaseName?: string;
  knowledgeBaseProductLine?: string;
};

export type CitationKnowledgeMatch = {
  id: string;
  title: string;
  evidenceType: string;
  citationStatus: string;
  score: number;
};

export type CitationArticleMatch = {
  id: string;
  title: string;
  status: string;
  hasEvidence: boolean;
  hasFaqs: boolean;
  score: number;
};

export type CitationModelMatch = {
  id: string;
  model: string;
  checkedAt: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  citedOfficialSite: boolean;
  citedContentAsset: boolean;
  competitorMentioned: boolean;
  hitLevel?: string;
};

export type EvidenceCitationChain = {
  id: string;
  promptText: string;
  questionType: string;
  businessValue: string;
  buyingStage: string;
  matchedKeywords: string[];
  evidenceStatus: EvidenceSupportStatus;
  articleStatus: ArticleCitationStatus;
  coverageStatus: ModelCoverageCitationStatus;
  knowledgeMatches: CitationKnowledgeMatch[];
  articleMatches: CitationArticleMatch[];
  modelMatches: CitationModelMatch[];
  possibleSources: string[];
  gaps: EvidenceCitationGap[];
  nextActions: Array<{
    label: string;
    to: string;
  }>;
  relationNote: string;
};

export const evidenceSupportStatusLabelMap: Record<EvidenceSupportStatus, string> = {
  citable: "可引用",
  manual_review: "待确认",
  needs_evidence: "需补证据",
  needs_label: "需标注"
};

export const articleCitationStatusLabelMap: Record<ArticleCitationStatus, string> = {
  friendly: "引用友好",
  manual_review: "需人工确认",
  missing: "暂无文章",
  needs_review: "建议补充"
};

export const modelCoverageCitationStatusLabelMap: Record<ModelCoverageCitationStatus, string> = {
  mentioned: "仅提及品牌",
  missing: "暂无记录",
  not_recommended: "未推荐",
  recommended: "已推荐品牌"
};

export const evidenceCitationGapOptions: EvidenceCitationGap[] = [
  "缺证据",
  "缺文章",
  "缺引用来源",
  "未推荐",
  "竞品占位",
  "需人工确认"
];

const citationKeywordPool = [
  "激光测距",
  "雷达测距",
  "测距",
  "传感器",
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
  "长距离",
  "检测距离",
  "输出方式",
  "量程",
  "精度",
  "分辨率",
  "安装",
  "接线",
  "调试",
  "替代",
  "替换",
  "ifm",
  "baumer",
  "keyence",
  "基恩士",
  "西克",
  "欧姆龙",
  "AGV",
  "反光",
  "边坡",
  "桥梁",
  "矿山",
  "方案",
  "案例",
  "故障",
  "不稳定",
  "误报"
];

const normalizeSearchText = (...values: Array<string | undefined | null>) =>
  values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

const uniqueItems = <T>(items: T[]) => Array.from(new Set(items));

const scoreTextByKeywords = (text: string, keywords: string[]) =>
  keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;

export const extractCitationKeywords = (prompt: GeoPrompt) => {
  const promptText = normalizeSearchText(
    prompt.promptText,
    prompt.productLine,
    prompt.scenario,
    prompt.baseWord
  );
  // 只展示明确业务词，避免把 smoke 阶段编号或 UUID 当成“匹配关键词”误导运营。
  return citationKeywordPool.filter((keyword) =>
    promptText.includes(keyword.toLowerCase())
  ).slice(0, 10);
};

const buildKnowledgeSearchText = (file: KnowledgeFileWithBase) =>
  normalizeSearchText(
    file.title,
    file.fileName,
    file.materialTopic,
    file.materialType,
    file.sourceDescription,
    file.knowledgeBaseName,
    file.knowledgeBaseProductLine,
    file.applicableModules.join(" ")
  );

const buildArticleSearchText = (item: ContentItem) =>
  normalizeSearchText(
    item.title,
    item.body,
    item.publishPackage?.summary,
    item.publishPackage?.keywords.primaryKeywords.join(" "),
    item.publishPackage?.keywords.longTailKeywords.join(" ")
  );

const buildRecordSearchText = (record: ModelInclusionRecord) =>
  normalizeSearchText(
    record.geoPrompt?.promptText,
    record.answerSummary,
    record.rawAnswer,
    record.model,
    record.platform
  );

const getTopKnowledgeMatches = (keywords: string[], files: KnowledgeFileWithBase[]) =>
  files
    .map((file) => {
      const score = scoreTextByKeywords(buildKnowledgeSearchText(file), keywords);
      const evidenceType = inferEvidenceType(file);

      return {
        citationStatus: isKnowledgeFileOfficiallyCitable(file) ? "可引用" : "待确认",
        evidenceType: evidenceType.label,
        id: file.id,
        score,
        title: file.title || file.fileName || "知识库资料"
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

const getTopArticleMatches = (prompt: GeoPrompt, keywords: string[], items: ContentItem[]) =>
  items
    .map((item) => {
      const directScore = item.geoPromptId === prompt.id ? 8 : 0;
      const keywordScore = scoreTextByKeywords(buildArticleSearchText(item), keywords);

      return {
        hasEvidence: Boolean(item.publishPackage?.evidence.length),
        hasFaqs: Boolean(item.publishPackage?.faqs.length),
        id: item.id,
        score: directScore + keywordScore,
        status: item.publishStatus ?? item.status ?? "unknown",
        title: item.title || "发布文章"
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

const getTopModelMatches = (prompt: GeoPrompt, keywords: string[], records: ModelInclusionRecord[]) =>
  records
    .map((record) => {
      const directScore = record.geoPromptId === prompt.id ? 10 : 0;
      const keywordScore = scoreTextByKeywords(buildRecordSearchText(record), keywords);

      return {
        record,
        score: directScore + keywordScore
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.record.checkedAt).getTime() - new Date(a.record.checkedAt).getTime()
    )
    .slice(0, 3)
    .map(({ record }) => ({
      brandMentioned: record.brandMentioned,
      brandRecommended: record.brandRecommended,
      checkedAt: record.checkedAt,
      citedContentAsset: record.citedContentAsset,
      citedOfficialSite: record.citedOfficialSite,
      competitorMentioned: record.competitorMentioned,
      hitLevel: record.hitLevel,
      id: record.id,
      model: record.model || record.platform || "模型记录"
    }));

const inferEvidenceStatus = (matches: CitationKnowledgeMatch[]): EvidenceSupportStatus => {
  if (matches.length === 0) {
    return "needs_evidence";
  }

  if (matches.some((match) => match.citationStatus === "可引用")) {
    return "citable";
  }

  return "needs_label";
};

const inferArticleStatus = (matches: CitationArticleMatch[]): ArticleCitationStatus => {
  if (matches.length === 0) {
    return "missing";
  }

  if (matches.some((match) => match.status === "publish_ready" && match.hasEvidence)) {
    return "friendly";
  }

  if (matches.some((match) => match.status === "publish_ready" || match.hasEvidence || match.hasFaqs)) {
    return "needs_review";
  }

  return "manual_review";
};

const inferCoverageStatus = (matches: CitationModelMatch[]): ModelCoverageCitationStatus => {
  if (matches.length === 0) {
    return "missing";
  }

  if (matches.some((match) => match.brandRecommended)) {
    return "recommended";
  }

  if (matches.some((match) => match.brandMentioned)) {
    return "mentioned";
  }

  return "not_recommended";
};

const buildPossibleSources = (
  evidenceStatus: EvidenceSupportStatus,
  articleMatches: CitationArticleMatch[],
  modelMatches: CitationModelMatch[]
) => {
  const sources: string[] = [];

  if (modelMatches.some((match) => match.citedOfficialSite)) {
    sources.push("官网 / 产品页");
  }
  if (evidenceStatus === "citable") {
    sources.push("知识库");
  }
  if (articleMatches.length > 0) {
    sources.push("发布文章");
  }
  if (modelMatches.some((match) => match.citedContentAsset)) {
    sources.push("发布内容资产");
  }

  return sources.length > 0 ? uniqueItems(sources) : ["暂无明确来源"];
};

const buildGaps = (
  evidenceStatus: EvidenceSupportStatus,
  articleStatus: ArticleCitationStatus,
  coverageStatus: ModelCoverageCitationStatus,
  modelMatches: CitationModelMatch[],
  possibleSources: string[]
) => {
  const gaps: EvidenceCitationGap[] = [];

  if (evidenceStatus === "needs_evidence" || evidenceStatus === "needs_label") {
    gaps.push("缺证据");
  }
  if (articleStatus === "missing") {
    gaps.push("缺文章");
  }
  if (possibleSources.includes("暂无明确来源")) {
    gaps.push("缺引用来源");
  }
  if (coverageStatus === "not_recommended" || coverageStatus === "mentioned") {
    gaps.push("未推荐");
  }
  if (modelMatches.some((match) => match.competitorMentioned)) {
    gaps.push("竞品占位");
  }
  if (
    evidenceStatus === "manual_review" ||
    articleStatus === "manual_review" ||
    coverageStatus === "missing"
  ) {
    gaps.push("需人工确认");
  }

  return uniqueItems(gaps);
};

const buildNextActions = (gaps: EvidenceCitationGap[]) => {
  const actions: Array<{ label: string; to: string }> = [];

  if (gaps.includes("缺证据")) {
    actions.push({ label: "去知识库补可引用证据", to: "/knowledge-bases" });
  }
  if (gaps.includes("缺文章") || gaps.includes("缺引用来源")) {
    actions.push({ label: "去发布文章补引用友好内容", to: "/geo-content" });
  }
  if (gaps.includes("未推荐") || gaps.includes("竞品占位") || gaps.includes("需人工确认")) {
    actions.push({ label: "去模型覆盖记录复盘", to: "/model-inclusion-records" });
  }

  actions.push({ label: "回提示词库核对问法", to: "/geo-prompts" });

  return actions.slice(0, 4);
};

export const mergeKnowledgeFilesWithBase = (
  bases: KnowledgeBase[],
  filesByBaseId: Record<string, KnowledgeFile[]>
): KnowledgeFileWithBase[] =>
  bases.flatMap((base) =>
    (filesByBaseId[base.id] ?? []).map((file) => ({
      ...file,
      knowledgeBaseName: base.name,
      knowledgeBaseProductLine: base.productLine
    }))
  );

export const buildEvidenceCitationChains = ({
  contentItems,
  knowledgeFiles,
  modelRecords,
  prompts
}: {
  contentItems: ContentItem[];
  knowledgeFiles: KnowledgeFileWithBase[];
  modelRecords: ModelInclusionRecord[];
  prompts: GeoPrompt[];
}): EvidenceCitationChain[] =>
  prompts.map((prompt) => {
    const questionType = inferQuestionType(prompt.promptText, prompt.userIntent);
    const businessValue = inferPromptBusinessValue(
      prompt.promptText,
      questionType.value,
      prompt.userIntent
    );
    const buyingStage = inferBuyingStage(prompt.promptText, questionType.value, prompt.userIntent);
    const matchedKeywords = extractCitationKeywords(prompt);
    const knowledgeMatches = getTopKnowledgeMatches(matchedKeywords, knowledgeFiles);
    const articleMatches = getTopArticleMatches(prompt, matchedKeywords, contentItems);
    const modelMatches = getTopModelMatches(prompt, matchedKeywords, modelRecords);
    const evidenceStatus = inferEvidenceStatus(knowledgeMatches);
    const articleStatus = inferArticleStatus(articleMatches);
    const coverageStatus = inferCoverageStatus(modelMatches);
    const possibleSources = buildPossibleSources(evidenceStatus, articleMatches, modelMatches);
    const gaps = buildGaps(
      evidenceStatus,
      articleStatus,
      coverageStatus,
      modelMatches,
      possibleSources
    );
    const coverageReview = modelRecords.find((record) => record.geoPromptId === prompt.id)
      ? inferCoverageReview(modelRecords.find((record) => record.geoPromptId === prompt.id)!)
      : null;

    return {
      articleMatches,
      articleStatus,
      businessValue: promptBusinessValueLabelMap[businessValue.value],
      buyingStage: buyingStageLabelMap[buyingStage.value],
      coverageStatus,
      evidenceStatus,
      gaps,
      id: prompt.id,
      knowledgeMatches,
      matchedKeywords,
      modelMatches,
      nextActions: buildNextActions(gaps),
      possibleSources,
      promptText: prompt.promptText,
      questionType: questionType.label,
      relationNote: coverageReview?.reasons[0] ?? "前端轻量匹配，需结合原始资料人工确认"
    };
  });

export const buildEvidenceGapDistribution = (chains: EvidenceCitationChain[]) =>
  evidenceCitationGapOptions.map((gap) => ({
    count: chains.filter((chain) => chain.gaps.includes(gap)).length,
    label: gap
  }));

export const getEvidenceTypeLabelForKnowledgeMatch = (value?: string) =>
  value && Object.values(evidenceTypeLabelMap).includes(value) ? value : "证据类型待确认";
