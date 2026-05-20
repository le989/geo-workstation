import { basename, extname } from "node:path";
import * as XLSX from "xlsx";
import type { ParsedKnowledgeChunk } from "./parse-text-file";

const MIN_CHUNK_CONTENT_LENGTH = 10;

export function parseExcelFileContent(buffer: Buffer, fileName: string): ParsedKnowledgeChunk[] {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, {
      type: "buffer"
    });
  } catch (error) {
    throw new Error(`Excel parse failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  const chunks: ParsedKnowledgeChunk[] = [];
  const baseTitle = basename(fileName, extname(fileName));

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      blankrows: false,
      defval: "",
      header: 1
    });

    chunks.push(...parseRows(rows, `${baseTitle} ${sheetName}`));
  }

  return chunks;
}

function parseRows(rows: string[][], baseTitle: string): ParsedKnowledgeChunk[] {
  const nonEmptyRows = rows
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (nonEmptyRows.length === 0) {
    return [];
  }

  const headers = nonEmptyRows[0].map((header) => header.trim());
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const titleIndex = normalizedHeaders.indexOf("title");
  const contentIndex = normalizedHeaders.indexOf("content");

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
