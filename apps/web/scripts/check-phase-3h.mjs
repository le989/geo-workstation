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
  "src/components/ModelInclusionWebSearchDialog.vue",
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
  "runKimiWebSearchCheck",
  "/api/model-inclusion-records",
  "/web-search-check",
  "/import",
  "/export",
  "/uncovered-prompts",
  "/summary"
];

const pageRequiredSnippets = [
  "模型覆盖记录",
  "GEO 效果复盘",
  "人工录入 / 导入覆盖记录",
  "Kimi Web Search API 联网检测",
  "豆包 / 火山方舟联网搜索",
  "火山方舟 Web Search API 检测",
  "不等同于豆包 App 端真实用户结果",
  "火山方舟 Web Search 可能耗时较长",
  "限制为短回答",
  "不适合生成长篇内容",
  "可能不返回结构化引用来源",
  "PC、移动网页或 App 自动化",
  "ModelInclusionSummaryCards",
  "ModelInclusionFilters",
  "ModelInclusionRecordFormDialog",
  "ModelInclusionImportDialog",
  "ModelInclusionRecordTable",
  "UncoveredPromptsTable",
  "联网检测",
  "Kimi 联网搜索",
  "volcengine_web_search",
  "不是 App 端真实用户结果",
  "会消耗 API 额度",
  "建议先检测少量高优先级提示词",
  "失败原因分类",
  "网络或联网搜索超时，可稍后重试",
  "请检查后端环境变量、账户额度或模型配置",
  "已重试",
  "开始联网检测",
  "导出 CSV",
  "latestCoverageStatus",
  "平台",
  "入口",
  "检测方式",
  "命中等级",
  "联网搜索 API",
  "推荐命中",
  "竞品命中"
];

const modelInclusionFields = [
  "geoPromptId",
  "promptText",
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
  "citedContentAsset",
  "competitorMentioned",
  "hitLevel",
  "rawAnswer",
  "citations",
  "searchResults",
  "screenshotPath",
  "errorMessage",
  "errorCategory",
  "retryCount",
  "answerSummary",
  "competitors",
  "recordMethod",
  "totalRecords",
  "brandMentionRate",
  "brandRecommendRate",
  "citedOfficialSiteRate",
  "hitLevelDistribution",
  "entryPointDistribution",
  "citedContentAssetCount",
  "competitorMentionedCount",
  "competitorMentionRate",
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
  await readSource("src/components/ModelInclusionWebSearchDialog.vue"),
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
