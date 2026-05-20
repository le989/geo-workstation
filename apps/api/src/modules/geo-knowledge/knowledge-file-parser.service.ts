import { access, readFile } from "node:fs/promises";
import { Injectable } from "@nestjs/common";
import { parseCsvFileContent } from "./utils/parse-csv-file";
import { parseDocxFileContent } from "./utils/parse-docx-file";
import { parseExcelFileContent } from "./utils/parse-excel-file";
import { parseMarkdownFileContent } from "./utils/parse-markdown-file";
import { parseTextFileContent, type ParsedKnowledgeChunk } from "./utils/parse-text-file";

export const KNOWLEDGE_FILE_MISSING_ERROR = "Stored GEO knowledge file does not exist.";
export const KNOWLEDGE_FILE_READ_ERROR = "Stored GEO knowledge file cannot be read.";

export type ParseKnowledgeFileInput = {
  fileName: string;
  fileType: string;
  storagePath: string;
};

@Injectable()
export class KnowledgeFileParserService {
  async parse(input: ParseKnowledgeFileInput): Promise<ParsedKnowledgeChunk[]> {
    await this.assertFileExists(input.storagePath);
    const chunks = await this.parseStoredFile(input);

    if (chunks.length === 0) {
      throw new Error("No valid GEO knowledge chunks parsed from file.");
    }

    return chunks;
  }

  private async parseStoredFile(input: ParseKnowledgeFileInput): Promise<ParsedKnowledgeChunk[]> {
    if (this.isBinaryOfficeFile(input.fileType)) {
      const buffer = await this.readFileBuffer(input.storagePath);
      return this.parseBinaryContent(buffer, input);
    }

    const content = await this.readFileContent(input.storagePath);
    return this.parseTextContent(content, input);
  }

  private parseTextContent(
    content: string,
    input: ParseKnowledgeFileInput
  ): ParsedKnowledgeChunk[] {
    switch (input.fileType) {
      case "txt":
        return parseTextFileContent(content, input.fileName);
      case "md":
        return parseMarkdownFileContent(content, input.fileName);
      case "csv":
        return parseCsvFileContent(content, input.fileName);
      default:
        throw new Error(`Unsupported GEO knowledge file type for parsing: ${input.fileType}`);
    }
  }

  private async parseBinaryContent(
    buffer: Buffer,
    input: ParseKnowledgeFileInput
  ): Promise<ParsedKnowledgeChunk[]> {
    switch (input.fileType) {
      case "xlsx":
      case "xls":
        return parseExcelFileContent(buffer, input.fileName);
      case "docx":
        return parseDocxFileContent(buffer, input.fileName);
      default:
        throw new Error(`Unsupported GEO knowledge file type for parsing: ${input.fileType}`);
    }
  }

  private isBinaryOfficeFile(fileType: string): boolean {
    return fileType === "xlsx" || fileType === "xls" || fileType === "docx";
  }

  private async assertFileExists(storagePath: string): Promise<void> {
    try {
      await access(storagePath);
    } catch {
      throw new Error(KNOWLEDGE_FILE_MISSING_ERROR);
    }
  }

  private async readFileContent(storagePath: string): Promise<string> {
    try {
      return await readFile(storagePath, "utf8");
    } catch {
      throw new Error(KNOWLEDGE_FILE_READ_ERROR);
    }
  }

  private async readFileBuffer(storagePath: string): Promise<Buffer> {
    try {
      return await readFile(storagePath);
    } catch {
      throw new Error(KNOWLEDGE_FILE_READ_ERROR);
    }
  }
}
