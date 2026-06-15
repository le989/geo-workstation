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
  "/geo-reports",
  "/reports",
  "/settings"
];

const requiredMenuLabels = [
  "工作台",
  "GEO 诊断",
  "提示词库",
  "AI 拓词",
  "知识库",
  "指令库",
  "发布文章工作台",
  "AI 模型覆盖记录",
  "GEO 报表",
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
    (routePath === "/content-tasks" && routeSource.includes('path: "content-tasks"')) ||
    (routePath === "/reports" && routeSource.includes('path: "reports"'));

  assert(hasRoute, `Missing route ${routePath}`);
}

const navigationSource = await readSource("src/config/navigation.ts");
for (const label of requiredMenuLabels) {
  assert(navigationSource.includes(label), `Missing menu label ${label}`);
}

const httpSource = await readSource("src/api/http.ts");
assert(httpSource.includes("VITE_API_BASE_URL"), "HTTP client must read VITE_API_BASE_URL");
assert(
  httpSource.includes("DEFAULT_DEV_API_BASE_URL") &&
    httpSource.includes("DEFAULT_PRODUCTION_API_BASE_URL"),
  "HTTP client must split development and production API defaults"
);
assert(
  httpSource.includes("import.meta.env.DEV"),
  "HTTP client must only use localhost as the development fallback"
);

const typesSource = await readSource("src/api/types.ts");
assert(typesSource.includes("ApiResponse"), "Missing ApiResponse type");

const healthSource = await readSource("src/api/health.ts");
assert(healthSource.includes("/health"), "Health API must call /health");

process.stdout.write("Phase 3A frontend framework check passed\n");
