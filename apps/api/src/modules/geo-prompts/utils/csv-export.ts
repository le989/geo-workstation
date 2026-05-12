import type { GeoPromptResponse } from "../geo-prompts.service";

const GEO_PROMPT_CSV_FIELDS: Array<keyof GeoPromptResponse> = [
  "id",
  "type",
  "baseWord",
  "promptText",
  "productLine",
  "scenario",
  "userIntent",
  "priority",
  "targetModels",
  "source",
  "trackEnabled",
  "latestCoverageStatus",
  "createdAt",
  "updatedAt"
];

export function buildGeoPromptsCsv(items: GeoPromptResponse[]): string {
  const header = GEO_PROMPT_CSV_FIELDS.join(",");
  const rows = items.map((item) =>
    GEO_PROMPT_CSV_FIELDS.map((field) => escapeCsvValue(item[field])).join(",")
  );

  return [header, ...rows].join("\n");
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const serialized = serializeCsvValue(value);

  if (/[",\n\r]/.test(serialized)) {
    return `"${serialized.replaceAll('"', '""')}"`;
  }

  return serialized;
}

function serializeCsvValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return JSON.stringify(value);
  }

  return String(value);
}
