import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/content.ts",
  "src/components/ContentGenerationTypeTag.vue",
  "src/components/ContentItemFormDialog.vue",
  "src/components/ContentItemTable.vue",
  "src/components/ContentTaskDetailDrawer.vue",
  "src/components/ContentTaskFilters.vue",
  "src/components/ContentTaskFormDialog.vue",
  "src/components/ContentTaskStatusTag.vue",
  "src/components/GeoPromptSelector.vue",
  "src/config/content-options.ts",
  "src/views/ContentTasksView.vue"
];

const apiRequiredSnippets = [
  "getContentTasks",
  "createContentTask",
  "getContentTask",
  "retryContentTask",
  "getContentItems",
  "updateContentItem",
  "deleteContentItem",
  "exportContentItem",
  "/api/content-tasks",
  "/api/content-items",
  "/retry",
  "/export"
];

const pageRequiredSnippets = [
  "GEO 内容生成",
  "provider",
  "真实 AI 接口",
  "真实 AI 接口会消耗接口额度",
  "API Key 由后端",
  "ContentTaskFilters",
  "ContentTaskFormDialog",
  "ContentTaskDetailDrawer",
  "ContentItemTable",
  "ContentItemFormDialog",
  "GeoPromptSelector",
  "导出 Markdown",
  "重试不会重复生成已成功内容项",
  "移除该内容项"
];

const contentFields = [
  "name",
  "productLine",
  "generationType",
  "targetModel",
  "status",
  "provider",
  "model",
  "geoPromptIds",
  "knowledgeBaseId",
  "instructionTemplateId",
  "title",
  "body",
  "geoOptimizationPoints",
  "suggestedPublishChannel",
  "aiCallLogs"
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

const apiSource = await readSource("src/api/content.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `Content API wrapper missing ${snippet}`);
}

const pageSource = [
  await readSource("src/views/ContentTasksView.vue"),
  await readSource("src/components/ContentGenerationTypeTag.vue"),
  await readSource("src/components/ContentItemFormDialog.vue"),
  await readSource("src/components/ContentItemTable.vue"),
  await readSource("src/components/ContentTaskDetailDrawer.vue"),
  await readSource("src/components/ContentTaskFilters.vue"),
  await readSource("src/components/ContentTaskFormDialog.vue"),
  await readSource("src/components/ContentTaskStatusTag.vue"),
  await readSource("src/components/GeoPromptSelector.vue")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Content tasks page missing ${snippet}`);
}

for (const field of contentFields) {
  assert(pageSource.includes(field), `Content tasks page missing field ${field}`);
}

assert(!pageSource.includes("API Key 输入"), "Content tasks page must not expose API Key inputs");

const routesSource = await readSource("src/router/routes.ts");
assert(
  routesSource.includes("ContentTasksView"),
  "Router must use ContentTasksView for /content-tasks"
);

process.stdout.write("Phase 3G content tasks check passed\n");
