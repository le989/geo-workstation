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

export const AI_CALL_STATUSES = ["pending", "succeeded", "failed"] as const;
export type AiCallStatusValue = (typeof AI_CALL_STATUSES)[number];
