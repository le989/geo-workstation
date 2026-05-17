import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/reports.ts",
  "src/components/ReportFilters.vue",
  "src/components/ReportMetricCard.vue",
  "src/components/ReportDistributionTable.vue",
  "src/components/PromptCoveragePanel.vue",
  "src/components/ModelCoveragePanel.vue",
  "src/components/GeoHitSummaryPanel.vue",
  "src/components/ContentCoveragePanel.vue",
  "src/components/KnowledgeCoveragePanel.vue",
  "src/components/OptimizationSuggestionsPanel.vue",
  "src/components/ReportExportButton.vue",
  "src/views/ReportsView.vue"
];

const apiRequiredSnippets = [
  "getGeoOverview",
  "getPromptCoverage",
  "getModelCoverage",
  "getGeoHitSummary",
  "getContentCoverage",
  "getKnowledgeCoverage",
  "getOptimizationSuggestions",
  "exportReport",
  "GeoOverviewReport",
  "PromptCoverageReport",
  "ModelCoverageReport",
  "GeoHitSummaryReport",
  "ContentCoverageReport",
  "KnowledgeCoverageReport",
  "OptimizationSuggestion",
  "ReportExportType",
  "ReportQuery",
  "/api/reports/geo-overview",
  "/api/reports/prompt-coverage",
  "/api/reports/model-coverage",
  "/api/reports/geo-hit-summary",
  "/api/reports/content-coverage",
  "/api/reports/knowledge-coverage",
  "/api/reports/optimization-suggestions",
  "/api/reports/export"
];

const pageRequiredSnippets = [
  "GEO 报表",
  "ReportFilters",
  "PromptCoveragePanel",
  "ModelCoveragePanel",
  "GeoHitSummaryPanel",
  "ContentCoveragePanel",
  "KnowledgeCoveragePanel",
  "OptimizationSuggestionsPanel",
  "ReportExportButton",
  "geo_overview",
  "prompt_coverage",
  "model_coverage",
  "geo_hit_summary",
  "content_coverage",
  "knowledge_coverage",
  "optimization_suggestions",
  "总览",
  "提示词覆盖",
  "模型覆盖",
  "GEO 命中汇总",
  "内容覆盖",
  "知识库覆盖",
  "优化建议",
  "品牌推荐率",
  "官网引用率",
  "待优化问题",
  "内容产出量",
  "报表筛选",
  "高级筛选",
  "导出当前报表",
  "资产覆盖详情",
  "提示词矩阵",
  "统计口径与排查信息",
  "查看完整提示词矩阵",
  "默认按每个提示词 + 平台 + 入口的最新检测结果统计",
  "本轮结论",
  "辅助指标，不作为主要 GEO 命中判断",
  "当前仅展示前 20 条"
];

const pageForbiddenSnippets = ["默认排除测试提示词", "测试阶段提示", "Clean-Final", "调试参考"];

const reportFields = [
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
  "modelInclusionRecordCount",
  "brandMentionedCount",
  "brandRecommendedCount",
  "brandMentionRate",
  "brandRecommendRate",
  "citedOfficialSiteCount",
  "citedOfficialSiteRate",
  "uncoveredTrackedPromptCount",
  "failedContentTaskCount",
  "totalPrompts",
  "trackedPrompts",
  "promptsWithRecords",
  "promptsWithoutRecords",
  "coverageRate",
  "byType",
  "byProductLine",
  "byUserIntent",
  "byLatestCoverageStatus",
  "highPriorityUncoveredPrompts",
  "modelDistribution",
  "mentionedByModel",
  "recommendedByModel",
  "citedOfficialSiteByModel",
  "brandMentionRateByModel",
  "brandRecommendRateByModel",
  "topRecommendedPrompts",
  "notMentionedPrompts",
  "promptCount",
  "checkedPromptCount",
  "latestRecordCount",
  "platformComparison",
  "entryPointComparison",
  "promptMatrix",
  "optimizationSuggestions",
  "contentItemsByGenerationType",
  "contentItemsByProductLine",
  "contentItemsByStatus",
  "highPriorityPromptsWithoutContent",
  "chunksByMaterialType",
  "filesByParseStatus",
  "productLinesWithoutKnowledge"
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

const apiSource = await readSource("src/api/reports.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `Reports API wrapper missing ${snippet}`);
}

const pageSource = [
  await readSource("src/views/ReportsView.vue"),
  await readSource("src/components/ReportFilters.vue"),
  await readSource("src/components/ReportMetricCard.vue"),
  await readSource("src/components/ReportDistributionTable.vue"),
  await readSource("src/components/PromptCoveragePanel.vue"),
  await readSource("src/components/ModelCoveragePanel.vue"),
  await readSource("src/components/GeoHitSummaryPanel.vue"),
  await readSource("src/components/ContentCoveragePanel.vue"),
  await readSource("src/components/KnowledgeCoveragePanel.vue"),
  await readSource("src/components/OptimizationSuggestionsPanel.vue"),
  await readSource("src/components/ReportExportButton.vue")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Reports page missing ${snippet}`);
}

for (const snippet of pageForbiddenSnippets) {
  assert(!pageSource.includes(snippet), `Reports page must not include ${snippet}`);
}

for (const field of reportFields) {
  assert(pageSource.includes(field), `Reports page missing report field ${field}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(routesSource.includes("/geo-reports"), "Router must expose /geo-reports");
assert(routesSource.includes('path: "reports"'), "Router must keep /reports compatibility");
assert(routesSource.includes("ReportsView"), "Router must use ReportsView for reports routes");

process.stdout.write("Phase 3I GEO reports check passed\n");
