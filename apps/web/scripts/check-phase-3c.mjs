import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/geo-prompts.ts",
  "src/components/GeoPromptBulkImportDialog.vue",
  "src/components/GeoPromptFilters.vue",
  "src/components/GeoPromptFormDialog.vue",
  "src/components/GeoPromptStatusTag.vue",
  "src/components/GeoPromptTypeTag.vue",
  "src/views/GeoPromptsView.vue"
];

const apiRequiredSnippets = [
  "getGeoPrompts",
  "createGeoPrompt",
  "updateGeoPrompt",
  "deleteGeoPrompt",
  "bulkImportGeoPrompts",
  "exportGeoPrompts",
  "/api/geo-prompts",
  "/api/geo-prompts/bulk-import",
  "/api/geo-prompts/export",
  "PaginatedResponse",
  "BulkImportGeoPromptsResult"
];

const pageRequiredSnippets = [
  "提示词策略库",
  "沉淀训练词、蒸馏词、品牌词和场景词",
  "用户会怎么问 AI",
  "新增提示词",
  "批量导入",
  "导出 CSV",
  "/expansion",
  "getGeoPrompts",
  "deleteGeoPrompt",
  "exportGeoPrompts",
  "GeoPromptFormDialog",
  "GeoPromptBulkImportDialog"
];

const tableFields = [
  "promptText",
  "type",
  "baseWord",
  "productLine",
  "scenario",
  "userIntent",
  "priority",
  "trackEnabled",
  "latestCoverageStatus",
  "source",
  "targetModels",
  "createdAt"
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readSource = async (relativePath) => readFile(path.join(webRoot, relativePath), "utf8");

for (const file of requiredFiles) {
  await access(path.join(webRoot, file));
}

const apiSource = await readSource("src/api/geo-prompts.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `API wrapper missing ${snippet}`);
}

const pageSource = [
  await readSource("src/views/GeoPromptsView.vue"),
  await readSource("src/components/GeoPromptFilters.vue"),
  await readSource("src/components/GeoPromptFormDialog.vue"),
  await readSource("src/components/GeoPromptBulkImportDialog.vue")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Geo prompts page missing ${snippet}`);
}

for (const field of tableFields) {
  assert(pageSource.includes(field), `Geo prompts table/form missing ${field}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(routesSource.includes("GeoPromptsView"), "Router must use GeoPromptsView for /geo-prompts");

process.stdout.write("Phase 3C geo prompts check passed\n");
