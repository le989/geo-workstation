import { extname } from "node:path";

const SUPPORTED_KNOWLEDGE_FILE_TYPES = new Set(["txt", "md", "csv", "xlsx", "xls", "docx"]);

export function resolveKnowledgeFileType(fileName: string): string {
  const extension = extname(fileName).toLowerCase();
  const fileType = extension.replace(/^\./, "");

  if (!SUPPORTED_KNOWLEDGE_FILE_TYPES.has(fileType)) {
    throw new Error(`Unsupported GEO knowledge file type: ${extension || "(none)"}`);
  }

  return fileType;
}

export function isSupportedKnowledgeFileType(fileName: string): boolean {
  try {
    resolveKnowledgeFileType(fileName);
    return true;
  } catch {
    return false;
  }
}
