import type { ApiResponse } from "./types";

export const DEFAULT_API_BASE_URL = "http://localhost:3000";

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

export const getApiBaseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

export const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${getApiBaseUrl()}/${path.replace(/^\/+/, "")}`;
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

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
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
