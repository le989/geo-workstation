import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/model-inclusion.ts",
  "src/components/ModelInclusionBooleanTag.vue",
  "src/components/ModelInclusionFilters.vue",
  "src/components/ModelInclusionImportDialog.vue",
  "src/components/ModelInclusionRecordFormDialog.vue",
  "src/components/ModelInclusionRecordTable.vue",
  "src/components/ModelInclusionSummaryCards.vue",
  "src/components/RecordMethodTag.vue",
  "src/components/UncoveredPromptsTable.vue",
  "src/config/model-inclusion-options.ts",
  "src/views/ModelInclusionRecordsView.vue"
];

const apiRequiredSnippets = [
  "getModelInclusionRecords",
  "createModelInclusionRecord",
  "importModelInclusionRecords",
  "exportModelInclusionRecords",
  "getUncoveredPrompts",
  "getModelInclusionSummary",
  "/api/model-inclusion-records",
  "/import",
  "/export",
  "/uncovered-prompts",
  "/summary"
];

const pageRequiredSnippets = [
  "模型覆盖记录",
  "GEO 效果复盘",
  "人工录入 / 导入覆盖记录",
  "不做自动检测外部 AI 平台",
  "ModelInclusionSummaryCards",
  "ModelInclusionFilters",
  "ModelInclusionRecordFormDialog",
  "ModelInclusionImportDialog",
  "ModelInclusionRecordTable",
  "UncoveredPromptsTable",
  "导出 CSV",
  "latestCoverageStatus"
];

const modelInclusionFields = [
  "geoPromptId",
  "promptText",
  "model",
  "checkedAt",
  "brandMentioned",
  "brandRecommended",
  "rankingPosition",
  "citedOfficialSite",
  "answerSummary",
  "competitors",
  "recordMethod",
  "totalRecords",
  "brandMentionRate",
  "brandRecommendRate",
  "citedOfficialSiteRate",
  "modelDistribution",
  "productLineDistribution",
  "failedRows"
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

const apiSource = await readSource("src/api/model-inclusion.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `Model inclusion API wrapper missing ${snippet}`);
}

const pageSource = [
  await readSource("src/views/ModelInclusionRecordsView.vue"),
  await readSource("src/components/ModelInclusionBooleanTag.vue"),
  await readSource("src/components/ModelInclusionFilters.vue"),
  await readSource("src/components/ModelInclusionImportDialog.vue"),
  await readSource("src/components/ModelInclusionRecordFormDialog.vue"),
  await readSource("src/components/ModelInclusionRecordTable.vue"),
  await readSource("src/components/ModelInclusionSummaryCards.vue"),
  await readSource("src/components/RecordMethodTag.vue"),
  await readSource("src/components/UncoveredPromptsTable.vue")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Model inclusion page missing ${snippet}`);
}

for (const field of modelInclusionFields) {
  assert(pageSource.includes(field), `Model inclusion page missing field ${field}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(
  routesSource.includes("ModelInclusionRecordsView"),
  "Router must use ModelInclusionRecordsView for /model-inclusion-records"
);

process.stdout.write("Phase 3H model inclusion records check passed\n");
