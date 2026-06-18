import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/instructions.ts",
  "src/components/InstructionTemplateDetailDrawer.vue",
  "src/components/InstructionTemplateDuplicateDialog.vue",
  "src/components/InstructionTemplateFilters.vue",
  "src/components/InstructionTemplateFormDialog.vue",
  "src/config/instruction-options.ts",
  "src/views/InstructionTemplatesView.vue"
];

const apiRequiredSnippets = [
  "getInstructionTemplates",
  "createInstructionTemplate",
  "getInstructionTemplate",
  "updateInstructionTemplate",
  "duplicateInstructionTemplate",
  "deleteInstructionTemplate",
  "/api/instruction-templates",
  "/duplicate"
];

const pageRequiredSnippets = [
  "指令库",
  "沉淀内容生成模板、品牌锚点和事实边界规则",
  "AI 问答素材",
  "需求决策指南",
  "对比与替代",
  "InstructionTemplateFilters",
  "InstructionTemplateFormDialog",
  "InstructionTemplateDetailDrawer",
  "InstructionTemplateDuplicateDialog",
  "duplicateInstructionTemplate",
  "从指令库移除该模板"
];

const instructionFields = [
  "name",
  "instructionType",
  "contentType",
  "targetPromptType",
  "targetModel",
  "instruction",
  "outputFormat",
  "qualityRules",
  "forbiddenRules",
  "createdAt",
  "updatedAt"
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

const apiSource = await readSource("src/api/instructions.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `Instructions API wrapper missing ${snippet}`);
}

const pageSource = [
  await readSource("src/views/InstructionTemplatesView.vue"),
  await readSource("src/components/InstructionTemplateDetailDrawer.vue"),
  await readSource("src/components/InstructionTemplateDuplicateDialog.vue"),
  await readSource("src/components/InstructionTemplateFilters.vue"),
  await readSource("src/components/InstructionTemplateFormDialog.vue")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Instruction templates page missing ${snippet}`);
}

for (const field of instructionFields) {
  assert(pageSource.includes(field), `Instruction page missing field ${field}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(
  routesSource.includes("InstructionTemplatesView"),
  "Router must use InstructionTemplatesView for /instruction-templates"
);

process.stdout.write("Phase 3F instruction templates check passed\n");
