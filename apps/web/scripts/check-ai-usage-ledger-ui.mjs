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
for (const snippet of [
  "/api/usage/ledger-summary",
  "/api/usage/by-provider",
  "/api/usage/by-model",
  "/api/usage/ledger-records",
  "getUsageLedgerSummary",
  "getUsageByProvider",
  "getUsageByModel",
  "getUsageLedgerRecords"
]) {
  assert(usageApiSource.includes(snippet), `Usage API client missing ${snippet}`);
}

const usageViewSource = await readSource("src/views/UsageAnalyticsView.vue");
for (const snippet of [
  "AI 用量统计",
  "本页仅展示系统底层 AI 请求次数与 Token 用量。Mock 拦截不计入真实调用，当前版本不涉及财务核算与真实扣点。",
  "请求总数",
  "Token 消耗总计",
  "异常排查",
  "时间 / 操作人",
  "业务模块 / 动作",
  "Provider / 模型",
  "调度状态",
  "消耗明细",
  "消耗 Top Provider",
  "消耗 Top Model",
  "复制 Log ID",
  "ledger-mobile-card",
  "loadAiUsageLedger",
  "applyAiUsageLedgerFilters",
  "resetAiUsageLedgerFilters"
]) {
  assert(usageViewSource.includes(snippet), `AI usage statistics tab missing ${snippet}`);
}

for (const forbidden of [
  "AI 使用账本",
  "AI 消耗账本",
  "点数账本",
  "costEstimate",
  "人民币",
  "金额",
  "单价",
  "余额",
  "套餐",
  "发票",
  "导出账单",
  "apiKey",
  "Authorization",
  "完整 metadata",
  "完整 errorMessage",
  "删除",
  "结算",
  "重试"
]) {
  assert(!usageViewSource.includes(forbidden), `AI usage statistics tab must not expose ${forbidden}`);
}

assert(
  !usageViewSource.includes("ledger-trends") && !usageViewSource.includes("getUsageLedgerTrends"),
  "AI usage statistics V1 should not render trend charts"
);

process.stdout.write("AI usage statistics UI check passed\n");
