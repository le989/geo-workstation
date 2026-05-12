import type { GeoPrompt, ModelInclusionRecord } from "@prisma/client";

export type ModelInclusionRecordForCsv = ModelInclusionRecord & {
  geoPrompt: GeoPrompt;
};

const CSV_HEADERS = [
  "id",
  "geoPromptId",
  "promptText",
  "promptType",
  "productLine",
  "model",
  "checkedAt",
  "brandMentioned",
  "brandRecommended",
  "rankingPosition",
  "citedOfficialSite",
  "answerSummary",
  "competitors",
  "recordMethod",
  "createdAt"
];

export function buildModelInclusionRecordsCsv(records: ModelInclusionRecordForCsv[]): string {
  const rows = records.map((record) => [
    record.id,
    record.geoPromptId,
    record.geoPrompt.promptText,
    record.geoPrompt.type,
    record.geoPrompt.productLine ?? "",
    record.model,
    record.checkedAt.toISOString(),
    String(record.brandMentioned),
    String(record.brandRecommended),
    record.rankingPosition?.toString() ?? "",
    String(record.citedOfficialSite),
    record.answerSummary ?? "",
    jsonArrayToCsvCell(record.competitors),
    record.recordMethod,
    record.createdAt.toISOString()
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function jsonArrayToCsvCell(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value.map((item) => String(item)).join(";");
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
