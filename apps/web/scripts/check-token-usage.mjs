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

for (const file of ["src/api/usage.ts", "src/views/UsageAnalyticsView.vue"]) {
  await access(path.join(webRoot, file));
}

const usageApiSource = await readSource("src/api/usage.ts");
for (const snippet of ["AiUsageSummary", "/api/usage/ai-summary", "getAiUsageSummary"]) {
  assert(usageApiSource.includes(snippet), `Usage API missing AI summary snippet: ${snippet}`);
}

const usageViewSource = await readSource("src/views/UsageAnalyticsView.vue");
for (const snippet of [
  "AI 用量统计",
  "本页仅展示系统底层 AI 请求次数与 Token 用量。Mock 拦截不计入真实调用，当前版本不涉及财务核算与真实扣点。",
  "请求总数",
  "Token 消耗总计",
  "异常排查",
  "消耗 Top Provider",
  "消耗 Top Model",
  "明细记录",
  "用量未知"
]) {
  assert(usageViewSource.includes(snippet), `Usage page missing AI usage copy: ${snippet}`);
}

for (const forbidden of ["硬性额度限制", "价格模型", "账单入口", "扣费逻辑", "人民币", "发票"]) {
  assert(!usageViewSource.includes(forbidden), `Usage page must not add forbidden feature: ${forbidden}`);
}

process.stdout.write("Token usage frontend check passed\n");
