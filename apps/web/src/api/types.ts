export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type HealthStatus = {
  status?: string;
  service?: string;
  phase?: string;
  timestamp?: string;
  uptime?: number;
  checks?: Record<string, unknown>;
};
