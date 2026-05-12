import { basename, extname } from "node:path";
import type { ParsedKnowledgeChunk } from "./parse-text-file";

const MIN_CHUNK_CONTENT_LENGTH = 10;

export function parseCsvFileContent(content: string, fileName: string): ParsedKnowledgeChunk[] {
  let rows: string[][];

  try {
    rows = parseCsvRows(content);
  } catch (error) {
    throw new Error(
      `CSV parse failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim().length > 0));

  if (nonEmptyRows.length === 0) {
    return [];
  }

  const headers = nonEmptyRows[0]?.map((header) => header.trim()) ?? [];
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const titleIndex = normalizedHeaders.indexOf("title");
  const contentIndex = normalizedHeaders.indexOf("content");
  const baseTitle = basename(fileName, extname(fileName));

  if (titleIndex >= 0 && contentIndex >= 0) {
    return nonEmptyRows
      .slice(1)
      .map((row, index) => ({
        title: row[titleIndex]?.trim() || `${baseTitle} row ${index + 1}`,
        content: row[contentIndex]?.trim() ?? ""
      }))
      .filter((chunk) => chunk.content.length >= MIN_CHUNK_CONTENT_LENGTH);
  }

  return nonEmptyRows.slice(1).flatMap((row, index) => {
    const firstColumn = row[0]?.trim();
    const contentText = row
      .map((cell, cellIndex) => {
        const header = headers[cellIndex]?.trim();
        const value = cell.trim();
        return header && value ? `${header}: ${value}` : value;
      })
      .filter(Boolean)
      .join("; ");

    if (contentText.length < MIN_CHUNK_CONTENT_LENGTH) {
      return [];
    }

    return [
      {
        title: firstColumn || `${baseTitle} row ${index + 1}`,
        content: contentText
      }
    ];
  });
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new Error("unterminated quoted field");
  }

  row.push(cell);
  rows.push(row);

  return rows;
}
