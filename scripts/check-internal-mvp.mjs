import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredDocs = [
  "AGENTS.md",
  "README.md",
  "docs/specs/geo-marketing-platform-spec.md",
  "docs/api/backend-api.md",
  "docs/api/geo-mvp-flow.md",
  "docs/frontend/frontend-mvp-guide.md",
  "docs/demo/internal-demo-guide.md",
  "docs/demo/mvp-feature-checklist.md",
  "docs/demo/demo-data-notes.md"
];

const requiredFrontendFiles = [
  "apps/web/src/views/LoginView.vue",
  "apps/web/src/views/DashboardView.vue",
  "apps/web/src/views/GeoAnalysisView.vue",
  "apps/web/src/views/GeoPromptsView.vue",
  "apps/web/src/views/ExpansionView.vue",
  "apps/web/src/views/KnowledgeBasesView.vue",
  "apps/web/src/views/InstructionTemplatesView.vue",
  "apps/web/src/views/ContentTasksView.vue",
  "apps/web/src/views/ModelInclusionRecordsView.vue",
  "apps/web/src/views/ReportsView.vue",
  "apps/web/scripts/check-frontend-mvp.mjs",
  "apps/web/scripts/check-phase-4d.mjs",
  "apps/web/scripts/check-phase-4a.mjs"
];

const requiredApiDocsSnippets = [
  "Auth",
  "GEO Analysis",
  "GEO Prompts",
  "GEO Expansion",
  "GEO Knowledge Bases",
  "GEO Content",
  "Model Inclusion Records",
  "GEO Reports"
];

const requiredReadmeSnippets = [
  "internal-mvp-v0.2",
  "内部演示版 MVP",
  "docs/demo/internal-demo-guide.md",
  "pnpm smoke:api",
  "pnpm test:web-mvp",
  "pnpm test:web-auth",
  "GEO 分析",
  "登录和简单权限",
  "不做全自动外部 AI 检测",
  "openai_compatible"
];

const requiredDemoSnippets = [
  "推荐演示顺序",
  "Mock 能力",
  "真实入库能力",
  "暂未实现",
  "/geo-content",
  "/content-tasks",
  "/geo-reports",
  "/reports",
  "后端未启动",
  "页面没有数据",
  "当前已知限制",
  "如何重置本地数据库"
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

for (const file of [...requiredDocs, ...requiredFrontendFiles]) {
  await access(path.join(repoRoot, file));
}

const packageJson = JSON.parse(await read("package.json"));
assert(packageJson.scripts["smoke:api"], "package.json must include smoke:api");
assert(packageJson.scripts["test:web-mvp"], "package.json must include test:web-mvp");
assert(packageJson.scripts["test:web-auth"], "package.json must include test:web-auth");
assert(packageJson.scripts["test:auth"], "package.json must include test:auth");
assert(
  packageJson.scripts["test:web-geo-analysis"],
  "package.json must include test:web-geo-analysis"
);
assert(packageJson.scripts["check:internal-mvp"], "package.json must include check:internal-mvp");

const readme = await read("README.md");
for (const snippet of requiredReadmeSnippets) {
  assert(readme.includes(snippet), `README missing ${snippet}`);
}
assert(!readme.includes("/geo-analysis`：待前端实现"), "README must not mark GEO 分析 as pending");

const backendApi = await read("docs/api/backend-api.md");
for (const snippet of requiredApiDocsSnippets) {
  assert(backendApi.includes(snippet), `backend-api.md missing ${snippet}`);
}

const frontendGuide = await read("docs/frontend/frontend-mvp-guide.md");
assert(frontendGuide.includes("/login"), "frontend guide must include login page");
assert(frontendGuide.includes("退出登录"), "frontend guide must include logout behavior");
assert(frontendGuide.includes("/geo-analysis"), "frontend guide must include GEO analysis page");
assert(
  !frontendGuide.includes("前端页面仍为待实现占位"),
  "frontend guide must not mark GEO analysis as pending"
);

const demoDocs = [
  await read("docs/demo/internal-demo-guide.md"),
  await read("docs/demo/mvp-feature-checklist.md"),
  await read("docs/demo/demo-data-notes.md")
].join("\n");

for (const snippet of requiredDemoSnippets) {
  assert(demoDocs.includes(snippet), `demo docs missing ${snippet}`);
}

process.stdout.write(
  [
    "Internal MVP check passed",
    "Version: internal-mvp-v0.2",
    "Pages: Login, Dashboard, GEO Analysis, GEO Prompts, Expansion, Knowledge Bases, Instructions, Content, Model Inclusion, Reports",
    "Auth: JWT Bearer login, protected API routes, current user display, logout",
    "Mock: GEO analysis; AI expansion and GEO content default to mock",
    "AI Provider: openai_compatible is available through backend environment variables",
    "Real persistence: prompts, knowledge, instructions, content tasks/items, model inclusion records, reports"
  ].join("\n") + "\n"
);
