import JSZip from "jszip";
import { basename, extname } from "node:path";
import type { ParsedKnowledgeChunk } from "./parse-text-file";

export async function parseDocxFileContent(
  buffer: Buffer,
  fileName: string
): Promise<ParsedKnowledgeChunk[]> {
  let documentXml = "";

  try {
    const zip = await JSZip.loadAsync(buffer);
    documentXml = await zip.file("word/document.xml")?.async("string") ?? "";
  } catch (error) {
    throw new Error(`DOCX parse failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  if (!documentXml) {
    throw new Error("DOCX parse failed: word/document.xml is missing");
  }

  const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g))
    .map((match) => extractParagraphText(match[0]))
    .filter(Boolean);
  const [firstParagraph, ...restParagraphs] = paragraphs;
  const content = restParagraphs.length > 0 ? restParagraphs.join("\n\n") : (firstParagraph ?? "");

  if (content.trim().length < 10) {
    return [];
  }

  return [
    {
      title: firstParagraph || basename(fileName, extname(fileName)),
      content: content.trim()
    }
  ];
}

function extractParagraphText(paragraphXml: string): string {
  return Array.from(paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
    .map((match) => decodeXmlEntities(match[1] ?? ""))
    .join("")
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}
