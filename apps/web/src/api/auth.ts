import { apiGet, apiRequest } from "./http";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "geo_operator" | "content_editor" | "viewer";
  status: "active" | "disabled";
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
};

export const login = (payload: LoginPayload) =>
  apiRequest<LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getCurrentUser = () => apiGet<AuthUser>("/api/auth/me");

export const logout = () =>
  apiRequest<{ loggedOut: boolean }>("/api/auth/logout", {
    method: "POST"
  });
