/* global fetch, setTimeout, WebSocket */
import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "../..");
const port = Number(process.env.FRONTEND_MVP_PORT || 5174);
const baseUrl = process.env.FRONTEND_BASE_URL || `http://127.0.0.1:${port}`;
const chromePath =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const disconnectedApiBaseUrl = process.env.VITE_API_BASE_URL || "http://127.0.0.1:59999";

const requiredFiles = [
  "docs/frontend/frontend-mvp-guide.md",
  "apps/web/src/views/LandingView.vue",
  "apps/web/src/views/LoginView.vue",
  "apps/web/src/views/DashboardView.vue",
  "apps/web/src/views/GeoPromptsView.vue",
  "apps/web/src/views/ExpansionView.vue",
  "apps/web/src/views/KnowledgeBasesView.vue",
  "apps/web/src/views/InstructionTemplatesView.vue",
  "apps/web/src/views/ContentTasksView.vue",
  "apps/web/src/views/ModelInclusionRecordsView.vue",
  "apps/web/src/views/ReportsView.vue",
  "apps/web/src/views/SettingsView.vue",
  "apps/web/src/views/HelpView.vue",
  "apps/web/src/config/help-content.ts",
  "apps/web/src/api/project-profile.ts"
];

const routeChecks = [
  ["/", "让 AI 搜索看见你"],
  ["/dashboard", "GEO 工作台"],
  ["/geo-analysis", "GEO 诊断"],
  ["/geo-prompts", "提示词策略库"],
  ["/expansion", "AI 拓词"],
  ["/knowledge-bases", "企业 GEO 知识库"],
  ["/instruction-templates", "指令库"],
  ["/content-tasks", "GEO 内容生成"],
  ["/model-inclusion-records", "模型覆盖记录"],
  ["/reports", "GEO 报表"],
  ["/settings", "系统设置"],
  ["/help", "使用教程"]
];

const requiredGuideSnippets = [
  "登录页",
  "退出登录",
  "前端页面总览",
  "完整 GEO MVP 使用流程",
  "真实入库能力",
  "Mock 能力",
  "未实现能力",
  "后端未启动",
  "CSV 导出",
  "文件上传格式限制"
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
      `--user-data-dir=/tmp/geo-frontend-mvp-chrome-${Date.now()}`,
      `--remote-debugging-port=${debuggingPort}`,
      "--window-size=1440,1200",
      `${baseUrl}/dashboard`
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

const navigateAndRead = async (client, route) => {
  await client.send("Page.navigate", { url: `${baseUrl}${route}` });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 6000) {
    const result = await client.send("Runtime.evaluate", {
      expression: "document.body.innerText",
      returnByValue: true
    });
    const text = result.result.value || "";
    if (text.trim().length > 120) {
      return text;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const result = await client.send("Runtime.evaluate", {
    expression: "document.body.innerText",
    returnByValue: true
  });
  return result.result.value || "";
};

const waitForBodyText = async (client, predicate, timeoutMs = 8000) => {
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

const clearAuthSession = async (client) => {
  await client.send("Runtime.evaluate", {
    expression:
      "localStorage.removeItem('geo-workstation.auth-token'); localStorage.removeItem('geo-workstation.auth-user');",
    returnByValue: true
  });
};

const seedAuthSession = async (client) => {
  await client.send("Runtime.evaluate", {
    expression: `
      localStorage.setItem('geo-workstation.auth-token', 'frontend-mvp-offline-token');
      localStorage.setItem('geo-workstation.auth-user', JSON.stringify({
        id: 'frontend-mvp-user',
        name: '前端验收用户',
        email: 'frontend-mvp@example.com',
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

const guide = await readFile(path.join(repoRoot, "docs/frontend/frontend-mvp-guide.md"), "utf8");
for (const snippet of requiredGuideSnippets) {
  assert(guide.includes(snippet), `Frontend MVP guide missing ${snippet}`);
}

const vite = await startVite();
let chrome;

try {
  chrome = await startChrome();
  const client = await connectCdp(chrome.wsUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");

  await clearAuthSession(client);
  await client.send("Page.navigate", { url: `${baseUrl}/dashboard` });
  const unauthenticatedText = await waitForBodyText(
    client,
    (text) => text.includes("内部访问控制") && text.includes("登录")
  );
  assert(
    unauthenticatedText.includes("内部访问控制") && unauthenticatedText.includes("登录"),
    "Unauthenticated /dashboard visit must redirect to /login"
  );
  assert(
    unauthenticatedText.includes("邮箱") && unauthenticatedText.includes("密码"),
    "/login must render the login form fields"
  );

  await seedAuthSession(client);
  await client.send("Page.navigate", { url: `${baseUrl}/dashboard` });
  await waitForBodyText(
    client,
    (text) => text.includes("前端验收用户") && text.includes("退出登录")
  );

  for (const [route, title] of routeChecks) {
    const text = await navigateAndRead(client, route);
    assert(
      text.includes(title),
      `${route} did not render expected title ${title}. Text sample: ${text.slice(0, 400)}`
    );
    assert(text.trim().length > 120, `${route} rendered too little content`);
    if (route === "/geo-analysis") {
      assert(
        text.includes("GEO 诊断") && text.includes("不等同于 Kimi"),
        "/geo-analysis must render the real GEO analysis page"
      );
    }
  }

  await client.send("Page.navigate", { url: `${baseUrl}/dashboard` });
  const dashboardText = await waitForBodyText(
    client,
    (text) => text.includes("后端未连接") || text.includes("加载失败")
  );
  assert(
    dashboardText.includes("后端未连接") || dashboardText.includes("加载失败"),
    "Dashboard must show a clear disconnected-backend state"
  );

  client.close();
} finally {
  chrome?.child.kill("SIGTERM");
  vite.kill("SIGTERM");
}

process.stdout.write("Frontend MVP route and offline check passed\n");
