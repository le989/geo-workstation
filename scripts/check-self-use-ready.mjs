import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "docs/operation/self-use-sop.md",
  "docs/operation/real-ai-test-plan.md",
  "docs/operation/quality-notes.md",
  "docs/deployment/env-guide.md",
  "docs/api/backend-api.md",
  "docs/frontend/frontend-mvp-guide.md",
  "README.md",
  ".env.example",
  ".env.production.example",
  "apps/api/src/modules/ai/ai-provider.interface.ts",
  "apps/api/src/modules/ai/ai-provider.service.ts",
  "apps/api/src/modules/ai/providers/openai-compatible.provider.ts",
  "apps/web/src/components/AiExpansionForm.vue",
  "apps/web/src/components/ContentTaskFormDialog.vue"
];

const requiredPackageScripts = [
  "lint",
  "typecheck",
  "build",
  "test:api",
  "test:web-mvp",
  "test:ai-provider",
  "smoke:api",
  "check:internal-mvp",
  "check:deployment",
  "check:self-use"
];

const requiredDocSnippets = new Map([
  [
    "docs/operation/self-use-sop.md",
    [
      "AI_PROVIDER=openai_compatible",
      "openai_compatible",
      "激光测距传感器",
      "候选词不会自动入库",
      "AI Provider API Key 未配置",
      "不提交真实 API Key"
    ]
  ],
  [
    "docs/operation/real-ai-test-plan.md",
    ["测试目标", "测试产品线", "测试提示词", "结果记录表格", "问题记录表格", "后续优化建议"]
  ],
  [
    "docs/operation/quality-notes.md",
    [
      "真实 AI 内容质量观察",
      "哪些提示词生成效果好",
      "哪些提示词生成效果差",
      "知识库资料不足",
      "指令模板如何影响输出"
    ]
  ],
  ["README.md", ["docs/operation/self-use-sop.md", "pnpm check:self-use", "openai_compatible"]]
]);

function readProjectFile(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const missingFiles = requiredFiles.filter(
  (relativePath) => !existsSync(path.join(root, relativePath))
);

assert(missingFiles.length === 0, `Missing self-use files:\n${missingFiles.join("\n")}`);

const packageJson = JSON.parse(readProjectFile("package.json"));
const missingScripts = requiredPackageScripts.filter(
  (scriptName) => !packageJson.scripts?.[scriptName]
);

assert(missingScripts.length === 0, `Missing package scripts:\n${missingScripts.join("\n")}`);

for (const [relativePath, snippets] of requiredDocSnippets.entries()) {
  const content = readProjectFile(relativePath);
  const missingSnippets = snippets.filter((snippet) => !content.includes(snippet));

  assert(
    missingSnippets.length === 0,
    `${relativePath} is missing snippets:\n${missingSnippets.join("\n")}`
  );
}

const rootEnvExample = readProjectFile(".env.example");
const webExpansionForm = readProjectFile("apps/web/src/components/AiExpansionForm.vue");
const contentTaskForm = readProjectFile("apps/web/src/components/ContentTaskFormDialog.vue");

for (const required of [
  "AI_PROVIDER=mock",
  "AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1",
  "AI_OPENAI_COMPATIBLE_API_KEY=change_me",
  "AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat"
]) {
  assert(rootEnvExample.includes(required), `.env.example missing ${required}`);
}

assert(
  webExpansionForm.includes("openai_compatible") && contentTaskForm.includes("openai_compatible"),
  "Frontend provider selectors must include openai_compatible"
);
assert(
  !webExpansionForm.includes("AI_OPENAI_COMPATIBLE_API_KEY") &&
    !contentTaskForm.includes("AI_OPENAI_COMPATIBLE_API_KEY"),
  "Frontend forms must not expose backend API key variable names"
);

console.log("Self-use ready check passed");
console.log("Docs: self-use SOP, real AI test plan, and quality notes are present");
console.log("AI Provider: mock by default; openai_compatible documented for private .env use");
console.log("Security: this script does not read or print real environment variable values");
