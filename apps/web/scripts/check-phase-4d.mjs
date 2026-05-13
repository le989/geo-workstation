import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/auth.ts",
  "src/stores/auth.ts",
  "src/views/LoginView.vue",
  "src/router/index.ts",
  "src/router/routes.ts",
  "src/layouts/AppLayout.vue"
];

const requiredSnippets = [
  ["/api/auth/login", "src/api/auth.ts"],
  ["/api/auth/me", "src/api/auth.ts"],
  ["/api/auth/logout", "src/api/auth.ts"],
  ["geo-workstation.auth-token", "src/stores/auth.ts"],
  ["geo-auth:unauthorized", "src/stores/auth.ts"],
  ["beforeEach", "src/router/index.ts"],
  ["requiresAuth", "src/router/routes.ts"],
  ["publicOnly", "src/router/routes.ts"],
  ["/login", "src/router/routes.ts"],
  ["GEO 营销运营系统", "src/views/LoginView.vue"],
  ["内部访问控制", "src/views/LoginView.vue"],
  ["退出登录", "src/layouts/AppLayout.vue"],
  ["currentUser", "src/layouts/AppLayout.vue"]
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

process.stdout.write("Phase 4D auth frontend check passed\n");
