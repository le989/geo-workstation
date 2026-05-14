export const GEO_HIT_LEVEL_VALUES = [
  "recommended",
  "mentioned",
  "cited",
  "competitor_only",
  "not_mentioned",
  "unclear"
] as const;

export type GeoHitLevel = (typeof GEO_HIT_LEVEL_VALUES)[number];

export type HitLevelInput = {
  brandMentioned?: boolean;
  brandRecommended?: boolean;
  citedOfficialSite?: boolean;
  citedContentAsset?: boolean;
  competitorMentioned?: boolean;
};

export function deriveHitLevel(input: HitLevelInput): GeoHitLevel {
  if (input.brandRecommended) {
    return "recommended";
  }

  if (input.brandMentioned) {
    return "mentioned";
  }

  if (input.citedOfficialSite || input.citedContentAsset) {
    return "cited";
  }

  if (input.competitorMentioned && !input.brandMentioned) {
    return "competitor_only";
  }

  if (
    input.brandMentioned === false &&
    input.brandRecommended === false &&
    input.citedOfficialSite === false &&
    input.citedContentAsset === false
  ) {
    return "not_mentioned";
  }

  return "unclear";
}

export function normalizeHitLevel(value: unknown): GeoHitLevel | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return GEO_HIT_LEVEL_VALUES.includes(normalized as GeoHitLevel)
    ? (normalized as GeoHitLevel)
    : undefined;
}
