import type { ApiResponse } from "./types";

export const DEFAULT_API_BASE_URL = "http://localhost:3000";

let authTokenGetter: (() => string | null) | undefined;
let unauthorizedHandler: (() => void) | undefined;

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly data?: unknown;

  constructor(message: string, options: { status: number; code?: number; data?: unknown }) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.data = options.data;
  }
}

export const setAuthTokenGetter = (getter: () => string | null) => {
  authTokenGetter = getter;
};

export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

export const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = configuredBaseUrl === undefined ? DEFAULT_API_BASE_URL : configuredBaseUrl;

  return baseUrl.replace(/\/+$/, "");
};

export const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const apiBaseUrl = getApiBaseUrl();
  const normalizedPath = path.replace(/^\/+/, "");

  return apiBaseUrl ? `${apiBaseUrl}/${normalizedPath}` : `/${normalizedPath}`;
};

const hasRequestBody = (body: unknown) => body !== undefined && body !== null;

const isApiResponse = <T>(payload: unknown): payload is ApiResponse<T> => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "code" in payload && "message" in payload && "data" in payload;
};

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (hasRequestBody(init.body) && !(init.body instanceof FormData)) {
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  }

  const token = authTokenGetter?.();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw new ApiClientError(payload?.message || response.statusText || "Request failed", {
      status: response.status,
      code: payload?.code,
      data: payload?.data
    });
  }

  if (!isApiResponse<T>(payload)) {
    throw new ApiClientError("Unexpected API response shape", {
      status: response.status,
      data: payload
    });
  }

  if (payload.code !== 0) {
    throw new ApiClientError(payload.message || "API returned an error", {
      status: response.status,
      code: payload.code,
      data: payload.data
    });
  }

  return payload.data;
}

export const apiGet = <T>(path: string) => apiRequest<T>(path, { method: "GET" });
