import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/health.ts",
  "src/api/http.ts",
  "src/api/types.ts",
  "src/layouts/AppLayout.vue",
  "src/router/index.ts",
  "src/router/routes.ts",
  "src/stores/app.ts"
];

const requiredRoutes = [
  "/dashboard",
  "/geo-analysis",
  "/geo-prompts",
  "/expansion",
  "/knowledge-bases",
  "/instruction-templates",
  "/geo-content",
  "/content-tasks",
  "/model-inclusion-records",
  "/reports",
  "/settings"
];

const requiredMenuLabels = [
  "工作台",
  "GEO 诊断",
  "提示词库",
  "AI 拓词",
  "知识库",
  "指令模板",
  "内容生成",
  "AI 收录记录",
  "数据报表",
  "系统设置"
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

const routeSource = await readSource("src/router/routes.ts");
for (const routePath of requiredRoutes) {
  const hasRoute =
    routeSource.includes(routePath) ||
    (routePath === "/content-tasks" && routeSource.includes('path: "content-tasks"'));

  assert(hasRoute, `Missing route ${routePath}`);
}

const navigationSource = await readSource("src/config/navigation.ts");
for (const label of requiredMenuLabels) {
  assert(navigationSource.includes(label), `Missing menu label ${label}`);
}

const httpSource = await readSource("src/api/http.ts");
assert(httpSource.includes("VITE_API_BASE_URL"), "HTTP client must read VITE_API_BASE_URL");
assert(
  httpSource.includes("http://localhost:3000"),
  "HTTP client must default to http://localhost:3000"
);

const typesSource = await readSource("src/api/types.ts");
assert(typesSource.includes("ApiResponse"), "Missing ApiResponse type");

const healthSource = await readSource("src/api/health.ts");
assert(healthSource.includes("/health"), "Health API must call /health");

process.stdout.write("Phase 3A frontend framework check passed\n");
