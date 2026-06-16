import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readSource = (relativePath) => readFile(path.join(webRoot, relativePath), "utf8");

const requiredFiles = [
  "src/config/navigation.ts",
  "src/layouts/AppLayout.vue"
];

for (const file of requiredFiles) {
  await access(path.join(webRoot, file));
}

const navigationSource = await readSource("src/config/navigation.ts");
const layoutSource = await readSource("src/layouts/AppLayout.vue");
const sidebarSource = `${navigationSource}\n${layoutSource}`;

for (const groupLabel of [
  "核心工作流",
  "内容与发布",
  "知识与指令",
  "GEO 诊断与复盘",
  "辅助工具",
  "统计与日志",
  "系统管理"
]) {
  assert(sidebarSource.includes(groupLabel), `Sidebar IA missing group label ${groupLabel}`);
}

for (const menuLabel of [
  "工作台",
  "发布文章工作台",
  "AI 模型覆盖记录",
  "知识库",
  "提示词库",
  "指令库",
  "GEO 诊断",
  "GEO 报表",
  "引用证据中心",
  "竞品占位原因",
  "AI 拓词",
  "售后问答",
  "使用统计",
  "日志与审计",
  "用户管理",
  "部门管理",
  "系统设置",
  "使用教程"
]) {
  assert(sidebarSource.includes(menuLabel), `Sidebar IA missing menu label ${menuLabel}`);
}

for (const routePath of [
  "/dashboard",
  "/geo-content",
  "/model-inclusion-records",
  "/knowledge-bases",
  "/geo-prompts",
  "/instruction-templates",
  "/geo-analysis",
  "/geo-reports",
  "/evidence-citations",
  "/competitor-occupancy",
  "/expansion",
  "/aftersales-qa",
  "/usage-analytics",
  "/operation-logs",
  "/users",
  "/departments",
  "/settings",
  "/help"
]) {
  assert(navigationSource.includes(`path: "${routePath}"`), `Navigation path changed: ${routePath}`);
}

for (const helperSnippet of [
  "visiblePrimaryNavigationGroups",
  "visibleSupportNavigationGroups",
  "isSupportGroupOpen",
  "sidebar-help-slot"
]) {
  assert(layoutSource.includes(helperSnippet), `Sidebar IA layout missing ${helperSnippet}`);
}

assert(
  !navigationSource.includes("AI 用量统计") && !layoutSource.includes("AI 用量统计"),
  "AI 用量统计 must stay inside /usage-analytics and not become a sidebar item"
);

for (const forbiddenEntry of ["点数账本", "账单", "余额", "发票"]) {
  assert(!sidebarSource.includes(forbiddenEntry), `Sidebar IA must not add financial entry ${forbiddenEntry}`);
}

process.stdout.write("Sidebar navigation IA check passed\n");
