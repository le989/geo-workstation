import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "docs/deployment/deployment-guide.md",
  "docs/deployment/env-guide.md",
  "docs/deployment/database-backup.md",
  "docs/deployment/release-checklist.md",
  ".env.production.example",
  "apps/web/.env.production.example",
  "deploy/nginx.geo-workstation.example.conf",
  "deploy/ecosystem.config.cjs",
  "deploy/docker-compose.production.example.yml",
  "docs/demo/internal-demo-guide.md",
  "docs/demo/mvp-feature-checklist.md",
  "docs/frontend/frontend-mvp-guide.md",
  "docs/api/backend-api.md"
];

const requiredPackageScripts = [
  "build",
  "prisma:migrate",
  "prisma:seed",
  "smoke:api",
  "test:web-mvp",
  "check:internal-mvp",
  "check:deployment"
];

const requiredDocSnippets = new Map([
  [
    "docs/deployment/deployment-guide.md",
    ["方案 A", "PM2", "Nginx", "Docker Compose", "回滚", "查看日志", "重启"]
  ],
  [
    "docs/deployment/env-guide.md",
    [
      "DATABASE_URL",
      "PORT",
      "API_PORT",
      "LOCAL_STORAGE_ROOT",
      "JWT_SECRET",
      "DEFAULT_ADMIN_EMAIL",
      "DEFAULT_ADMIN_PASSWORD",
      "VITE_API_BASE_URL",
      "DEEPSEEK_API_KEY",
      "不能提交到 git"
    ]
  ],
  [
    "docs/deployment/database-backup.md",
    ["pg_dump", "恢复 PostgreSQL", "storage/uploads", "pnpm prisma:migrate", "pnpm prisma:seed"]
  ],
  [
    "docs/deployment/release-checklist.md",
    ["上线前检查", "环境变量检查", "PM2 检查", "Nginx 检查", "Smoke Test 检查", "安全边界检查"]
  ]
]);

function readProjectFile(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const missingFiles = requiredFiles.filter(
  (relativePath) => !existsSync(path.join(root, relativePath))
);

assert(
  missingFiles.length === 0,
  `Missing deployment readiness files:\n${missingFiles.join("\n")}`
);

const packageJson = JSON.parse(readProjectFile("package.json"));
const missingScripts = requiredPackageScripts.filter(
  (scriptName) => !packageJson.scripts?.[scriptName]
);

assert(missingScripts.length === 0, `Missing package scripts:\n${missingScripts.join("\n")}`);

for (const [relativePath, snippets] of requiredDocSnippets.entries()) {
  const content = readProjectFile(relativePath);
  const missingSnippets = snippets.filter((snippet) => !content.includes(snippet));

  assert(
    missingSnippets.length === 0,
    `${relativePath} is missing snippets:\n${missingSnippets.join("\n")}`
  );
}

const rootProductionEnv = readProjectFile(".env.production.example");
const webProductionEnv = readProjectFile("apps/web/.env.production.example");
const nginxExample = readProjectFile("deploy/nginx.geo-workstation.example.conf");
const pm2Example = readProjectFile("deploy/ecosystem.config.cjs");
const composeExample = readProjectFile("deploy/docker-compose.production.example.yml");
const readme = readProjectFile("README.md");

for (const required of [
  "NODE_ENV=production",
  "PORT=3000",
  "DATABASE_URL=postgresql://geo_user:change_me@localhost:5432/geo_workstation",
  "LOCAL_STORAGE_ROOT=/var/www/geo-workstation/storage",
  "CORS_ORIGIN=http://your-domain.example.com",
  "JWT_SECRET=change_me_to_a_long_random_secret",
  "DEFAULT_ADMIN_EMAIL=admin@geo-workstation.local",
  "DEFAULT_ADMIN_PASSWORD=change_me_admin_password",
  "BYPASS_AUTH_FOR_TESTS=false"
]) {
  assert(rootProductionEnv.includes(required), `.env.production.example missing ${required}`);
}

assert(
  webProductionEnv.includes("VITE_API_BASE_URL="),
  "apps/web/.env.production.example must include VITE_API_BASE_URL"
);
assert(
  nginxExample.includes("your-domain.example.com") &&
    nginxExample.includes("client_max_body_size 20m") &&
    nginxExample.includes("proxy_pass http://127.0.0.1:3000/api/"),
  "Nginx example must include placeholder domain, upload limit, and API proxy"
);
assert(
  pm2Example.includes("geo-workstation-api") &&
    pm2Example.includes("dist/main.js") &&
    !pm2Example.includes("DATABASE_URL"),
  "PM2 example must name the API app, point to dist/main.js, and avoid DATABASE_URL"
);
assert(
  composeExample.includes("postgres") &&
    composeExample.includes("api") &&
    composeExample.includes("web") &&
    composeExample.includes("change_me"),
  "Production compose example must include postgres, api, web, and placeholder password"
);

for (const required of [
  "部署准备",
  "docs/deployment/deployment-guide.md",
  ".env.production.example",
  "pnpm check:deployment",
  "未实际上线",
  "未接入真实 AI Provider"
]) {
  assert(readme.includes(required), `README.md missing deployment note: ${required}`);
}

console.log("Deployment readiness check passed");
console.log("Recommended deployment: single VPS with Docker PostgreSQL, PM2 API, Nginx Web");
console.log("Alternative deployment: docker-compose production example for later hardening");
console.log("Secrets: examples use placeholders only; real .env files remain ignored");
