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
  "AI 用量统计用于查看真实 AI 接口调用情况。",
  "部分 Provider 不返回 token，本页会标记为未知，不会伪造成 0。",
  "AI 调用总次数",
  "成功 / 失败",
  "已知 token",
  "token 未知次数",
  "Provider 统计",
  "功能模块统计",
  "详细统计",
  "存在部分真实调用未返回 token 用量，暂不能用于精确成本核算。"
]) {
  assert(usageViewSource.includes(snippet), `Usage page missing AI usage copy: ${snippet}`);
}

for (const forbidden of ["硬性额度限制", "价格模型", "账单入口", "扣费逻辑"]) {
  assert(!usageViewSource.includes(forbidden), `Usage page must not add forbidden feature: ${forbidden}`);
}

process.stdout.write("Token usage frontend check passed\n");
