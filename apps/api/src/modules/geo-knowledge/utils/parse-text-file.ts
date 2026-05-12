import { basename, extname } from "node:path";

export type ParsedKnowledgeChunk = {
  title: string;
  content: string;
};

const MIN_CHUNK_CONTENT_LENGTH = 10;

export function parseTextFileContent(content: string, fileName: string): ParsedKnowledgeChunk[] {
  const baseTitle = basename(fileName, extname(fileName));
  const paragraphs = content
    .split(/\r?\n\s*\r?\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= MIN_CHUNK_CONTENT_LENGTH);

  return paragraphs.map((paragraph, index) => ({
    title: `${baseTitle} ${index + 1}`,
    content: paragraph
  }));
}
