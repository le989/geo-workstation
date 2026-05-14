export const USER_ROLES = ["admin", "geo_operator", "content_editor", "viewer"] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatusValue = (typeof USER_STATUSES)[number];

export const TASK_STATUSES = ["pending", "running", "succeeded", "failed", "cancelled"] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];

export const GEO_PROMPT_TYPES = ["base", "distilled", "brand", "scene"] as const;
export type GeoPromptTypeValue = (typeof GEO_PROMPT_TYPES)[number];

export const USER_INTENTS = [
  "selection",
  "purchase",
  "manufacturer_recommendation",
  "domestic_alternative",
  "comparison",
  "troubleshooting",
  "application_solution",
  "brand_verification"
] as const;
export type UserIntentValue = (typeof USER_INTENTS)[number];

export const EXPANSION_MODES = ["rule", "ai"] as const;
export type ExpansionModeValue = (typeof EXPANSION_MODES)[number];

export const PARSE_STATUSES = ["pending", "parsing", "succeeded", "failed"] as const;
export type ParseStatusValue = (typeof PARSE_STATUSES)[number];

export const MODEL_INCLUSION_RECORD_METHODS = ["manual", "api", "import"] as const;
export type ModelInclusionRecordMethodValue = (typeof MODEL_INCLUSION_RECORD_METHODS)[number];

export const GEO_HIT_ENTRY_POINTS = [
  "api_model",
  "web_search_api",
  "web_pc",
  "web_mobile",
  "app_ios",
  "app_android",
  "manual"
] as const;
export type GeoHitEntryPointValue = (typeof GEO_HIT_ENTRY_POINTS)[number];

export const GEO_HIT_DETECTION_METHODS = [
  "manual",
  "api",
  "web_search",
  "browser_capture",
  "mobile_emulation",
  "app_manual"
] as const;
export type GeoHitDetectionMethodValue = (typeof GEO_HIT_DETECTION_METHODS)[number];

export const GEO_HIT_DEVICE_TYPES = ["desktop", "mobile", "ios", "android", "api"] as const;
export type GeoHitDeviceTypeValue = (typeof GEO_HIT_DEVICE_TYPES)[number];

export const GEO_HIT_LEVELS = [
  "recommended",
  "mentioned",
  "cited",
  "competitor_only",
  "not_mentioned",
  "unclear"
] as const;
export type GeoHitLevelValue = (typeof GEO_HIT_LEVELS)[number];

export const AI_CALL_STATUSES = ["pending", "succeeded", "failed"] as const;
export type AiCallStatusValue = (typeof AI_CALL_STATUSES)[number];
