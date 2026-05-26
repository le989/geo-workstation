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

await access(path.join(webRoot, "src/views/SettingsView.vue"));
await access(path.join(webRoot, "src/api/project-profile.ts"));
await access(path.join(webRoot, "src/api/settings-management.ts"));

const routeSource = await readSource("src/router/routes.ts");
assert(routeSource.includes("SettingsView"), "Settings route must use SettingsView");
assert(
  routeSource.includes('item.path === "/settings"'),
  "Missing explicit /settings route mapping"
);

const apiSource = await readSource("src/api/project-profile.ts");
assert(apiSource.includes("/api/project-profile"), "Project profile API path is missing");
assert(apiSource.includes("getProjectProfile"), "Missing getProjectProfile client");
assert(apiSource.includes("createProjectProfile"), "Missing createProjectProfile client");
assert(apiSource.includes("updateProjectProfile"), "Missing updateProjectProfile client");

const settingsManagementApiSource = await readSource("src/api/settings-management.ts");
for (const snippet of [
  "/api/companies",
  "/api/product-lines",
  "listCompanies",
  "createCompany",
  "updateCompany",
  "updateCompanyStatus",
  "listProductLines",
  "createProductLine",
  "updateProductLine",
  "updateProductLineStatus"
]) {
  assert(
    settingsManagementApiSource.includes(snippet),
    `Settings management API missing ${snippet}`
  );
}

for (const snippet of ["description?: string", "ProductLinePayload"]) {
  assert(
    settingsManagementApiSource.includes(snippet),
    `Settings management API missing product line description snippet: ${snippet}`
  );
}

const settingsSource = await readSource("src/views/SettingsView.vue");
for (const snippet of [
  "公司管理",
  "新增公司",
  "公司类型",
  "产品线管理",
  "新增产品线",
  "产品线说明",
  "用一两句话说明这个产品线是什么",
  "未填写",
  "项目档案",
  "主营产品 / 服务 / 课程 / 门店 / 个人品牌方向",
  "API Key 只允许在后端 .env 配置",
  "密钥仅由后端环境变量读取",
  "Provider 状态只读",
  "当前登录身份",
  "GEO 生成和检测的基础上下文",
  "参数、认证、价格和效果承诺仍以知识库为准"
]) {
  assert(settingsSource.includes(snippet), `Settings page missing copy: ${snippet}`);
}

for (const hardBinding of ["凯基特", "激光测距", "工业品专用", "传感器专用"]) {
  assert(
    !settingsSource.includes(hardBinding),
    `Settings page must not be bound to ${hardBinding}`
  );
}

process.stdout.write("Phase General-1 settings management check passed\n");
