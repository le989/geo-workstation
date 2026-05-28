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
  "src/components/PublishFormatPanel.vue",
  "src/config/content-options.ts",
  "src/views/ContentTasksView.vue"
];

const apiRequiredSnippets = [
  "getContentTasks",
  "createContentTask",
  "getContentTask",
  "retryContentTask",
  "archiveContentTask",
  "getContentItems",
  "updateContentItem",
  "deleteContentItem",
  "exportContentItem",
  "qualityCheckContentItem",
  "fixRiskWordsAndRecheckContentItem",
  "optimizeContentItemForPublish",
  "formatContentItemForPublish",
  "/api/content-tasks",
  "/api/content-items",
  "/archive",
  "/quality-check",
  "/risk-word-fix",
  "/optimize-for-publish",
  "/format-for-publish",
  "/retry",
  "/export"
];

const pageRequiredSnippets = [
  "发布文章工作台",
  "每天只需要 3 步",
  "新建发布文章",
  "文章主题",
  "选择资料",
  "推荐资料卡片",
  "最近可引用资料优先展示",
  "待处理",
  "生成中",
  "可复制",
  "需人工检查",
  "生成文章",
  "自动修复风险词",
  "复制草稿继续修改",
  "重新生成文章",
  "重新生成会消耗 AI token",
  "复制富文本",
  "复制成功，可以粘贴到发布平台",
  "当前浏览器不支持富文本剪贴板",
  "打开文章",
  "这篇文章已通过发布检查，可以复制发布稿",
  "这篇文章暂不建议直接发布",
  "文章正文",
  "资料来源",
  "高级信息（负责人查看）",
  "发布检查",
  "指定资料",
  "按产品线",
  "全部可引用资料",
  "ContentTaskFilters",
  "ContentTaskFormDialog",
  "ContentTaskDetailDrawer",
  "ContentItemTable",
  "ContentItemFormDialog",
  "PublishFormatPanel",
  "助理只需生成文章、检查结果并复制发布稿；高级配置由负责人维护。",
  "article-workbench-list",
  "assistant-status-tabs",
  "assistant-article-card",
  "getAssistantArticleTitle",
  "cleanAssistantTaskName",
  "已通过检查，可以复制",
  "发现问题，先修复或人工修改",
  "primaryArticleBlocks",
  "renderInlineArticleMarkdown",
  "导出评审稿",
  "导出发布稿",
  "导出发布稿 TXT",
  "归档任务",
  "重试不会重复生成已成功文章",
  "移除该文章内容"
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
  await readSource("src/components/GeoPromptSelector.vue"),
  await readSource("src/components/PublishFormatPanel.vue")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Content tasks page missing ${snippet}`);
}

const contentTasksViewSource = await readSource("src/views/ContentTasksView.vue");
const contentTaskDetailDrawerSource = await readSource("src/components/ContentTaskDetailDrawer.vue");
const contentTaskFormDialogSource = await readSource("src/components/ContentTaskFormDialog.vue");

// 复制发布稿必须复用后端干净发布稿导出，避免继续复制历史 publishPackage。
assert(
  contentTaskDetailDrawerSource.includes("copyPublishPackage: [item: ContentItem]"),
  "Content task drawer must emit copyPublishPackage instead of local publishPackage markdown"
);
assert(
  contentTaskDetailDrawerSource.includes("emit('copyPublishPackage', item)"),
  "Content task drawer copy button must delegate copy action to the parent view"
);
assert(
  contentTasksViewSource.includes("@copy-publish-package=\"handleCopyPublishPackage\""),
  "Content tasks view must handle copyPublishPackage event"
);
assert(
  /const handleCopyPublishPackage = async[\s\S]*exportContentItem\(item\.id,\s*\{[\s\S]*type:\s*"publish"[\s\S]*format:\s*"markdown"/.test(
    contentTasksViewSource
  ),
  "Copy publish action must request /export?type=publish&format=markdown"
);
assert(
  contentTasksViewSource.includes("ClipboardItem") &&
    contentTasksViewSource.includes("text/html") &&
    contentTasksViewSource.includes("text/plain"),
  "Copy rich text action must try text/html and include text/plain fallback"
);
assert(
  contentTaskFormDialogSource.includes('officialCitationStatus: "citable"') &&
    contentTaskFormDialogSource.includes('applicableModule: "geo-content"'),
  "Assistant material search must only request approved citable GEO content materials"
);
assert(
  !contentTaskFormDialogSource.includes("GeoPromptSelector"),
  "Assistant create dialog must not expose the GEO prompt selector"
);
assert(
  !contentTaskFormDialogSource.includes("providerSafetyText") &&
    !contentTaskFormDialogSource.includes("contentGenerationModeOptions"),
  "Assistant create dialog must not expose provider or model controls"
);

for (const field of contentFields) {
  assert(pageSource.includes(field), `Content tasks page missing field ${field}`);
}

assert(!pageSource.includes("API Key 输入"), "Content tasks page must not expose API Key inputs");

const routesSource = await readSource("src/router/routes.ts");
assert(
  routesSource.includes('path: "content-tasks"') && routesSource.includes('"/geo-content"'),
  "Router must expose /geo-content and keep /content-tasks compatibility"
);

process.stdout.write("Phase 3G content tasks check passed\n");
