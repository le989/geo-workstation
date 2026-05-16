import type { AuthRole } from "@/api/auth";

export type NormalizedRole = "platform_admin" | "company_admin" | "operator" | "viewer";

export type PermissionAction =
  | "create"
  | "edit"
  | "delete"
  | "import"
  | "export"
  | "run"
  | "retry"
  | "quality"
  | "optimize"
  | "detect"
  | "reparse"
  | "upload"
  | "settings_write";

export const allAuthenticatedRoles: NormalizedRole[] = [
  "platform_admin",
  "company_admin",
  "operator",
  "viewer"
];

export const businessOperatorRoles: NormalizedRole[] = [
  "platform_admin",
  "company_admin",
  "operator"
];

export const normalizeRole = (role?: AuthRole | string | null): NormalizedRole => {
  switch (role) {
    case "platform_admin":
    case "admin":
      return "platform_admin";
    case "company_admin":
      return "company_admin";
    case "operator":
    case "geo_operator":
    case "content_editor":
      return "operator";
    case "viewer":
    default:
      return "viewer";
  }
};

export const getRoleLabel = (role?: AuthRole | string | null) => {
  const labels: Record<NormalizedRole, string> = {
    platform_admin: "平台管理员",
    company_admin: "公司管理员",
    operator: "运营人员",
    viewer: "只读用户"
  };

  return role ? labels[normalizeRole(role)] : "成员";
};

export const canAccessRoute = (
  path: string,
  role?: AuthRole | string | null,
  allowedRoles?: NormalizedRole[]
) => {
  if (path === "/403" || path === "/help" || path === "/dashboard") {
    return true;
  }

  if (path === "/users") {
    return false;
  }

  const normalizedRole = normalizeRole(role);

  if (allowedRoles) {
    return allowedRoles.includes(normalizedRole);
  }

  if (path === "/settings") {
    return normalizedRole === "platform_admin";
  }

  if (path === "/expansion") {
    return businessOperatorRoles.includes(normalizedRole);
  }

  return allAuthenticatedRoles.includes(normalizedRole);
};

export const canUseAction = (action: PermissionAction, role?: AuthRole | string | null) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "platform_admin") {
    return true;
  }

  if (action === "settings_write") {
    return false;
  }

  if (normalizedRole === "viewer") {
    return false;
  }

  if (action === "import") {
    return normalizedRole === "company_admin";
  }

  return true;
};
