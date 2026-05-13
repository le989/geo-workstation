import { apiGet, apiRequest } from "./http";

export type ProjectProfile = {
  id: string;
  projectName: string;
  companyName?: string;
  brandName?: string;
  websiteUrl?: string;
  industry?: string;
  mainProducts: string[];
  targetCustomers?: string;
  positioning?: string;
  tone?: string;
  forbiddenClaims: string[];
  targetModels: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectProfilePayload = {
  projectName: string;
  companyName?: string;
  brandName?: string;
  websiteUrl?: string;
  industry?: string;
  mainProducts?: string[];
  targetCustomers?: string;
  positioning?: string;
  tone?: string;
  forbiddenClaims?: string[];
  targetModels?: string[];
  notes?: string;
};

export const getProjectProfile = () => apiGet<ProjectProfile | null>("/api/project-profile");

export const createProjectProfile = (payload: ProjectProfilePayload) =>
  apiRequest<ProjectProfile>("/api/project-profile", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateProjectProfile = (payload: Partial<ProjectProfilePayload>) =>
  apiRequest<ProjectProfile>("/api/project-profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
