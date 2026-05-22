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
  "src/components/AiExpansionForm.vue",
  "src/components/ContentTaskFormDialog.vue",
  "src/components/ModelInclusionWebSearchDialog.vue",
  "src/views/ModelInclusionRecordsView.vue",
  "src/views/SettingsView.vue"
];

for (const file of requiredFiles) {
  await access(path.join(webRoot, file));
}

const expansionSource = await readSource("src/components/AiExpansionForm.vue");
for (const snippet of [
  "真实 AI 接口：会调用外部模型，可能产生额度消耗。",
  "内部生成：使用本地规则，不消耗真实模型额度。"
]) {
  assert(expansionSource.includes(snippet), `AI expansion form missing safety copy: ${snippet}`);
}

const contentTaskSource = await readSource("src/components/ContentTaskFormDialog.vue");
for (const snippet of [
  "真实 AI 接口：会调用外部模型，可能产生额度消耗。",
  "基础生成模式：不调用真实模型。"
]) {
  assert(contentTaskSource.includes(snippet), `Content task form missing safety copy: ${snippet}`);
}

const modelInclusionSource = [
  await readSource("src/components/ModelInclusionWebSearchDialog.vue"),
  await readSource("src/views/ModelInclusionRecordsView.vue")
].join("\n");
for (const snippet of [
  "联网检测会调用对应模型服务，请确认后继续。",
  "本操作将调用真实模型接口，可能产生费用，是否继续？",
  "当前角色无权发起联网检测"
]) {
  assert(
    modelInclusionSource.includes(snippet),
    `Model inclusion page missing real-call confirmation copy: ${snippet}`
  );
}

const settingsSource = await readSource("src/views/SettingsView.vue");
for (const snippet of [
  "当前页面不显示密钥，密钥仅由后端环境变量读取。",
  "Provider 只显示状态，不展示密钥"
]) {
  assert(settingsSource.includes(snippet), `Settings provider status missing copy: ${snippet}`);
}
for (const forbidden of ["sk-", "Bearer ", "DATABASE_URL=", "JWT_SECRET="]) {
  assert(!settingsSource.includes(forbidden), `Settings page must not display ${forbidden}`);
}

process.stdout.write("AI Provider safety frontend check passed\n");
