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
  "platform",
  "entryPoint",
  "detectionMethod",
  "deviceType",
  "isWebSearchEnabled",
  "isLoggedIn",
  "checkedAt",
  "brandMentioned",
  "brandRecommended",
  "rankingPosition",
  "citedOfficialSite",
  "answerSummary",
  "citedContentAsset",
  "competitorMentioned",
  "hitLevel",
  "rawAnswer",
  "citations",
  "searchResults",
  "screenshotPath",
  "errorMessage",
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
    record.platform ?? "",
    record.entryPoint ?? "",
    record.detectionMethod ?? "",
    record.deviceType ?? "",
    String(record.isWebSearchEnabled),
    String(record.isLoggedIn),
    record.checkedAt.toISOString(),
    String(record.brandMentioned),
    String(record.brandRecommended),
    record.rankingPosition?.toString() ?? "",
    String(record.citedOfficialSite),
    record.answerSummary ?? "",
    String(record.citedContentAsset),
    String(record.competitorMentioned),
    record.hitLevel ?? "",
    record.rawAnswer ?? "",
    jsonValueToCsvCell(record.citations),
    jsonValueToCsvCell(record.searchResults),
    record.screenshotPath ?? "",
    record.errorMessage ?? "",
    jsonArrayToCsvCell(record.competitors),
    record.recordMethod,
    record.createdAt.toISOString()
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function jsonValueToCsvCell(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return JSON.stringify(value);
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
