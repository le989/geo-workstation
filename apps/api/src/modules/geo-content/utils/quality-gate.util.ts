export type PublishStatus = "publish_ready" | "needs_review" | "not_recommended";
export type QualityGateLevel = "low" | "medium" | "high";
export type QualityGateScopeType = "all" | "product_line" | "selected_files";

export type QualityGateRiskItem = {
  type: string;
  severity: "low" | "medium" | "high";
  text: string;
  reason: string;
  suggestion: string;
};

export type QualityGateTextHit = {
  word: string;
  field: "title" | "body";
  snippet: string;
};

export type QualityGateScopeSummary = {
  knowledgeBaseId?: string | null;
  scopeType: QualityGateScopeType;
  selectedFileCount: number;
  productLineId?: string | null;
};

export type QualityGateResult = {
  version: "article_quality_gate_v1";
  checkedAt: string;
  provider: string;
  model?: string;
  score: number;
  level: QualityGateLevel;
  publishStatus: PublishStatus;
  riskItems: QualityGateRiskItem[];
  positiveItems: string[];
  manualReviewItems: string[];
  forbiddenWordHits: QualityGateTextHit[];
  aiStyleIssues: QualityGateTextHit[];
  factBoundaryIssues: QualityGateTextHit[];
  scopeSummary: QualityGateScopeSummary;
  recommendation: string;
};

type QualityCheckResultLike = {
  score: number;
  level: "good" | "needs_review" | "risky";
  riskItems: QualityGateRiskItem[];
  positiveItems: string[];
  publishReadiness: {
    canPublish: boolean;
    needsHumanReview: boolean;
    suggestedAction: string;
  };
};

type BuildQualityGateResultInput = {
  qualityResult: QualityCheckResultLike;
  title: string;
  body: string;
  provider: string;
  model?: string;
  checkedAt?: Date;
  scopeSummary: QualityGateScopeSummary;
};

const FORBIDDEN_WORDS = [
  "最好",
  "最佳",
  "最优",
  "保证",
  "确保",
  "绝对",
  "百分百",
  "100%",
  "完全替代",
  "唯一",
  "第一",
  "行业领先",
  "最低价",
  "全网最低",
  "包解决",
  "永久",
  "必选",
  "首选"
];

const AI_STYLE_PATTERNS = [
  "随着行业发展",
  "在当今时代",
  "在现代工业中",
  "综上所述",
  "总而言之",
  "不可或缺",
  "赋能",
  "大大提升",
  "显著提升",
  "助力企业降本增效"
];

const FACT_BOUNDARY_TERMS = [
  "价格",
  "报价",
  "客户案例",
  "认证证书",
  "市场排名",
  "行业第一",
  "完全替代"
];

export function buildQualityGateResult(input: BuildQualityGateResultInput): QualityGateResult {
  const forbiddenWordHits = findTextHits(input.title, input.body, FORBIDDEN_WORDS);
  const aiStyleIssues = findTextHits(input.title, input.body, AI_STYLE_PATTERNS);
  const factBoundaryIssues = findTextHits(input.title, input.body, FACT_BOUNDARY_TERMS);
  const manualReviewItems = buildManualReviewItems({
    qualityResult: input.qualityResult,
    forbiddenWordHits,
    aiStyleIssues,
    factBoundaryIssues,
    scopeSummary: input.scopeSummary
  });
  const publishStatus = resolvePublishStatus({
    qualityResult: input.qualityResult,
    forbiddenWordHits,
    aiStyleIssues,
    factBoundaryIssues
  });
  const level = resolveGateLevel(input.qualityResult, publishStatus);

  return {
    version: "article_quality_gate_v1",
    checkedAt: (input.checkedAt ?? new Date()).toISOString(),
    provider: input.provider,
    model: input.model,
    score: input.qualityResult.score,
    level,
    publishStatus,
    riskItems: input.qualityResult.riskItems,
    positiveItems: input.qualityResult.positiveItems,
    manualReviewItems,
    forbiddenWordHits,
    aiStyleIssues,
    factBoundaryIssues,
    scopeSummary: input.scopeSummary,
    recommendation: buildRecommendation(publishStatus, manualReviewItems)
  };
}

function resolvePublishStatus(input: {
  qualityResult: QualityCheckResultLike;
  forbiddenWordHits: QualityGateTextHit[];
  aiStyleIssues: QualityGateTextHit[];
  factBoundaryIssues: QualityGateTextHit[];
}): PublishStatus {
  const hasHighRisk = input.qualityResult.riskItems.some((item) => item.severity === "high");
  const hasTitleForbiddenWord = input.forbiddenWordHits.some((hit) => hit.field === "title");

  if (
    input.qualityResult.level === "risky" ||
    input.qualityResult.score < 60 ||
    hasHighRisk ||
    hasTitleForbiddenWord
  ) {
    return "not_recommended";
  }

  if (
    input.qualityResult.score < 85 ||
    input.qualityResult.publishReadiness.needsHumanReview ||
    input.qualityResult.riskItems.length > 0 ||
    input.forbiddenWordHits.length > 0 ||
    input.aiStyleIssues.length > 0 ||
    input.factBoundaryIssues.length > 0
  ) {
    return "needs_review";
  }

  return "publish_ready";
}

function resolveGateLevel(
  qualityResult: QualityCheckResultLike,
  publishStatus: PublishStatus
): QualityGateLevel {
  if (publishStatus === "not_recommended" || qualityResult.level === "risky") {
    return "high";
  }

  if (publishStatus === "needs_review" || qualityResult.level === "needs_review") {
    return "medium";
  }

  return "low";
}

function buildManualReviewItems(input: {
  qualityResult: QualityCheckResultLike;
  forbiddenWordHits: QualityGateTextHit[];
  aiStyleIssues: QualityGateTextHit[];
  factBoundaryIssues: QualityGateTextHit[];
  scopeSummary: QualityGateScopeSummary;
}): string[] {
  const items: string[] = [];

  if (input.forbiddenWordHits.length > 0) {
    items.push("发现风险词，发布前需改为更克制表达。");
  }

  if (input.aiStyleIssues.length > 0) {
    items.push("发现明显 AI 化表达，建议改为现场问题导向表述。");
  }

  if (input.factBoundaryIssues.length > 0) {
    items.push("发现价格、案例、认证、排名或替代关系等事实边界表达，需人工核对资料依据。");
  }

  if (input.qualityResult.riskItems.length > 0) {
    items.push("质量检查存在风险项，需按建议逐条处理。");
  }

  if (input.scopeSummary.scopeType === "selected_files") {
    items.push("当前任务使用指定资料范围，需确认正文事实没有超出所选资料。");
  }

  return [...new Set(items)];
}

function buildRecommendation(status: PublishStatus, manualReviewItems: string[]): string {
  if (status === "publish_ready") {
    return "质量闸门未发现明显阻断项，可进入发布前人工校对。";
  }

  if (status === "not_recommended") {
    return "存在明显风险或质量分过低，不建议直接发布。";
  }

  if (manualReviewItems.length > 0) {
    return `建议人工确认：${manualReviewItems[0]}`;
  }

  return "建议人工复核后再发布。";
}

function findTextHits(title: string, body: string, words: string[]): QualityGateTextHit[] {
  const hits: QualityGateTextHit[] = [];

  for (const field of ["title", "body"] as const) {
    const source = field === "title" ? title : body;

    for (const word of words) {
      for (const match of source.matchAll(new RegExp(escapeRegex(word), "g"))) {
        const index = match.index ?? 0;
        hits.push({
          word,
          field,
          snippet: buildSnippet(source, index, word.length)
        });
      }
    }
  }

  return hits;
}

function buildSnippet(source: string, index: number, length: number): string {
  return source.slice(Math.max(index - 18, 0), index + length + 18).replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
