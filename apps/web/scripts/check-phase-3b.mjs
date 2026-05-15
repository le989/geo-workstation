import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/reports.ts",
  "src/components/CapabilityBoundaryCard.vue",
  "src/components/DashboardSection.vue",
  "src/components/MetricCard.vue",
  "src/components/OptimizationSuggestionList.vue",
  "src/components/QuickActionGrid.vue"
];

const dashboardRequiredText = [
  "getGeoOverview",
  "getOptimizationSuggestions",
  "复盘提示词、内容、知识库和模型覆盖",
  "后端未连接，可先启动 API 服务",
  "当前暂无明显待优化项",
  "/geo-prompts",
  "/knowledge-bases",
  "/content-tasks",
  "/model-inclusion-records",
  "/reports"
];

const overviewFields = [
  "promptTotal",
  "basePromptCount",
  "distilledPromptCount",
  "brandPromptCount",
  "scenePromptCount",
  "trackedPromptCount",
  "highPriorityPromptCount",
  "knowledgeBaseCount",
  "knowledgeChunkCount",
  "contentTaskCount",
  "contentItemCount",
  "failedContentTaskCount",
  "modelInclusionRecordCount",
  "brandMentionedCount",
  "brandRecommendedCount",
  "brandMentionRate",
  "brandRecommendRate",
  "citedOfficialSiteCount",
  "citedOfficialSiteRate",
  "uncoveredTrackedPromptCount"
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

const reportsSource = await readSource("src/api/reports.ts");
assert(reportsSource.includes("/api/reports/geo-overview"), "Missing geo overview API path");
assert(
  reportsSource.includes("/api/reports/optimization-suggestions"),
  "Missing optimization suggestions API path"
);
assert(reportsSource.includes("GeoOverviewReport"), "Missing GeoOverviewReport type");
assert(reportsSource.includes("OptimizationSuggestion"), "Missing OptimizationSuggestion type");
assert(
  reportsSource.includes("OptimizationSuggestionsResponse"),
  "Missing OptimizationSuggestionsResponse type"
);

for (const field of overviewFields) {
  assert(reportsSource.includes(field), `Missing overview field ${field}`);
}

const dashboardSource = [
  await readSource("src/views/DashboardView.vue"),
  await readSource("src/components/OptimizationSuggestionList.vue"),
  await readSource("src/components/QuickActionGrid.vue"),
  await readSource("src/components/CapabilityBoundaryCard.vue")
].join("\n");
for (const snippet of dashboardRequiredText) {
  assert(dashboardSource.includes(snippet), `Dashboard missing required text: ${snippet}`);
}

process.stdout.write("Phase 3B dashboard check passed\n");
