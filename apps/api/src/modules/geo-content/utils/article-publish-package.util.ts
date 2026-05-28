import type { PublishStatus, QualityGateResult } from "./quality-gate.util";

export type ArticlePublishPackagePlatformTitles = {
  baijiahao: string;
  toutiao: string;
  zhihu: string;
  xiaohongshu: string;
  douyin: string;
  generic: string;
};

export type ArticlePublishPackageEvidence = {
  knowledgeBaseName?: string;
  fileName?: string;
  productLineName?: string;
  scopeType?: string;
  sourceNote?: string;
};

export type ArticlePublishPackage = {
  titles: {
    shortTitle: string;
    standardTitle: string;
    searchTitle: string;
    platformTitles: ArticlePublishPackagePlatformTitles;
  };
  summary: string;
  keywords: {
    primaryKeywords: string[];
    longTailKeywords: string[];
    platformTags: string[];
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  evidence: ArticlePublishPackageEvidence[];
  riskTips: string[];
  manualCheckItems: string[];
};

export type GenerateArticlePublishPackageInput = {
  title: string;
  body: string;
  productLineName?: string;
  promptText?: string;
  suggestedPublishChannel?: string;
  publishStatus?: PublishStatus;
  qualityGateResult?: QualityGateResult;
  evidence: ArticlePublishPackageEvidence[];
};

const HIGH_RISK_WORDS = [
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
  "首选",
  "最强",
  "一定适用"
];

const PLATFORM_TAG_LIMIT = 10;
const DIRTY_KEYWORD_PATTERNS = [
  /的正式资料/,
  /资料显示传感器/,
  /建议在选型/,
  /这些参数在工业测距/,
  /适用于/,
  /^核对/,
  /^确认/,
  /^建议/,
  /^本文/,
  /需要人工/,
  /正文和资料范围/,
  /所有现场/,
  /用户关心的问题/,
  /产品规格书$/,
  /正式资料$/,
  /资料$/,
  /^实际应用$/,
  /^GEO内容$/
];

export function generateArticlePublishPackage(
  input: GenerateArticlePublishPackageInput
): ArticlePublishPackage {
  // 第一版发布包只做规则整理，不调用 AI，避免生成发布包时产生额外额度消耗。
  const title = sanitizeTitle(input.title);
  const body = unwrapMaybeApiResponseText(input.body);
  const productLineName = cleanText(input.productLineName) ?? inferProductLine(title, body);
  const summary = buildSummary(body);
  const keywords = buildKeywords({
    title,
    body,
    productLineName,
    promptText: input.promptText,
    evidence: input.evidence
  });
  const titles = buildTitles({
    title,
    body,
    productLineName,
    keywords
  });
  const evidence = normalizeEvidence(input.evidence);
  const riskTips = buildRiskTips(input, evidence);
  const manualCheckItems = buildManualCheckItems(input, evidence);

  return {
    titles,
    summary,
    keywords,
    faqs: buildFaqs({
      body,
      productLineName,
      summary
    }),
    evidence,
    riskTips,
    manualCheckItems
  };
}

export function buildArticlePublishPackageMarkdown(input: {
  title: string;
  publishStatus?: PublishStatus;
  publishPackage: ArticlePublishPackage;
  generatedAt?: Date | string | null;
}): string {
  const publishPackage = input.publishPackage;

  return [
    `# ${publishPackage.titles.standardTitle || input.title}`,
    "",
    "## 标题组",
    `- 短标题：${publishPackage.titles.shortTitle}`,
    `- 标准标题：${publishPackage.titles.standardTitle}`,
    `- 搜索标题：${publishPackage.titles.searchTitle}`,
    "",
    "## 平台标题建议",
    ...Object.entries(publishPackage.titles.platformTitles).map(
      ([platform, value]) => `- ${platform}：${value}`
    ),
    "",
    "## 摘要",
    publishPackage.summary,
    "",
    "## 关键词",
    `- 主关键词：${joinOrPlaceholder(publishPackage.keywords.primaryKeywords)}`,
    `- 长尾关键词：${joinOrPlaceholder(publishPackage.keywords.longTailKeywords)}`,
    `- 平台标签：${joinOrPlaceholder(publishPackage.keywords.platformTags)}`,
    "",
    "## FAQ",
    ...publishPackage.faqs.flatMap((item, index) => [
      `${index + 1}. ${item.question}`,
      `   ${item.answer}`
    ]),
    "",
    "## 资料依据",
    ...formatEvidenceLines(publishPackage.evidence),
    "",
    "## 发布风险提示",
    ...formatListLines(publishPackage.riskTips, "暂无额外风险提示"),
    "",
    "## 人工确认项",
    ...formatListLines(publishPackage.manualCheckItems, "暂无额外人工确认项")
  ].join("\n");
}

export function buildArticlePublishPackageText(input: {
  title: string;
  publishStatus?: PublishStatus;
  publishPackage: ArticlePublishPackage;
  generatedAt?: Date | string | null;
}): string {
  return buildArticlePublishPackageMarkdown(input)
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s*/gm, "")
    .replace(/^\d+\.\s*/gm, "");
}

export function toArticlePublishPackage(
  value: unknown
): ArticlePublishPackage | undefined {
  const unwrappedValue = unwrapMaybeApiResponseValue(value);

  if (!isRecord(unwrappedValue)) {
    return undefined;
  }

  const titles = isRecord(unwrappedValue.titles) ? unwrappedValue.titles : {};
  const platformTitles = isRecord(titles.platformTitles) ? titles.platformTitles : {};
  const keywords = isRecord(unwrappedValue.keywords) ? unwrappedValue.keywords : {};

  return {
    titles: {
      shortTitle: stringValue(titles.shortTitle),
      standardTitle: stringValue(titles.standardTitle),
      searchTitle: stringValue(titles.searchTitle),
      platformTitles: {
        baijiahao: stringValue(platformTitles.baijiahao),
        toutiao: stringValue(platformTitles.toutiao),
        zhihu: stringValue(platformTitles.zhihu),
        xiaohongshu: stringValue(platformTitles.xiaohongshu),
        douyin: stringValue(platformTitles.douyin),
        generic: stringValue(platformTitles.generic)
      }
    },
    summary: stringValue(unwrappedValue.summary),
    keywords: {
      primaryKeywords: stringArray(keywords.primaryKeywords),
      longTailKeywords: stringArray(keywords.longTailKeywords),
      platformTags: stringArray(keywords.platformTags)
    },
    faqs: Array.isArray(unwrappedValue.faqs)
      ? unwrappedValue.faqs.filter(isRecord).map((item) => ({
          question: stringValue(item.question),
          answer: stringValue(item.answer)
        }))
      : [],
    evidence: Array.isArray(unwrappedValue.evidence)
      ? unwrappedValue.evidence.filter(isRecord).map((item) => ({
          knowledgeBaseName: optionalString(item.knowledgeBaseName),
          fileName: optionalString(item.fileName),
          productLineName: optionalString(item.productLineName),
          scopeType: optionalString(item.scopeType),
          sourceNote: optionalString(item.sourceNote)
        }))
      : [],
    riskTips: stringArray(unwrappedValue.riskTips),
    manualCheckItems: stringArray(unwrappedValue.manualCheckItems)
  };
}

function buildTitles(input: {
  title: string;
  body: string;
  productLineName?: string;
  keywords: ArticlePublishPackage["keywords"];
}): ArticlePublishPackage["titles"] {
  const modelName = inferModelName(`${input.title}\n${input.body}`);
  const productName =
    input.productLineName ??
    input.keywords.primaryKeywords.find((keyword) => /传感器|开关|终端/.test(keyword)) ??
    "GEO 内容";
  const titleSubject = modelName ? `${modelName} ${productName}` : productName;
  const standardTitle = normalizeTitleLength(
    input.title || `${titleSubject}选型与应用参考`,
    `${titleSubject}选型与应用参考`,
    32
  );
  const shortTitle = normalizeTitleLength(
    modelName ? `${modelName}选型参考` : `${productName}选型参考`,
    productName,
    22
  );
  const searchTitle = normalizeTitleLength(`${titleSubject}工业测距选型参考`, `${titleSubject}选型参考`, 40);

  return {
    shortTitle,
    standardTitle,
    searchTitle,
    platformTitles: {
      baijiahao: clampTitle(`${titleSubject}怎么选？应用场景与注意事项`, 34),
      toutiao: clampTitle(`${titleSubject}选型与现场应用参考`, 32),
      zhihu: clampTitle(`${titleSubject}适合哪些场景，选型前要看什么？`, 38),
      xiaohongshu: clampTitle(`${titleSubject}选型要点整理`, 28),
      douyin: clampTitle(`${titleSubject}选型和应用参考`, 26),
      generic: standardTitle
    }
  };
}

function buildSummary(body: string): string {
  const usefulLines = stripMarkdown(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 18)
    .filter((line) => !/^用户关心的问题[:：]/.test(line))
    .filter((line) => !/^问[:：]/.test(line))
    .filter((line) => !/^[^。！？?？]{0,50}[?？]$/.test(line));
  const paragraph = usefulLines.find((line) => line.length >= 30);
  const fallback = stripMarkdown(body).replace(/\s+/g, " ").trim();
  const summarySource = paragraph ?? (usefulLines.slice(0, 2).join("。") || fallback);

  return (
    sanitizeRiskWords(clampText(cleanSummaryText(summarySource), 150)) ||
    "内容摘要需结合正文和资料范围人工补充。"
  );
}

function buildKeywords(input: {
  title: string;
  body: string;
  productLineName?: string;
  promptText?: string;
  evidence: ArticlePublishPackageEvidence[];
}): ArticlePublishPackage["keywords"] {
  // 关键词只从现有标题、正文、提示词和资料名提取，避免塞入无关热词。
  const source = [
    input.title,
    input.body,
    input.productLineName,
    input.promptText,
    ...input.evidence.map((item) => `${item.fileName ?? ""} ${item.sourceNote ?? ""}`)
  ].join(" ");
  const modelNames = Array.from(source.matchAll(/KJT[-A-Za-z0-9]+/gi)).map((match) => match[0]);
  const sceneKeywords = [
    "工业测距",
    "物位检测",
    "输送带高度检测",
    "行车防撞",
    "仓储物流",
    "设备位置检测",
    "IO-Link",
    "IP67/IP69K",
    "毫米波雷达传感器"
  ].filter(
    (keyword) =>
      source.includes(keyword) ||
      (keyword === "毫米波雷达传感器" && /毫米波.*雷达|雷达.*毫米波/.test(source))
  );
  const candidates = [
    ...modelNames,
    input.productLineName,
    ...sceneKeywords,
    ...Array.from(source.matchAll(/[\u4e00-\u9fa5A-Za-z0-9-]{2,24}(?:传感器|开关|测距|选型|应用|方案|资料|规格书)/g)).map(
      (match) => match[0]
    ),
    ...modelNames.map((modelName) => `${modelName}选型`),
    ...(input.productLineName ? [`${input.productLineName}选型`] : [])
  ];
  const primaryKeywords = uniqueClean(candidates).slice(0, 8);
  const product = primaryKeywords[0] ?? input.productLineName ?? "产品";
  const longTailKeywords = uniqueClean([
    `${product}怎么选`,
    `${product}应用场景`,
    `${product}选型注意事项`,
    `${product}资料依据`
  ]).slice(0, 8);
  const platformTags = uniqueClean([...primaryKeywords, "工业品选型"]).slice(0, PLATFORM_TAG_LIMIT);

  return {
    primaryKeywords,
    longTailKeywords,
    platformTags
  };
}

function buildFaqs(input: {
  body: string;
  productLineName?: string;
  summary: string;
}): ArticlePublishPackage["faqs"] {
  const product = input.productLineName ?? "该产品";
  const scenes = extractSceneKeywords(input.body);
  const sceneAnswer =
    scenes.length > 0
      ? `从正文和资料范围看，${product}可用于${scenes.join("、")}等场景，实际应用仍需结合检测距离、安装条件和现场环境确认。`
      : `${product}的应用场景需结合资料和现场工况人工确认。`;

  return [
    {
      question: `${product}适合哪些场景？`,
      answer: clampText(sceneAnswer, 120)
    },
    {
      question: `选择${product}前需要确认什么？`,
      answer: "建议先确认检测对象、安装条件、现场环境、输出方式和资料中明确的型号参数。"
    },
    {
      question: "资料中没有明确的信息能否直接写进文章？",
      answer: "不建议直接补写。资料未明确的参数、价格、认证和案例，应保留人工确认项。"
    }
  ];
}

function buildRiskTips(
  input: GenerateArticlePublishPackageInput,
  evidence: ArticlePublishPackageEvidence[]
): string[] {
  const riskItems = input.qualityGateResult?.riskItems?.map(
    (item) => `${item.text}：${item.suggestion}`
  );
  const tips = [
    "发布前请人工核对型号、参数和适用场景。",
    "标题和正文不应出现夸大承诺、价格承诺或未证实排名。",
    "不同平台规则和标题长度需要发布前人工复核。",
    ...(riskItems ?? [])
  ];

  if (evidence.length === 0) {
    tips.push("资料依据未能自动确认，发布前需人工补充或核对来源。");
  }

  if (input.publishStatus === "not_recommended") {
    tips.push("当前发布质量状态为不建议发布，应先处理质量闸门风险项。");
  }

  return uniqueClean(tips);
}

function buildManualCheckItems(
  input: GenerateArticlePublishPackageInput,
  evidence: ArticlePublishPackageEvidence[]
): string[] {
  return uniqueClean([
    "型号参数是否与资料一致",
    "应用场景是否符合资料范围",
    "标题是否过长或偏标题党",
    "是否包含敏感、夸大或确定性承诺",
    "是否适合目标发布平台",
    ...(input.qualityGateResult?.manualReviewItems ?? []),
    ...(evidence.length === 0 ? ["资料依据需人工补充或核对"] : [])
  ]);
}

function normalizeEvidence(evidence: ArticlePublishPackageEvidence[]): ArticlePublishPackageEvidence[] {
  const seen = new Set<string>();
  const normalized: ArticlePublishPackageEvidence[] = [];

  // 资料依据必须来自调用方传入的可引用资料，不能在这里补造来源。
  for (const item of evidence) {
    const next = {
      knowledgeBaseName: cleanText(item.knowledgeBaseName),
      fileName: cleanText(item.fileName),
      productLineName: cleanText(item.productLineName),
      scopeType: cleanText(item.scopeType),
      sourceNote: cleanText(item.sourceNote)
    };
    const key = [
      next.knowledgeBaseName,
      next.fileName,
      next.productLineName,
      next.scopeType,
      next.sourceNote
    ].join("|");

    if (!seen.has(key) && Object.values(next).some(Boolean)) {
      seen.add(key);
      normalized.push(next);
    }
  }

  return normalized.slice(0, 12);
}

function sanitizeTitle(value: string): string {
  return sanitizeRiskWords(stripMarkdown(value).replace(/\s+/g, " ").trim());
}

function unwrapMaybeApiResponseValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      return value;
    }

    try {
      return unwrapMaybeApiResponseValue(JSON.parse(trimmed) as unknown);
    } catch {
      return value;
    }
  }

  if (isRecord(value) && "data" in value && "code" in value && "message" in value) {
    return unwrapMaybeApiResponseValue(value.data);
  }

  return value;
}

function unwrapMaybeApiResponseText(value: string): string {
  const unwrappedValue = unwrapMaybeApiResponseValue(value);

  return typeof unwrappedValue === "string" ? unwrappedValue : value;
}

function sanitizeRiskWords(value: string): string {
  return HIGH_RISK_WORDS.reduce(
    (current, word) => current.replace(new RegExp(escapeRegex(word), "g"), "建议"),
    value
  ).replace(/建议建议/g, "建议");
}

function clampTitle(value: string, maxLength: number): string {
  return normalizeTitleLength(value, value, maxLength);
}

function normalizeTitleLength(value: string, fallback: string, maxLength: number): string {
  const normalized = sanitizeRiskWords(value.replace(/\s+/g, " ").trim()).replace(/…/g, "");

  if (normalized.length > 0 && normalized.length <= maxLength) {
    return normalized;
  }

  const beforeColon = normalized.split(/[：:]/)[0]?.trim();

  if (beforeColon && beforeColon.length <= maxLength) {
    return beforeColon;
  }

  const fallbackTitle = sanitizeRiskWords(fallback.replace(/\s+/g, " ").trim()).replace(/…/g, "");

  return fallbackTitle.length <= maxLength ? fallbackTitle : fallbackTitle.slice(0, maxLength);
}

function clampText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function cleanSummaryText(value: string): string {
  return value
    .replace(/^用户关心的问题[:：]\s*/gm, "")
    .replace(/^问[:：]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferModelName(source: string): string | undefined {
  return source.match(/KJT[-A-Za-z0-9]+/i)?.[0];
}

function inferProductLine(title: string, body: string): string | undefined {
  const source = `${title}\n${body}`;
  const match = source.match(/KJT[-A-Za-z0-9]+|[\u4e00-\u9fa5A-Za-z0-9-]{2,24}(?:传感器|开关|测距)/);

  return match?.[0];
}

function extractSceneKeywords(body: string): string[] {
  return uniqueClean(
    [
      "工业测距",
      "物位检测",
      "输送带高度检测",
      "行车防撞",
      "仓储物流",
      "设备位置检测"
    ].filter((keyword) => body.includes(keyword))
  ).slice(0, 5);
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function uniqueClean(values: Array<string | undefined | null>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = cleanText(value);

    if (!normalized || seen.has(normalized) || !isMeaningfulKeyword(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(sanitizeRiskWords(normalized));
  }

  return result;
}

function isMeaningfulKeyword(value: string): boolean {
  if (value.length < 2 || value.length > 32) {
    return false;
  }

  return !DIRTY_KEYWORD_PATTERNS.some((pattern) => pattern.test(value));
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalString(value: unknown): string | undefined {
  return cleanText(value);
}

function stringValue(value: unknown): string {
  return cleanText(value) ?? "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? uniqueClean(value.map((item) => String(item))) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatEvidenceLines(evidence: ArticlePublishPackageEvidence[]): string[] {
  if (evidence.length === 0) {
    return ["- 暂无可自动确认的资料依据，发布前需人工核对。"];
  }

  return evidence.map((item) => {
    const parts = [
      item.knowledgeBaseName ? `知识库：${item.knowledgeBaseName}` : "",
      item.fileName ? `资料：${item.fileName}` : "",
      item.productLineName ? `产品线：${item.productLineName}` : "",
      item.scopeType ? `范围：${item.scopeType}` : "",
      item.sourceNote ? `说明：${item.sourceNote}` : ""
    ].filter(Boolean);

    return `- ${parts.join("；")}`;
  });
}

function formatListLines(values: string[], emptyText: string): string[] {
  if (values.length === 0) {
    return [`- ${emptyText}`];
  }

  return values.map((item) => `- ${item}`);
}

function joinOrPlaceholder(values: string[]): string {
  return values.length > 0 ? values.join("、") : "待人工补充";
}
