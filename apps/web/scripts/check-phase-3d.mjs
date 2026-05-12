import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/expansion.ts",
  "src/components/AiExpansionForm.vue",
  "src/components/ExpansionCandidateTable.vue",
  "src/components/ExpansionJobLookup.vue",
  "src/components/ExpansionModeTabs.vue",
  "src/components/RuleExpansionForm.vue",
  "src/components/SaveCandidatesResult.vue",
  "src/views/ExpansionView.vue"
];

const apiRequiredSnippets = [
  "ruleGenerateExpansion",
  "aiGenerateExpansion",
  "getExpansionJob",
  "saveExpansionCandidates",
  "/api/expansion/rule-generate",
  "/api/expansion/ai-generate",
  "/api/expansion/jobs/",
  "ExpansionCandidate",
  "SaveExpansionCandidatesResult"
];

const pageRequiredSnippets = [
  "AI 拓词",
  "Mock AI",
  "不会调用真实 DeepSeek",
  "生成候选词",
  "保存选中候选词到提示词策略库",
  "ExpansionCandidateTable",
  "RuleExpansionForm",
  "AiExpansionForm",
  "ExpansionJobLookup",
  "getExpansionJob",
  "/geo-prompts"
];

const candidateRequiredFields = [
  "promptText",
  "baseWord",
  "userIntent",
  "priority",
  "recommendedContentType",
  "duplicateInBatch",
  "duplicateInDatabase",
  "duplicateReason",
  "selected",
  "savedPromptId",
  "createdAt"
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

const apiSource = await readSource("src/api/expansion.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `Expansion API wrapper missing ${snippet}`);
}

const pageSource = [
  await readSource("src/views/ExpansionView.vue"),
  await readSource("src/components/ExpansionCandidateTable.vue"),
  await readSource("src/components/RuleExpansionForm.vue"),
  await readSource("src/components/AiExpansionForm.vue"),
  await readSource("src/components/ExpansionJobLookup.vue"),
  await readSource("src/components/SaveCandidatesResult.vue")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Expansion page missing ${snippet}`);
}

for (const field of candidateRequiredFields) {
  assert(pageSource.includes(field), `Expansion candidate table missing ${field}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(routesSource.includes("ExpansionView"), "Router must use ExpansionView for /expansion");

process.stdout.write("Phase 3D expansion check passed\n");
