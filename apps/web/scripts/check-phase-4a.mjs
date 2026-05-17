import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/geo-analysis.ts",
  "src/components/AnalysisGapList.vue",
  "src/components/AnalysisPromptSuggestions.vue",
  "src/components/CreateAnalysisContentTaskPanel.vue",
  "src/components/ConvertPromptsPanel.vue",
  "src/components/GeoAnalysisStatusTag.vue",
  "src/components/GeoAnalysisTaskDetailDrawer.vue",
  "src/components/GeoAnalysisTaskFilters.vue",
  "src/components/GeoAnalysisTaskFormDialog.vue",
  "src/components/GeoModelResultsTable.vue",
  "src/config/geo-analysis-options.ts",
  "src/views/GeoAnalysisView.vue"
];

const apiRequiredSnippets = [
  "getGeoAnalysisTasks",
  "createGeoAnalysisTask",
  "getGeoAnalysisTask",
  "updateGeoAnalysisTask",
  "runGeoAnalysisTask",
  "convertAnalysisPrompts",
  "createAnalysisContentTask",
  "GeoAnalysisTask",
  "GeoModelResult",
  "ConvertAnalysisPromptsResult",
  "/api/geo-analysis-tasks",
  "/run",
  "/convert-prompts",
  "/create-content-task"
];

const pageRequiredSnippets = [
  "GEO 分析",
  "诊断结果用于辅助判断",
  "品牌覆盖",
  "竞品占位",
  "GeoAnalysisTaskFilters",
  "GeoAnalysisTaskFormDialog",
  "GeoAnalysisTaskDetailDrawer",
  "GeoAnalysisStatusTag",
  "运行诊断",
  "转入提示词库",
  "创建内容任务",
  "提示词缺口",
  "知识库缺口",
  "内容补齐方向"
];

const analysisFields = [
  "name",
  "brandName",
  "websiteUrl",
  "productLine",
  "baseWords",
  "targetModels",
  "status",
  "summary",
  "contentGaps",
  "knowledgeGaps",
  "promptSuggestions",
  "modelResults",
  "brandMentioned",
  "brandRecommended",
  "rankingPosition",
  "citedOfficialSite",
  "competitors",
  "rawAnswer",
  "selectedPromptTexts",
  "createdItems",
  "skippedItems",
  "knowledgeBaseId",
  "instructionTemplateId",
  "geoPromptIds"
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

const apiSource = await readSource("src/api/geo-analysis.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `GEO analysis API wrapper missing ${snippet}`);
}

const pageSource = (
  await Promise.all(
    requiredFiles
      .filter((file) => file.endsWith(".vue") || file.endsWith("geo-analysis-options.ts"))
      .map((file) => readSource(file))
  )
).join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `GEO analysis page missing ${snippet}`);
}

for (const field of analysisFields) {
  assert(pageSource.includes(field), `GEO analysis page missing field ${field}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(
  routesSource.includes("GeoAnalysisView"),
  "Router must use GeoAnalysisView for /geo-analysis"
);

const mvpScriptSource = await readSource("scripts/check-frontend-mvp.mjs");
assert(
  !mvpScriptSource.includes("待前端实现"),
  "Frontend MVP smoke check should no longer require /geo-analysis pending text"
);

process.stdout.write("Phase 4A GEO analysis frontend check passed\n");
