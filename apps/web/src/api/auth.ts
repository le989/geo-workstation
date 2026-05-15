import { apiRequest } from "./http";

export type AuthRole =
  | "platform_admin"
  | "company_admin"
  | "operator"
  | "admin"
  | "geo_operator"
  | "content_editor"
  | "viewer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  status: "active" | "disabled";
  isPlatformAdmin: boolean;
};

export type AuthCompany = {
  id: string;
  name: string;
  code: string;
  role: "platform_admin" | "company_admin" | "operator";
  isDefault: boolean;
  status: "active" | "disabled";
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthSession = {
  user: AuthUser;
  companies: AuthCompany[];
  currentCompany: AuthCompany;
};

export type LoginResult = AuthSession & {
  token: string;
};

export const login = (payload: LoginPayload) =>
  apiRequest<LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getCurrentUser = (companyId?: string | null) =>
  apiRequest<AuthSession>("/api/auth/me", {
    method: "GET",
    headers: companyId ? { "X-Company-Id": companyId } : undefined
  });

export const logout = () =>
  apiRequest<{ loggedOut: boolean }>("/api/auth/logout", {
    method: "POST"
  });
