import { apiGet } from "./http";
import type { HealthStatus } from "./types";

export const getBackendHealth = () => apiGet<HealthStatus>("/health");
