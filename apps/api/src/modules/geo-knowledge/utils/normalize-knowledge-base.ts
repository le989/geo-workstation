import type { CreateKnowledgeBaseDto } from "../dto/create-knowledge-base.dto";
import type { UpdateKnowledgeBaseDto } from "../dto/update-knowledge-base.dto";

export type NormalizedCreateKnowledgeBase = {
  name: string;
  productLine?: string;
  description?: string;
  status: string;
  createdBy?: string;
};

export type NormalizedUpdateKnowledgeBase = {
  name?: string;
  productLine?: string;
  description?: string;
  status?: string;
};

export function normalizeCreateKnowledgeBase(
  input: CreateKnowledgeBaseDto
): NormalizedCreateKnowledgeBase {
  return {
    name: trimRequired(input.name),
    productLine: trimOptional(input.productLine),
    description: trimOptional(input.description),
    status: trimOptional(input.status) ?? "active",
    createdBy: trimOptional(input.createdBy)
  };
}

export function normalizeUpdateKnowledgeBase(
  input: UpdateKnowledgeBaseDto
): NormalizedUpdateKnowledgeBase {
  const normalized: NormalizedUpdateKnowledgeBase = {};

  if (input.name !== undefined) {
    normalized.name = trimRequired(input.name);
  }
  if (input.productLine !== undefined) {
    normalized.productLine = trimOptional(input.productLine);
  }
  if (input.description !== undefined) {
    normalized.description = trimOptional(input.description);
  }
  if (input.status !== undefined) {
    normalized.status = trimOptional(input.status);
  }

  return normalized;
}

export function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function trimRequired(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
