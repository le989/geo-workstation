export const GEO_APP_NAME = "GEO Marketing Operations System";

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export * from "./geo-enums";
export * from "./module-permissions";
