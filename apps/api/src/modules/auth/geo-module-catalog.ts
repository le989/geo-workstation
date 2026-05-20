import type { GeoModuleKey } from "@geo-workstation/shared";

export const GEO_MODULE_KEYS = [
  "dashboard",
  "geo-analysis",
  "geo-prompts",
  "expansion",
  "knowledge-bases",
  "instruction-templates",
  "geo-content",
  "model-inclusion-records",
  "geo-reports",
  "users",
  "settings",
  "help",
  "companies",
  "product-lines",
  "departments",
  "aftersales-qa",
  "feedback-center",
  "usage-analytics",
  "operation-logs"
] as const satisfies readonly GeoModuleKey[];

export const DEFAULT_UNASSIGNED_DEPARTMENT_MODULE_KEYS = [
  "dashboard",
  "help"
] as const satisfies readonly GeoModuleKey[];
