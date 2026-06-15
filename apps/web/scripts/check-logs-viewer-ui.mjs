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
  "src/api/logs-viewer.ts",
  "src/views/OperationLogsView.vue",
  "src/config/navigation.ts"
];

for (const file of requiredFiles) {
  await access(path.join(webRoot, file));
}

const apiSource = await readSource("src/api/logs-viewer.ts");
for (const snippet of [
  "/api/logs-viewer/operation-logs",
  "/api/logs-viewer/ai-usage-records",
  "/api/logs-viewer/ai-call-logs",
  "getLogsViewerOperationLogs",
  "getLogsViewerOperationLogDetail",
  "getLogsViewerAiUsageRecords",
  "getLogsViewerAiUsageRecordDetail",
  "getLogsViewerAiCallLogs",
  "getLogsViewerAiCallLogDetail"
]) {
  assert(apiSource.includes(snippet), `Logs viewer API client missing ${snippet}`);
}

const navigationSource = await readSource("src/config/navigation.ts");
assert(navigationSource.includes('path: "/operation-logs"'), "Navigation must keep /operation-logs");
assert(navigationSource.includes('label: "日志与审计"'), "Navigation label must be 日志与审计");
assert(!navigationSource.includes('label: "操作日志"'), "Old 操作日志 label should be replaced");

const viewSource = await readSource("src/views/OperationLogsView.vue");
for (const snippet of [
  "日志与审计",
  "查看系统操作记录、AI 模块使用情况和底层接口调度流水。不包含敏感正文或密钥。",
  "仅含安全摘要",
  "操作审计",
  "业务 AI 记录",
  "底层接口日志",
  "今日操作",
  "真实调用",
  "接口流水",
  "查询",
  "重置",
  "查看详情",
  "日志详情",
  "Log ID",
  "复制 Log ID",
  "正在加载日志数据",
  "暂无日志记录",
  "handleTabChange",
  "openDetailDrawer",
  "copyLogId",
  "getLogsViewerOperationLogs",
  "getLogsViewerAiUsageRecords",
  "getLogsViewerAiCallLogs"
]) {
  assert(viewSource.includes(snippet), `Logs viewer page missing ${snippet}`);
}

for (const forbidden of [
  "formatMetadata",
  "row.metadata",
  "detail.metadata",
  "costEstimate",
  "apiKey",
  "authorization",
  "Authorization",
  "prompt 原文",
  "response 原文",
  "完整 IP",
  "完整 userAgent"
]) {
  assert(!viewSource.includes(forbidden), `Logs viewer page must not expose ${forbidden}`);
}

assert(
  viewSource.includes("hasIp") && viewSource.includes("hasUserAgent"),
  "Logs viewer detail should only display IP/UserAgent recorded flags"
);

process.stdout.write("Logs viewer UI check passed\n");
