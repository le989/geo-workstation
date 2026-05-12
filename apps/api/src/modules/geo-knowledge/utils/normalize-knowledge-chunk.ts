import type { QueryKnowledgeChunksDto } from "../dto/query-knowledge-chunks.dto";
import type { TextImportKnowledgeDto } from "../dto/text-import-knowledge.dto";
import type { UpdateKnowledgeChunkDto } from "../dto/update-knowledge-chunk.dto";
import { toOptionalInt } from "../dto/knowledge-dto-transforms";
import { normalizeTags } from "./tags.util";

export type NormalizedTextImportKnowledge = {
  title: string;
  content: string;
  sourceType: string;
  productLine?: string;
  materialType?: string;
  tags: string[];
  createdBy?: string;
};

export type NormalizedUpdateKnowledgeChunk = {
  title?: string;
  content?: string;
  sourceType?: string;
  productLine?: string;
  materialType?: string;
  tags?: string[];
};

export type NormalizedQueryKnowledgeChunks = {
  page: number;
  pageSize: number;
  search?: string;
  sourceType?: string;
  productLine?: string;
  materialType?: string;
  tags: string[];
};

export function normalizeTextImportKnowledge(
  input: TextImportKnowledgeDto
): NormalizedTextImportKnowledge {
  return {
    title: trimRequired(input.title),
    content: trimRequired(input.content),
    sourceType: trimOptional(input.sourceType) ?? "pasted_text",
    productLine: trimOptional(input.productLine),
    materialType: trimOptional(input.materialType),
    tags: normalizeTags(input.tags),
    createdBy: trimOptional(input.createdBy)
  };
}

export function normalizeUpdateKnowledgeChunk(
  input: UpdateKnowledgeChunkDto
): NormalizedUpdateKnowledgeChunk {
  const normalized: NormalizedUpdateKnowledgeChunk = {};

  if (input.title !== undefined) {
    normalized.title = trimRequired(input.title);
  }
  if (input.content !== undefined) {
    normalized.content = trimRequired(input.content);
  }
  if (input.sourceType !== undefined) {
    normalized.sourceType = trimOptional(input.sourceType);
  }
  if (input.productLine !== undefined) {
    normalized.productLine = trimOptional(input.productLine);
  }
  if (input.materialType !== undefined) {
    normalized.materialType = trimOptional(input.materialType);
  }
  if (input.tags !== undefined) {
    normalized.tags = normalizeTags(input.tags);
  }

  return normalized;
}

export function normalizeQueryKnowledgeChunks(
  input: QueryKnowledgeChunksDto,
  defaultPage = 1,
  defaultPageSize = 20
): NormalizedQueryKnowledgeChunks {
  return {
    page: Math.max(toOptionalInt(input.page) ?? defaultPage, 1),
    pageSize: Math.min(Math.max(toOptionalInt(input.pageSize) ?? defaultPageSize, 1), 100),
    search: trimOptional(input.search),
    sourceType: trimOptional(input.sourceType),
    productLine: trimOptional(input.productLine),
    materialType: trimOptional(input.materialType),
    tags: normalizeTags(input.tags)
  };
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
