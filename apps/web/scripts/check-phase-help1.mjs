/* global fetch, setTimeout, URL, WebSocket */
import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "../..");
const port = Number(process.env.FRONTEND_HELP_PORT || 5184);
const stubApiPort = Number(process.env.FRONTEND_HELP_API_PORT || port + 2000);
const baseUrl = process.env.FRONTEND_BASE_URL || `http://127.0.0.1:${port}`;
const stubApiBaseUrl = `http://127.0.0.1:${stubApiPort}`;
const chromePath =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const disconnectedApiBaseUrl = process.env.VITE_API_BASE_URL || stubApiBaseUrl;
const helpPageTitle = "使用教程";
const helpPageDescription = "按 GEO 日常运营闭环查看页面用途、风险边界和常见问题。";

const requiredFiles = [
  "apps/web/src/views/HelpView.vue",
  "apps/web/src/config/help-content.ts",
  "docs/help/user-guide.md",
  "docs/help/sop.md",
  "docs/help/changelog.md"
];

const requiredPageSnippets = [
  "新手快速开始",
  "日常 GEO 运营",
  "风险边界清楚",
  "帮助目录总览",
  "高风险操作提醒",
  "常见问题",
  "用发布文章工作台生成发布稿",
  "人工复核并手动发布",
  "AI 拓词",
  "知识库",
  "/geo-content",
  "GEO 报表"
];

const requiredDocSnippets = [
  "GEO 工作站内部用户快速上手",
  "平台管理员",
  "公司管理员",
  "运营人员",
  "查看者",
  `看 Dashboard
→ 做 GEO 诊断
→ 维护提示词策略库
→ 用 AI 拓词补候选问题
→ 补企业知识库资料
→ 用发布文章工作台生成发布稿
→ 人工复核并手动发布
→ 录入模型覆盖记录
→ 查看 GEO 报表复盘`,
  "阶段用途完成后可归档诊断记录",
  "发布文章相关历史记录。",
  "模型覆盖记录用于人工维护不同 AI 平台、入口或检测方式下的品牌表现。",
  "/geo-content",
  "/geo-reports",
  "项目档案提供品牌和语气上下文，但不能替代知识库事实",
  "候选词不会自动入库",
  "知识库是事实底座"
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "pipe",
      ...options
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with ${code}\n${output}`));
      }
    });
  });

const waitForHttp = async (url, timeoutMs = 20000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Company-Id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
};

const startStubApi = async () =>
  new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      if (request.method === "OPTIONS") {
        sendJson(response, 204, null);
        return;
      }

      const url = new URL(request.url || "/", stubApiBaseUrl);

      if (request.method === "GET" && url.pathname === "/api/auth/me") {
        sendJson(response, 200, {
          code: 0,
          message: "ok",
          data: {
            user: {
              id: "help-user",
              name: "帮助页验收用户",
              email: "help@example.com",
              role: "platform_admin",
              status: "active",
              isPlatformAdmin: true
            },
            companies: [
              {
                id: "company_help",
                name: "帮助页验收公司",
                code: "help",
                role: "platform_admin",
                isDefault: true,
                status: "active"
              }
            ],
            currentCompany: {
              id: "company_help",
              name: "帮助页验收公司",
              code: "help",
              role: "platform_admin",
              isDefault: true,
              status: "active"
            }
          }
        });
        return;
      }

      sendJson(response, 503, {
        code: 503,
        message: "后端未连接",
        data: null
      });
    });

    server.on("error", reject);
    server.listen(stubApiPort, "127.0.0.1", () => resolve(server));
  });

const startVite = async () => {
  await runCommand("pnpm", ["--filter", "@geo-workstation/shared", "build"]);
  const child = spawn(
    "pnpm",
    ["exec", "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        VITE_API_BASE_URL: disconnectedApiBaseUrl
      },
      stdio: "pipe"
    }
  );
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  await waitForHttp(baseUrl);
  return child;
};

const startChrome = async () => {
  const debuggingPort = port + 1000;
  const child = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=/tmp/geo-help-chrome-${Date.now()}`,
      `--remote-debugging-port=${debuggingPort}`,
      "--window-size=1440,1200",
      `${baseUrl}/help`
    ],
    {
      stdio: "ignore"
    }
  );

  const pagesUrl = `http://127.0.0.1:${debuggingPort}/json/list`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    try {
      const pages = await fetch(pagesUrl).then((response) => response.json());
      const page = pages.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
      if (page) {
        return { child, wsUrl: page.webSocketDebuggerUrl };
      }
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  child.kill("SIGTERM");
  throw new Error("Timed out waiting for Chrome DevTools endpoint");
};

const connectCdp = (url) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let id = 0;
    const pending = new Map();

    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const messageId = ++id;
            pending.set(messageId, { res, rej });
            socket.send(JSON.stringify({ id: messageId, method, params }));
          });
        },
        close() {
          socket.close();
        }
      });
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (!payload.id || !pending.has(payload.id)) {
        return;
      }
      const callbacks = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) {
        callbacks.rej(new Error(payload.error.message));
      } else {
        callbacks.res(payload.result);
      }
    });

    socket.addEventListener("error", reject);
  });

const waitForBodyText = async (client, predicate, timeoutMs = 20000) => {
  const startedAt = Date.now();
  let text = "";
  while (Date.now() - startedAt < timeoutMs) {
    const result = await client.send("Runtime.evaluate", {
      expression: "document.body.innerText",
      returnByValue: true
    });
    text = result.result.value || "";
    if (predicate(text)) {
      return text;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return text;
};

const seedAuthSession = async (client) => {
  await client.send("Runtime.evaluate", {
    expression: `
      localStorage.setItem('geo-workstation.auth-token', 'help-offline-token');
      localStorage.setItem('geo-workstation.auth-user', JSON.stringify({
        id: 'help-user',
        name: '帮助页验收用户',
        email: 'help@example.com',
        role: 'admin',
        status: 'active'
      }));
    `,
    returnByValue: true
  });
};

for (const file of requiredFiles) {
  await access(path.join(repoRoot, file));
}

const navigationSource = await readFile(path.join(webRoot, "src/config/navigation.ts"), "utf8");
assert(navigationSource.includes("/help"), "Navigation must include /help");
assert(navigationSource.includes("使用教程"), "Navigation must include 使用教程 label");

const routeSource = await readFile(path.join(webRoot, "src/router/routes.ts"), "utf8");
assert(routeSource.includes("HelpView"), "Routes must use HelpView");
assert(routeSource.includes('item.path === "/help"'), "Missing explicit /help route mapping");

const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
for (const snippet of [
  "使用教程入口",
  "docs/help/user-guide.md",
  "docs/help/sop.md",
  "默认管理员由基础 seed 创建",
  "正式库和干净库不要执行演示 seed"
]) {
  assert(readme.includes(snippet), `README missing help snippet: ${snippet}`);
}

const docs = await Promise.all([
  readFile(path.join(repoRoot, "docs/help/user-guide.md"), "utf8"),
  readFile(path.join(repoRoot, "docs/help/sop.md"), "utf8"),
  readFile(path.join(repoRoot, "docs/help/changelog.md"), "utf8")
]);
const allDocs = docs.join("\n");
for (const snippet of requiredDocSnippets) {
  assert(allDocs.includes(snippet), `Help docs missing snippet: ${snippet}`);
}

const stubApi = process.env.VITE_API_BASE_URL ? undefined : await startStubApi();
const vite = await startVite();
let chrome;

try {
  chrome = await startChrome();
  const client = await connectCdp(chrome.wsUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await seedAuthSession(client);
  await client.send("Page.navigate", { url: `${baseUrl}/help` });

  const text = await waitForBodyText(
    client,
    (bodyText) =>
      bodyText.includes("帮助页验收用户") &&
      bodyText.includes(helpPageTitle) &&
      bodyText.includes(helpPageDescription) &&
      requiredPageSnippets.every((snippet) => bodyText.includes(snippet))
  );

  assert(text.includes(helpPageTitle), `/help must render the ${helpPageTitle} page title`);
  assert(text.includes(helpPageDescription), "/help must render page description");
  assert(text.includes("帮助页验收用户"), "/help must keep authenticated layout");
  for (const snippet of requiredPageSnippets) {
    assert(text.includes(snippet), `/help page missing snippet: ${snippet}`);
  }

  client.close();
} finally {
  chrome?.child.kill("SIGTERM");
  vite.kill("SIGTERM");
  stubApi?.close();
}

process.stdout.write("Phase Help-1 route and content check passed\n");
