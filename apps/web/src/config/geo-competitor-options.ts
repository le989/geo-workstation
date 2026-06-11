import type { ModelInclusionRecord } from "@/api/model-inclusion";
import type { EvidenceCitationChain } from "@/config/evidence-citation-options";
import {
  buyingStageLabelMap,
  inferBuyingStage,
  inferPromptBusinessValue,
  inferQuestionType,
  promptBusinessValueLabelMap
} from "@/config/geo-prompt-options";

export type CompetitorBrandOption = {
  id: string;
  label: string;
  keywords: string[];
};

export type CompetitorMention = {
  id: string;
  label: string;
  matchedKeywords: string[];
};

export type OwnBrandSignal = {
  mentioned: boolean;
  matchedKeywords: string[];
};

export type CompetitorOccupancyType =
  | "competitor_recommended_own_missing"
  | "competitor_mentioned_own_missing"
  | "competitor_and_own_present"
  | "own_present_no_competitor"
  | "no_brand_signal"
  | "unknown";

export type CompetitorOccupancyReason =
  | "evidence_gap"
  | "citation_gap"
  | "content_gap"
  | "prompt_bias"
  | "scenario_gap"
  | "spec_gap"
  | "authority_gap"
  | "model_fetch_gap"
  | "manual_check";

export type CompetitorOccupancyReview = {
  id: string;
  promptText: string;
  questionType: string;
  businessValue: string;
  buyingStage: string;
  model: string;
  checkedAt: string;
  competitorBrands: CompetitorMention[];
  ownBrand: OwnBrandSignal;
  ownStatus: "已推荐" | "仅提及" | "缺席" | "待确认";
  occupancyType: CompetitorOccupancyType;
  reasons: CompetitorOccupancyReason[];
  nextActions: Array<{
    label: string;
    to: string;
  }>;
  evidenceGaps: string[];
  sourceNote: string;
  summary: string;
  priority: "高" | "中" | "低";
};

export const competitorBrandOptions: CompetitorBrandOption[] = [
  { id: "keyence", label: "Keyence / 基恩士", keywords: ["keyence", "KEYENCE", "基恩士"] },
  { id: "ifm", label: "ifm / 易福门", keywords: ["ifm", "IFM", "易福门"] },
  { id: "baumer", label: "Baumer / 堡盟", keywords: ["baumer", "BAUMER", "堡盟"] },
  { id: "sick", label: "SICK / 西克", keywords: ["sick", "SICK", "西克"] },
  { id: "omron", label: "Omron / 欧姆龙", keywords: ["omron", "OMRON", "欧姆龙"] },
  { id: "panasonic", label: "Panasonic / 松下", keywords: ["panasonic", "松下", "HG-C", "hg-c"] },
  {
    id: "pepperl-fuchs",
    label: "Pepperl+Fuchs / 倍加福",
    keywords: ["pepperl+fuchs", "Pepperl+Fuchs", "Pepperl Fuchs", "P+F", "倍加福"]
  },
  { id: "turck", label: "Turck / 图尔克", keywords: ["turck", "图尔克"] },
  { id: "leuze", label: "Leuze / 劳易测", keywords: ["leuze", "劳易测"] },
  { id: "balluff", label: "Balluff / 巴鲁夫", keywords: ["balluff", "巴鲁夫"] }
];

export const ownBrandKeywords = ["凯基特", "KJT", "凯基特传感器", "凯路智联", "科耐沃", "KENAIWO", "kenaiwo"];

export const occupancyTypeLabelMap: Record<CompetitorOccupancyType, string> = {
  competitor_and_own_present: "我方与竞品同时出现",
  competitor_mentioned_own_missing: "竞品被提及，我方缺席",
  competitor_recommended_own_missing: "疑似竞品被推荐，我方缺席",
  no_brand_signal: "无明显品牌信号",
  own_present_no_competitor: "我方出现，无明显竞品",
  unknown: "待人工确认"
};

export const occupancyReasonLabelMap: Record<CompetitorOccupancyReason, string> = {
  authority_gap: "权威来源不足",
  citation_gap: "引用来源弱",
  content_gap: "文章覆盖不足",
  evidence_gap: "证据不足",
  manual_check: "需人工确认",
  model_fetch_gap: "模型未抓取 / 待复盘",
  prompt_bias: "问法偏竞品",
  scenario_gap: "场景证据不足",
  spec_gap: "参数 / 型号证据不足"
};

export const occupancyReasonDescriptionMap: Record<CompetitorOccupancyReason, string> = {
  authority_gap: "第三方 / 多平台公开内容或官网结构化证据不足，仅作为后续方向。",
  citation_gap: "未看到明确官网、文章或知识库引用来源，需要补可引用页面。",
  content_gap: "缺少适合 AI 摘取的首段结论、FAQ、参数解释或风险提醒。",
  evidence_gap: "当前问题缺少可引用的产品、场景、参数或案例证据。",
  manual_check: "当前轻量规则无法稳定判断，需要人工结合原始回答确认。",
  model_fetch_gap: "已有内容但模型没有反映，需要复盘模型覆盖记录和发布渠道。",
  prompt_bias: "问题中包含竞品、替代或对比词，容易触发竞品答案。",
  scenario_gap: "缺少粉尘、水汽、料位、防撞、AGV、反光等具体工况证据。",
  spec_gap: "缺少量程、输出方式、安装、检测距离、抗干扰等可对比信息。"
};

const scenarioKeywords = ["粉尘", "水汽", "料位", "防撞", "AGV", "agv", "反光", "强光", "输送线"];
const specKeywords = ["参数", "型号", "量程", "输出", "安装", "检测距离", "精度", "分辨率", "抗干扰"];
const comparisonKeywords = ["对比", "替代", "国产替代", "竞品", "ifm", "keyence", "基恩士", "baumer", "堡盟"];

const normalizeText = (...values: Array<string | undefined | null>) =>
  values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

const uniqueItems = <T>(items: T[]) => Array.from(new Set(items));

const addUniqueItems = <T>(target: T[], items: T[]) => {
  for (const item of items) {
    if (!target.includes(item)) {
      target.push(item);
    }
  }
};

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword.toLowerCase()));

const getRecordAnswerText = (record: ModelInclusionRecord) =>
  normalizeText(record.rawAnswer, record.answerSummary);

const buildRecordKnownCompetitorText = (record: ModelInclusionRecord) =>
  normalizeText(record.competitors?.join(" "));

export const detectCompetitorMentions = (text: string, listedCompetitors: string[] = []) => {
  const normalizedText = normalizeText(text, listedCompetitors.join(" "));
  const mentions = competitorBrandOptions
    .map((brand) => {
      const matchedKeywords = brand.keywords.filter((keyword) =>
        normalizedText.includes(keyword.toLowerCase())
      );

      return matchedKeywords.length
        ? {
            id: brand.id,
            label: brand.label,
            matchedKeywords: uniqueItems(matchedKeywords)
          }
        : null;
    })
    .filter((item): item is CompetitorMention => Boolean(item));

  const customCompetitors = listedCompetitors
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item) =>
        !mentions.some((mention) =>
          mention.matchedKeywords.some((keyword) => keyword.toLowerCase() === item.toLowerCase())
        )
    )
    .map((item) => ({
      id: `custom-${item}`,
      label: item,
      matchedKeywords: [item]
    }));

  return [...mentions, ...customCompetitors];
};

export const detectOwnBrandMentions = (text: string): OwnBrandSignal => {
  const normalizedText = normalizeText(text);
  const matchedKeywords = ownBrandKeywords.filter((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  );

  return {
    matchedKeywords: uniqueItems(matchedKeywords),
    mentioned: matchedKeywords.length > 0
  };
};

const getOwnStatus = (
  record: ModelInclusionRecord,
  ownBrand: OwnBrandSignal
): CompetitorOccupancyReview["ownStatus"] => {
  if (record.brandRecommended) {
    return "已推荐";
  }

  if (record.brandMentioned || ownBrand.mentioned) {
    return "仅提及";
  }

  if (record.hitLevel === "unclear" || record.errorMessage) {
    return "待确认";
  }

  return "缺席";
};

const inferOccupancyType = (
  record: ModelInclusionRecord,
  competitorBrands: CompetitorMention[],
  ownStatus: CompetitorOccupancyReview["ownStatus"]
): CompetitorOccupancyType => {
  const hasCompetitorSignal = competitorBrands.length > 0 || record.competitorMentioned;

  if (record.hitLevel === "unclear" || record.errorMessage) {
    return "unknown";
  }

  if (hasCompetitorSignal && ownStatus === "缺席" && record.hitLevel === "competitor_only") {
    return "competitor_recommended_own_missing";
  }

  if (hasCompetitorSignal && ownStatus === "缺席") {
    return record.competitorMentioned
      ? "competitor_recommended_own_missing"
      : "competitor_mentioned_own_missing";
  }

  if (hasCompetitorSignal && ownStatus !== "缺席") {
    return "competitor_and_own_present";
  }

  if (!hasCompetitorSignal && (ownStatus === "已推荐" || ownStatus === "仅提及")) {
    return "own_present_no_competitor";
  }

  return "no_brand_signal";
};

const inferPriority = (
  businessValue: string,
  occupancyType: CompetitorOccupancyType,
  reasons: CompetitorOccupancyReason[]
): CompetitorOccupancyReview["priority"] => {
  if (
    businessValue === "高意向" &&
    (occupancyType === "competitor_recommended_own_missing" ||
      occupancyType === "competitor_mentioned_own_missing")
  ) {
    return "高";
  }

  if (reasons.includes("manual_check") || occupancyType === "no_brand_signal") {
    return "低";
  }

  return "中";
};

const inferOccupancyReasons = (
  record: ModelInclusionRecord,
  promptText: string,
  businessValue: string,
  buyingStage: string,
  chain?: EvidenceCitationChain
): CompetitorOccupancyReason[] => {
  const reasons: CompetitorOccupancyReason[] = [];
  const normalizedPromptText = normalizeText(promptText);

  // 优先复用引用证据中心已有缺口，避免同一问题在不同页面得出冲突提示。
  if (chain?.gaps.includes("缺证据")) {
    addUniqueItems(reasons, ["evidence_gap"]);
  }
  if (chain?.gaps.includes("缺文章")) {
    addUniqueItems(reasons, ["content_gap"]);
  }
  if (chain?.gaps.includes("缺引用来源")) {
    addUniqueItems(reasons, ["citation_gap"]);
  }
  if (chain?.gaps.includes("需人工确认")) {
    addUniqueItems(reasons, ["manual_check"]);
  }

  if (!record.citedOfficialSite) {
    addUniqueItems(reasons, ["citation_gap"]);
  }
  if (!record.citedContentAsset) {
    addUniqueItems(reasons, ["content_gap"]);
  }
  if (!record.brandRecommended && record.brandMentioned) {
    addUniqueItems(reasons, ["evidence_gap"]);
  }
  if (businessValue === "高意向" && !record.brandRecommended) {
    addUniqueItems(reasons, ["evidence_gap", "content_gap"]);
  }
  if (buyingStage === "对比阶段" || hasAnyKeyword(normalizedPromptText, comparisonKeywords)) {
    addUniqueItems(reasons, ["prompt_bias", "spec_gap"]);
  }
  if (hasAnyKeyword(normalizedPromptText, scenarioKeywords)) {
    addUniqueItems(reasons, ["scenario_gap"]);
  }
  if (hasAnyKeyword(normalizedPromptText, specKeywords)) {
    addUniqueItems(reasons, ["spec_gap"]);
  }
  if (record.hitLevel === "unclear" || record.errorMessage) {
    addUniqueItems(reasons, ["manual_check"]);
  }
  if (!record.brandMentioned && !record.brandRecommended && !record.errorMessage) {
    addUniqueItems(reasons, ["model_fetch_gap"]);
  }

  return reasons.length > 0 ? reasons : ["manual_check"];
};

const buildNextActions = (reasons: CompetitorOccupancyReason[]) => {
  const actions: Array<{ label: string; to: string }> = [];

  if (reasons.includes("prompt_bias")) {
    actions.push({ label: "回提示词库补我方替代 / 对比问法", to: "/geo-prompts" });
  }
  if (
    reasons.includes("evidence_gap") ||
    reasons.includes("scenario_gap") ||
    reasons.includes("spec_gap")
  ) {
    actions.push({ label: "去知识库补产品、场景和参数证据", to: "/knowledge-bases" });
  }
  if (reasons.includes("content_gap") || reasons.includes("citation_gap")) {
    actions.push({ label: "去发布文章补引用友好内容", to: "/geo-content" });
  }
  if (reasons.includes("model_fetch_gap") || reasons.includes("manual_check")) {
    actions.push({ label: "去模型覆盖记录复盘原始回答", to: "/model-inclusion-records" });
  }

  actions.push({ label: "查看引用证据链", to: "/evidence-citations" });

  return actions.slice(0, 4);
};

export const buildCompetitorOccupancyReviews = (
  records: ModelInclusionRecord[],
  evidenceChains: EvidenceCitationChain[] = []
): CompetitorOccupancyReview[] =>
  records.map((record) => {
    const answerText = getRecordAnswerText(record);
    const competitorBrands = detectCompetitorMentions(answerText, record.competitors ?? []);
    const competitorBrandFallback =
      competitorBrands.length === 0 && record.competitorMentioned
        ? [{ id: "unknown", label: "竞品待确认", matchedKeywords: ["待确认"] }]
        : competitorBrands;
    const ownBrand = detectOwnBrandMentions(answerText);
    const ownStatus = getOwnStatus(record, ownBrand);
    const promptText = record.geoPrompt?.promptText ?? record.answerSummary ?? "模型覆盖记录待补问法";
    const questionType = inferQuestionType(promptText, record.geoPrompt?.userIntent);
    const businessValue = inferPromptBusinessValue(
      promptText,
      questionType.value,
      record.geoPrompt?.userIntent
    );
    const buyingStage = inferBuyingStage(promptText, questionType.value, record.geoPrompt?.userIntent);
    const chain = evidenceChains.find((item) => item.id === record.geoPromptId);
    const businessValueLabel = promptBusinessValueLabelMap[businessValue.value];
    const buyingStageLabel = buyingStageLabelMap[buyingStage.value];
    const occupancyType = inferOccupancyType(record, competitorBrandFallback, ownStatus);
    const reasons = inferOccupancyReasons(
      record,
      promptText,
      businessValueLabel,
      buyingStageLabel,
      chain
    );
    const hasCompetitorSource =
      Boolean(buildRecordKnownCompetitorText(record)) || competitorBrandFallback.length > 0;

    return {
      businessValue: businessValueLabel,
      buyingStage: buyingStageLabel,
      checkedAt: record.checkedAt,
      competitorBrands: competitorBrandFallback,
      evidenceGaps: chain?.gaps ?? ["需人工确认"],
      id: record.id,
      model: record.model || record.platform || "模型记录",
      nextActions: buildNextActions(reasons),
      occupancyType,
      ownBrand,
      ownStatus,
      priority: inferPriority(businessValueLabel, occupancyType, reasons),
      promptText,
      questionType: questionType.label,
      reasons,
      sourceNote: hasCompetitorSource
        ? "基于覆盖记录文本、竞品字段和前端词库识别，需人工确认。"
        : "当前记录缺少明确竞品文本，需结合原始回答人工确认。",
      summary: record.answerSummary || record.rawAnswer || "暂无回答摘要，建议查看模型覆盖记录原文。"
    };
  });

export const buildCompetitorDistribution = (reviews: CompetitorOccupancyReview[]) => {
  const distribution = new Map<
    string,
    { label: string; count: number; highValueCount: number; ownMissingCount: number }
  >();

  for (const review of reviews) {
    for (const brand of review.competitorBrands) {
      const current = distribution.get(brand.id) ?? {
        count: 0,
        highValueCount: 0,
        label: brand.label,
        ownMissingCount: 0
      };

      current.count += 1;
      if (review.businessValue === "高意向") {
        current.highValueCount += 1;
      }
      if (review.ownStatus === "缺席") {
        current.ownMissingCount += 1;
      }
      distribution.set(brand.id, current);
    }
  }

  return Array.from(distribution.values()).sort((a, b) => b.count - a.count);
};

export const buildOccupancyReasonDistribution = (reviews: CompetitorOccupancyReview[]) =>
  (Object.keys(occupancyReasonLabelMap) as CompetitorOccupancyReason[])
    .map((reason) => ({
      count: reviews.filter((review) => review.reasons.includes(reason)).length,
      label: occupancyReasonLabelMap[reason],
      value: reason
    }))
    .filter((item) => item.count > 0);
