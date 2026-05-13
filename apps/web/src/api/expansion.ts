import { apiRequest } from "./http";
import type { GeoPromptType, UserIntent } from "./geo-prompts";

export type ExpansionMode = "rule" | "ai";
export type ExpansionTaskStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";
export type ExpansionCandidateSaveStatus =
  | "pending"
  | "saved"
  | "duplicate_in_batch"
  | "duplicate_in_database";

export type ExpansionJob = {
  id: string;
  mode: ExpansionMode;
  promptType: GeoPromptType;
  provider?: string;
  model?: string;
  status: ExpansionTaskStatus;
  inputPayload: Record<string, unknown>;
  baseWord?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpansionCandidate = {
  id: string;
  jobId: string;
  baseWord?: string;
  promptText: string;
  userIntent?: UserIntent;
  priority: number;
  recommendedContentType?: string;
  selected: boolean;
  savedPromptId: string | null;
  createdAt: string;
  duplicateInBatch: boolean;
  duplicateInDatabase: boolean;
  duplicateReason: "duplicate_in_batch" | "duplicate_in_database" | null;
  saveStatus: ExpansionCandidateSaveStatus;
};

export type ExpansionJobDetail = {
  job: ExpansionJob;
  candidates: ExpansionCandidate[];
};

export type RuleGenerateExpansionPayload = {
  baseWord: string;
  prefixes?: string[];
  serviceSuffixes?: string[];
  applicationSuffixes?: string[];
  promptType?: GeoPromptType;
  productLine?: string;
  scenario?: string;
  userIntent?: UserIntent;
  priority?: number;
  targetModels?: string[];
  source?: string;
  trackEnabled?: boolean;
  createdBy?: string;
};

export type AiGenerateExpansionPayload = {
  baseWord: string;
  knowledgeBaseId?: string;
  promptType: Exclude<GeoPromptType, "base">;
  userIntent?: UserIntent;
  productLine?: string;
  scenario?: string;
  count?: number;
  constraints?: string;
  targetModels?: string[];
  provider?: "mock" | "openai_compatible";
  model?: string;
  createdBy?: string;
};

export type SaveExpansionCandidatesPayload = {
  candidateIds: string[];
  createdBy?: string;
  defaultProductLine?: string;
  defaultPriority?: number;
  defaultTrackEnabled?: boolean;
};

export type SavedExpansionCandidateItem = {
  candidateId: string;
  geoPromptId: string;
  promptText: string;
};

export type SkippedExpansionCandidateItem = {
  candidateId: string;
  promptText?: string;
  reason: "duplicate_in_database" | "already_saved";
};

export type FailedExpansionCandidateItem = {
  candidateId: string;
  reason: "candidate_not_found" | "candidate_not_in_job" | "save_failed";
  message?: string;
};

export type SaveExpansionCandidatesResult = {
  totalSelected: number;
  savedCount: number;
  skippedCount: number;
  failedCount: number;
  savedItems: SavedExpansionCandidateItem[];
  skippedItems: SkippedExpansionCandidateItem[];
  failedItems: FailedExpansionCandidateItem[];
};

export const ruleGenerateExpansion = (payload: RuleGenerateExpansionPayload) =>
  apiRequest<ExpansionJobDetail>("/api/expansion/rule-generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const aiGenerateExpansion = (payload: AiGenerateExpansionPayload) =>
  apiRequest<ExpansionJobDetail>("/api/expansion/ai-generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getExpansionJob = (id: string) =>
  apiRequest<ExpansionJobDetail>(`/api/expansion/jobs/${id}`);

export const saveExpansionCandidates = (jobId: string, payload: SaveExpansionCandidatesPayload) =>
  apiRequest<SaveExpansionCandidatesResult>(`/api/expansion/jobs/${jobId}/save-candidates`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
