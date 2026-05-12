import type { ApiResponse } from "@geo-workstation/shared";

export type { ApiResponse };

export const API_SUCCESS_CODE = 0;

export function createApiResponse<T>(
  data: T,
  message = "ok",
  code = API_SUCCESS_CODE
): ApiResponse<T> {
  return {
    code,
    message,
    data
  };
}

export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ApiResponse<unknown>>;
  return (
    typeof candidate.code === "number" &&
    typeof candidate.message === "string" &&
    "data" in candidate
  );
}
