import type { GeoModuleKey } from "@geo-workstation/shared";
import { DepartmentStatus, MembershipRole, UserRole } from "@prisma/client";
import { normalizeRole, type NormalizedAuthRole } from "./auth-policy";
import {
  DEFAULT_UNASSIGNED_DEPARTMENT_MODULE_KEYS,
  GEO_MODULE_KEYS
} from "./geo-module-catalog";

export type DepartmentAccessSnapshot = {
  id: string;
  status: DepartmentStatus;
} | null;

export type DepartmentModulePermissionSnapshot = {
  moduleKey: string;
  canAccess: boolean;
};

const API_MODULE_PREFIXES: Array<{ prefix: string; moduleKey: GeoModuleKey }> = [
  { prefix: "/api/geo-analysis-tasks", moduleKey: "geo-analysis" },
  { prefix: "/api/geo-prompts", moduleKey: "geo-prompts" },
  { prefix: "/api/expansion", moduleKey: "expansion" },
  { prefix: "/api/knowledge-bases", moduleKey: "knowledge-bases" },
  { prefix: "/api/knowledge-files", moduleKey: "knowledge-bases" },
  { prefix: "/api/knowledge-chunks", moduleKey: "knowledge-bases" },
  { prefix: "/api/instruction-templates", moduleKey: "instruction-templates" },
  { prefix: "/api/content-tasks", moduleKey: "geo-content" },
  { prefix: "/api/content-items", moduleKey: "geo-content" },
  { prefix: "/api/model-inclusion-records", moduleKey: "model-inclusion-records" },
  { prefix: "/api/reports", moduleKey: "geo-reports" },
  { prefix: "/api/users", moduleKey: "users" },
  { prefix: "/api/companies", moduleKey: "companies" },
  { prefix: "/api/product-lines", moduleKey: "product-lines" },
  { prefix: "/api/project-profile", moduleKey: "settings" },
  { prefix: "/api/departments", moduleKey: "departments" }
];

export const ALL_GEO_MODULE_KEYS = [...GEO_MODULE_KEYS];
export const UNASSIGNED_DEPARTMENT_MODULE_KEYS = [...DEFAULT_UNASSIGNED_DEPARTMENT_MODULE_KEYS];

export const isModuleAccessBypassed = (
  role: UserRole | MembershipRole | NormalizedAuthRole | string | undefined,
  isPlatformAdmin = false
) => {
  const normalizedRole = normalizeRole(role);
  return isPlatformAdmin || normalizedRole === "platform_admin" || normalizedRole === "company_admin";
};

export const resolveAccessibleModuleKeys = (input: {
  role: UserRole | MembershipRole | string | undefined;
  isPlatformAdmin?: boolean;
  department?: DepartmentAccessSnapshot;
  permissions?: DepartmentModulePermissionSnapshot[];
}): GeoModuleKey[] => {
  if (isModuleAccessBypassed(input.role, input.isPlatformAdmin)) {
    return ALL_GEO_MODULE_KEYS;
  }

  if (!input.department || input.department.status !== DepartmentStatus.active) {
    return UNASSIGNED_DEPARTMENT_MODULE_KEYS;
  }

  const enabled = new Set(
    (input.permissions ?? [])
      .filter((permission) => permission.canAccess)
      .map((permission) => permission.moduleKey)
  );

  return GEO_MODULE_KEYS.filter((moduleKey) => enabled.has(moduleKey));
};

export const resolveApiModuleKey = (url?: string): GeoModuleKey | null => {
  if (!url) {
    return null;
  }

  const path = url.split("?")[0] ?? "";
  const matched = API_MODULE_PREFIXES.find(
    (entry) => path === entry.prefix || path.startsWith(`${entry.prefix}/`)
  );

  return matched?.moduleKey ?? null;
};
