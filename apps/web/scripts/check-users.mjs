import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/users.ts",
  "src/views/UsersView.vue",
  "src/router/routes.ts",
  "src/config/navigation.ts",
  "src/utils/permission.ts"
];

const requiredSnippets = [
  ["/api/users", "src/api/users.ts"],
  ["createUser", "src/api/users.ts"],
  ["resetUserPassword", "src/api/users.ts"],
  ["updateUserStatus", "src/api/users.ts"],
  ["updateUserMembership", "src/api/users.ts"],
  ["用户管理", "src/views/UsersView.vue"],
  ["管理系统账号、所属公司与角色", "src/views/UsersView.vue"],
  ["新增用户", "src/views/UsersView.vue"],
  ["重置密码", "src/views/UsersView.vue"],
  ["编辑角色 / 公司", "src/views/UsersView.vue"],
  ["初始密码", "src/views/UsersView.vue"],
  ["提交后需要使用新密码登录", "src/views/UsersView.vue"],
  ['path: "/users"', "src/config/navigation.ts"],
  ['allowedRoles: ["platform_admin"]', "src/config/navigation.ts"],
  ["UsersView", "src/router/routes.ts"],
  ["canAccessRoute", "src/router/index.ts"]
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

for (const [snippet, file] of requiredSnippets) {
  const source = await readSource(file);
  assert(source.includes(snippet), `${file} missing ${snippet}`);
}

const usersView = await readSource("src/views/UsersView.vue");
assert(!usersView.includes("localStorage"), "UsersView must not write passwords to localStorage");
assert(!usersView.includes("passwordHash"), "UsersView must not display passwordHash");
assert(usersView.includes('type="password"'), "UsersView password fields must use type=password");

process.stdout.write("User management frontend check passed\n");
