/* global fetch, setTimeout, URL, WebSocket */
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "../..");
const port = Number(process.env.FRONTEND_MVP_PORT || 5174);
const stubApiPort = Number(process.env.FRONTEND_MVP_API_PORT || port + 2000);
const baseUrl = process.env.FRONTEND_BASE_URL || `http://127.0.0.1:${port}`;
const stubApiBaseUrl = `http://127.0.0.1:${stubApiPort}`;
const disconnectedApiBaseUrl = process.env.VITE_API_BASE_URL || stubApiBaseUrl;
const chromeStartTimeoutMs = Number(process.env.FRONTEND_MVP_CHROME_TIMEOUT_MS || 30000);
const chromeStartAttempts = Math.max(1, Number(process.env.FRONTEND_MVP_CHROME_ATTEMPTS || 3));
const shouldRunChromeHeadful = process.env.MVP_TEST_HEADFUL === "1";
const chromeCandidatePaths = [
  process.env.CHROME_BIN,
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
].filter(Boolean);

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
  "apps/web/src/views/AftersalesQaView.vue",
  "apps/web/src/api/aftersales-qa.ts",
  "apps/web/src/config/help-content.ts",
  "apps/web/src/api/project-profile.ts"
];

const routeChecks = [
  ["/", "企业 AI 搜索曝光与内容运营中枢"],
  ["/dashboard", "工作台"],
  ["/geo-analysis", "GEO 诊断"],
  ["/geo-prompts", "提示词库"],
  ["/expansion", "AI 拓词"],
  ["/knowledge-bases", "知识库"],
  ["/instruction-templates", "指令库"],
  ["/geo-content", "发布文章工作台"],
  ["/content-tasks", "发布文章工作台"],
  ["/model-inclusion-records", "AI 模型覆盖记录"],
  ["/geo-reports", "GEO 报表"],
  ["/reports", "GEO 报表"],
  ["/settings", "系统设置"],
  ["/help", "使用教程"]
];

const requiredGuideSnippets = [
  "登录页",
  "退出登录",
  "前端页面总览",
  "完整 GEO MVP 使用流程",
  "/geo-content",
  "/content-tasks",
  "/geo-reports",
  "/reports",
  "真实入库能力",
  "Mock 能力",
  "未实现能力",
  "后端未启动",
  "CSV 导出",
  "文件上传格式限制"
];

const requiredAftersalesKbLoopSnippets = [
  "convertFeedbackToKnowledgeDraft",
  "/api/aftersales-qa/feedbacks/${id}/convert-to-knowledge-draft",
  "转为知识库草稿",
  "已转知识库草稿",
  "知识库资料标题",
  "资料主题",
  "所属知识库",
  "售后资料",
  "【问题】",
  "【原回答】",
  "【错误类型】",
  "【正确答案 / 补充说明】",
  "【建议沉淀为知识】",
  "请填写整理后的知识正文",
  "不能重复转草稿",
  "查看知识库资料"
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveChromePath = async () => {
  for (const candidatePath of chromeCandidatePaths) {
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Chrome executable not found. Tried: ${chromeCandidatePaths.join(", ")}. You can set CHROME_BIN or CHROME_PATH for test:mvp.`
  );
};

const getAvailablePort = async () =>
  new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Unable to allocate a local Chrome debugging port"));
        }
      });
    });
  });

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} responded with HTTP ${response.status}`);
  }
  return response.json();
};

const removeDirectoryBestEffort = async (directoryPath) => {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await rm(directoryPath, { force: true, recursive: true });
      return;
    } catch {
      await sleep(250);
    }
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
              id: "frontend-mvp-user",
              name: "前端验收用户",
              email: "frontend-mvp@example.com",
              role: "platform_admin",
              status: "active",
              isPlatformAdmin: true
            },
            companies: [
              {
                id: "company_frontend_mvp",
                name: "前端验收公司",
                code: "frontend",
                role: "platform_admin",
                isDefault: true,
                status: "active"
              }
            ],
            currentCompany: {
              id: "company_frontend_mvp",
              name: "前端验收公司",
              code: "frontend",
              role: "platform_admin",
              isDefault: true,
              status: "active"
            }
          }
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        sendJson(response, 200, {
          code: 0,
          message: "ok",
          data: {
            loggedOut: true
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
  const resolvedChromePath = await resolveChromePath();
  const attemptSummaries = [];

  for (let attempt = 1; attempt <= chromeStartAttempts; attempt += 1) {
    const debuggingPort = await getAvailablePort();
    const userDataDir = await mkdtemp(path.join(tmpdir(), "geo-workstation-mvp-chrome-"));
    const chromeArgs = [
      ...(shouldRunChromeHeadful ? [] : ["--headless=new"]),
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-extensions",
      "--disable-popup-blocking",
      "--disable-sync",
      "--disable-dev-shm-usage",
      "--enable-automation",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${debuggingPort}`,
      "--window-size=1440,1200",
      "about:blank"
    ];
    const stderrChunks = [];
    let chromeExit = null;
    const child = spawn(resolvedChromePath, chromeArgs, { stdio: ["ignore", "ignore", "pipe"] });

    child.stderr?.on("data", (chunk) => {
      stderrChunks.push(chunk.toString());
    });
    child.on("exit", (code, signal) => {
      chromeExit = { code, signal };
    });

    const stopChrome = async () => {
      child.kill("SIGTERM");
      // 按本次独立用户目录兜底清理 Chrome 进程，避免残留测试浏览器。
      await runCommand("pkill", ["-f", userDataDir]).catch(() => undefined);
      await removeDirectoryBestEffort(userDataDir);
    };

    try {
      const startedAt = Date.now();
      const versionUrl = `http://127.0.0.1:${debuggingPort}/json/version`;
      const pagesUrl = `http://127.0.0.1:${debuggingPort}/json/list`;
      let lastError = "";

      while (Date.now() - startedAt < chromeStartTimeoutMs) {
        if (chromeExit) {
          throw new Error(
            `Chrome exited before DevTools endpoint became available. code=${chromeExit.code ?? "null"} signal=${chromeExit.signal ?? "null"}`
          );
        }

        try {
          await fetchJson(versionUrl);
          const pages = await fetchJson(pagesUrl);
          const page = pages.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
          if (page) {
            return { close: stopChrome, wsUrl: page.webSocketDebuggerUrl };
          }
          lastError = `DevTools endpoint is up, but no page target was found on ${pagesUrl}`;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
        await sleep(300);
      }

      throw new Error(lastError || "DevTools endpoint did not become ready");
    } catch (error) {
      const stderrSummary = stderrChunks.join("").trim().slice(-1200);
      attemptSummaries.push(
        [
          `attempt=${attempt}`,
          `chrome=${resolvedChromePath}`,
          `port=${debuggingPort}`,
          `userDataDir=${userDataDir}`,
          `mode=${shouldRunChromeHeadful ? "headful" : "headless"}`,
          `reason=${error instanceof Error ? error.message : String(error)}`,
          stderrSummary ? `stderr=${stderrSummary}` : ""
        ]
          .filter(Boolean)
          .join(" | ")
      );
      await stopChrome();
    }
  }

  throw new Error(
    `Timed out waiting for Chrome DevTools endpoint after ${chromeStartAttempts} attempt(s).\n${attemptSummaries.join("\n")}`
  );
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

const readCurrentUrl = async (client) => {
  const result = await client.send("Runtime.evaluate", {
    expression: "window.location.href",
    returnByValue: true
  });
  return result.result.value || "";
};

const clearAuthSession = async (client) => {
  await client.send("Runtime.evaluate", {
    expression:
      `
        localStorage.removeItem('geo-workstation.auth-token');
        localStorage.removeItem('geo-workstation.auth-user');
        localStorage.removeItem('geo-workstation.auth-current-company-id');
        sessionStorage.clear();
        document.cookie.split(';').forEach((cookie) => {
          const name = cookie.split('=')[0]?.trim();
          if (name) {
            document.cookie = name + '=; Max-Age=0; path=/';
          }
        });
      `,
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

const aftersalesKbLoopSource = [
  await readFile(path.join(repoRoot, "apps/web/src/views/AftersalesQaView.vue"), "utf8"),
  await readFile(path.join(repoRoot, "apps/web/src/api/aftersales-qa.ts"), "utf8")
].join("\n");
for (const snippet of requiredAftersalesKbLoopSnippets) {
  assert(
    aftersalesKbLoopSource.includes(snippet),
    `Aftersales feedback knowledge draft UI missing ${snippet}`
  );
}

const stubApi = process.env.VITE_API_BASE_URL ? undefined : await startStubApi();
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
    (text) => text.includes("登录 GEO 工作站") && text.includes("欢迎回来")
  );
  const unauthenticatedUrl = await readCurrentUrl(client);
  const unauthenticatedPath = new URL(unauthenticatedUrl).pathname;
  assert(
    unauthenticatedPath === "/login" &&
      unauthenticatedText.includes("登录 GEO 工作站") &&
      unauthenticatedText.includes("欢迎回来"),
    `Unauthenticated /dashboard visit must enter the login page. Current URL: ${unauthenticatedUrl}. Text sample: ${unauthenticatedText.slice(0, 400)}`
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
        text.includes("GEO 诊断") && text.includes("诊断结果用于辅助判断品牌覆盖"),
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
  await chrome?.close();
  vite.kill("SIGTERM");
  stubApi?.close();
}

process.stdout.write("Frontend MVP route and offline check passed\n");
