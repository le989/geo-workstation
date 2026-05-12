import { parseTextFileContent, type ParsedKnowledgeChunk } from "./parse-text-file";

const MIN_CHUNK_CONTENT_LENGTH = 10;

export function parseMarkdownFileContent(
  content: string,
  fileName: string
): ParsedKnowledgeChunk[] {
  const lines = content.split(/\r?\n/);
  const chunks: ParsedKnowledgeChunk[] = [];
  let currentTitle: string | undefined;
  let currentBody: string[] = [];
  let hasHeading = false;

  function flushCurrent(): void {
    if (!currentTitle) {
      return;
    }

    const body = currentBody.join("\n").trim();
    if (body.length >= MIN_CHUNK_CONTENT_LENGTH) {
      chunks.push({
        title: currentTitle,
        content: body
      });
    }
  }

  for (const line of lines) {
    const headingMatch = /^(#{1,2})\s+(.+)$/.exec(line.trim());

    if (headingMatch) {
      hasHeading = true;
      flushCurrent();
      currentTitle = headingMatch[2]?.trim();
      currentBody = [];
      continue;
    }

    currentBody.push(line);
  }

  flushCurrent();

  if (!hasHeading || chunks.length === 0) {
    return parseTextFileContent(content, fileName);
  }

  return chunks;
}
