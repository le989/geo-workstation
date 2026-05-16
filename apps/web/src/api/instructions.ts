import type { GeoPromptType, ResourceVisibility } from "./geo-prompts";
import { apiRequest } from "./http";

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type InstructionTemplate = {
  id: string;
  name: string;
  instructionType: string;
  contentType: string;
  targetPromptType?: GeoPromptType;
  targetModel?: string;
  instruction: string;
  outputFormat?: string;
  qualityRules?: string;
  forbiddenRules?: string;
  companyId?: string;
  visibility: ResourceVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type InstructionTemplateQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  instructionType?: string;
  contentType?: string;
  targetPromptType?: GeoPromptType;
  targetModel?: string;
  createdBy?: string;
};

export type CreateInstructionTemplatePayload = {
  name: string;
  instructionType: string;
  contentType?: string;
  targetPromptType?: GeoPromptType;
  targetModel?: string;
  instruction: string;
  outputFormat?: string;
  qualityRules?: string;
  forbiddenRules?: string;
  createdBy?: string;
};

export type UpdateInstructionTemplatePayload = Partial<
  Omit<CreateInstructionTemplatePayload, "createdBy">
>;

export type DuplicateInstructionTemplatePayload = {
  name?: string;
  createdBy?: string;
};

export type DeleteInstructionTemplateResult = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: string;
};

const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const getInstructionTemplates = (params: InstructionTemplateQuery = {}) =>
  apiRequest<PaginatedResponse<InstructionTemplate>>(
    `/api/instruction-templates${toQueryString(params)}`
  );

export const createInstructionTemplate = (payload: CreateInstructionTemplatePayload) =>
  apiRequest<InstructionTemplate>("/api/instruction-templates", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getInstructionTemplate = (id: string) =>
  apiRequest<InstructionTemplate>(`/api/instruction-templates/${id}`);

export const updateInstructionTemplate = (id: string, payload: UpdateInstructionTemplatePayload) =>
  apiRequest<InstructionTemplate>(`/api/instruction-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const duplicateInstructionTemplate = (
  id: string,
  payload: DuplicateInstructionTemplatePayload = {}
) =>
  apiRequest<InstructionTemplate>(`/api/instruction-templates/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const deleteInstructionTemplate = (id: string) =>
  apiRequest<DeleteInstructionTemplateResult>(`/api/instruction-templates/${id}`, {
    method: "DELETE"
  });
