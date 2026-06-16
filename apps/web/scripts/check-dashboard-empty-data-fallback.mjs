import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardPath = path.join(webRoot, "src/views/DashboardView.vue");
const dashboardSource = await readFile(dashboardPath, "utf8");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const forbiddenDisplayTokens = ["NaN", "undefined", "Infinity"];

// Dashboard 空数据兜底必须先把后端字段转成安全数字，再参与求和和展示。
assert(
  dashboardSource.includes("toSafeNumber"),
  "Dashboard must define a safe number fallback helper before doing display calculations"
);
assert(
  /Number\.isFinite/.test(dashboardSource),
  "Dashboard safe number helper must reject NaN and Infinity"
);
assert(
  dashboardSource.includes("pendingRemediationCount"),
  "Dashboard must centralize pending remediation count before rendering"
);
assert(
  dashboardSource.includes("dashboardTaskTotalText"),
  "Dashboard must render task total through a safe display value"
);
assert(
  !dashboardSource.includes("{{ dashboardTaskTotal }} 项待复盘"),
  "Dashboard must not render raw computed totals that can become NaN"
);
assert(
  !/report\.value\.[a-zA-Z0-9_]+\s*\+/.test(dashboardSource),
  "Dashboard must not add raw report fields directly for visible counts"
);

for (const token of forbiddenDisplayTokens) {
  assert(
    !dashboardSource.includes(`>{{ ${token} }}</`) && !dashboardSource.includes(`${token}%`),
    `Dashboard must not render technical token ${token}`
  );
}

process.stdout.write("Dashboard empty data fallback check passed\n");
