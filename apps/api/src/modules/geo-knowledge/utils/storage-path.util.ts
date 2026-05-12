import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export function buildKnowledgeBaseUploadDirectory(
  storageRoot: string,
  knowledgeBaseId: string
): string {
  return resolve(storageRoot, "uploads", "knowledge-bases", knowledgeBaseId);
}

export function buildStoredKnowledgeFilePath(
  storageRoot: string,
  knowledgeBaseId: string,
  originalName: string
): string {
  const storedFileName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(originalName)}`;
  return join(buildKnowledgeBaseUploadDirectory(storageRoot, knowledgeBaseId), storedFileName);
}

export function sanitizeFileName(fileName: string): string {
  return basename(fileName)
    .trim()
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
