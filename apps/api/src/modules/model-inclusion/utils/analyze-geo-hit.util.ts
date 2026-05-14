import { deriveHitLevel, type GeoHitLevel } from "./derive-hit-level.util";

export type AnalyzeGeoHitInput = {
  promptText: string;
  answer: string;
  brandName?: string;
  companyName?: string;
  websiteUrl?: string;
  knownCompetitors?: string[];
  citations?: unknown[];
  searchResults?: unknown[];
};

export type AnalyzeGeoHitResult = {
  brandMentioned: boolean;
  brandRecommended: boolean;
  citedOfficialSite: boolean;
  citedContentAsset: boolean;
  competitorMentioned: boolean;
  competitors: string[];
  hitLevel: GeoHitLevel;
  rankingPosition?: number;
  answerSummary: string;
  rawAnswer: string;
  citations: unknown[];
  searchResults: unknown[];
  errorMessage?: string;
};

const RECOMMENDATION_PATTERNS = [
  "推荐",
  "建议",
  "可以考虑",
  "优先考虑",
  "适合选择",
  "值得选择",
  "首选",
  "优先选",
  "可选"
];

const NEGATIVE_BRAND_MENTION_PATTERNS = [
  /未(?:明确)?(?:出现|提及|提到|找到|检索到|发现|收录)/,
  /没有(?:明确)?(?:出现|提及|提到|找到|检索到|发现|收录)/,
  /无(?:明确)?(?:提及|出现|相关结果)/,
  /不(?:包含|涉及)/
];

const OFFICIAL_SITE_DENIAL_PATTERNS = [
  /未(?:明确)?(?:引用|提及|找到|出现)(?:目标)?官网/,
  /没有(?:明确)?(?:引用|提及|找到|出现)(?:目标)?官网/,
  /无(?:明确)?(?:官网引用|官网来源|目标官网)/,
  /不(?:引用|包含|涉及)(?:目标)?官网/
];

export function analyzeGeoHitFromAnswer(input: AnalyzeGeoHitInput): AnalyzeGeoHitResult {
  const answer = input.answer.trim();
  const citations = input.citations ?? [];
  const searchResults = input.searchResults ?? [];
  const brandCandidates = uniqueStrings([input.brandName, input.companyName]);
  const brandMentioned = brandCandidates.some((name) => hasAffirmativeBrandMention(answer, name));
  const brandRecommended =
    brandMentioned &&
    brandCandidates.some((name) => isRecommendedWithBrand(answer, name, RECOMMENDATION_PATTERNS));
  const websiteDomain = extractDomain(input.websiteUrl);
  const citedOfficialSite = websiteDomain
    ? hasOfficialSiteCitationEvidence(answer, citations, websiteDomain)
    : false;
  const competitors = uniqueStrings(input.knownCompetitors ?? []).filter((competitor) =>
    includesLoose(answer, competitor)
  );
  const competitorMentioned = competitors.length > 0;
  const citedContentAsset = false;
  const hitLevel = deriveHitLevel({
    brandMentioned,
    brandRecommended,
    citedOfficialSite,
    citedContentAsset,
    competitorMentioned
  });

  return {
    brandMentioned,
    brandRecommended,
    citedOfficialSite,
    citedContentAsset,
    competitorMentioned,
    competitors,
    hitLevel,
    answerSummary: summarizeAnswer(answer),
    rawAnswer: answer,
    citations,
    searchResults
  };
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function includesLoose(text: string, needle: string): boolean {
  if (!needle) {
    return false;
  }

  return text.toLowerCase().includes(needle.toLowerCase());
}

function hasAffirmativeBrandMention(text: string, brand: string): boolean {
  if (!brand || !includesLoose(text, brand)) {
    return false;
  }

  const normalizedText = text.toLowerCase();
  const normalizedBrand = brand.toLowerCase();
  let brandIndex = normalizedText.indexOf(normalizedBrand);

  while (brandIndex >= 0) {
    const windowStart = Math.max(0, brandIndex - 32);
    const windowEnd = Math.min(text.length, brandIndex + brand.length + 32);
    const nearbyText = text.slice(windowStart, windowEnd);

    if (!NEGATIVE_BRAND_MENTION_PATTERNS.some((pattern) => pattern.test(nearbyText))) {
      return true;
    }

    brandIndex = normalizedText.indexOf(normalizedBrand, brandIndex + normalizedBrand.length);
  }

  return false;
}

function hasOfficialSiteCitationEvidence(
  answer: string,
  citations: unknown[],
  websiteDomain: string
): boolean {
  if (hasOfficialSiteDenial(answer)) {
    return false;
  }

  return includesLoose(answer, websiteDomain) || hasCitationUrlWithDomain(citations, websiteDomain);
}

function hasOfficialSiteDenial(text: string): boolean {
  return OFFICIAL_SITE_DENIAL_PATTERNS.some((pattern) => pattern.test(text));
}

function hasCitationUrlWithDomain(value: unknown, websiteDomain: string): boolean {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasCitationUrlWithDomain(item, websiteDomain));
  }

  if (typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const citationUrl = record.url ?? record.uri ?? record.link;
  if (typeof citationUrl === "string" && includesLoose(citationUrl, websiteDomain)) {
    return true;
  }

  return Object.values(record).some((item) => hasCitationUrlWithDomain(item, websiteDomain));
}

function isRecommendedWithBrand(text: string, brand: string, patterns: string[]): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedBrand = brand.toLowerCase();
  const brandIndex = normalizedText.indexOf(normalizedBrand);

  if (brandIndex < 0) {
    return false;
  }

  const windowStart = Math.max(0, brandIndex - 80);
  const windowEnd = Math.min(text.length, brandIndex + brand.length + 80);
  const nearbyText = text.slice(windowStart, windowEnd);

  return patterns.some((pattern) => nearbyText.includes(pattern));
}

function extractDomain(url: string | undefined): string | undefined {
  const trimmed = url?.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).hostname.replace(/^www\./, "");
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      ?.trim();
  }
}

function summarizeAnswer(answer: string): string {
  const normalized = answer.replace(/\s+/g, " ").trim();

  if (normalized.length <= 500) {
    return normalized;
  }

  return `${normalized.slice(0, 497)}...`;
}
