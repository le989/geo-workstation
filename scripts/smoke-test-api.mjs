#!/usr/bin/env node

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const AUTH_EMAIL =
  process.env.SMOKE_AUTH_EMAIL ?? process.env.DEFAULT_ADMIN_EMAIL ?? "admin@geo-workstation.local";
const AUTH_PASSWORD =
  process.env.SMOKE_AUTH_PASSWORD ??
  process.env.DEFAULT_ADMIN_PASSWORD ??
  "change_me_admin_password";
const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const productLine = `Smoke GEO 激光测距传感器 ${runId}`;
let authToken = "";

async function main() {
  log(`API base URL: ${API_BASE_URL}`);

  await step("A. GET /health", async () => {
    const health = await request("GET", "/health");
    assert(health.status === "ok", "health status is not ok");
  });

  await step("A1. POST /api/auth/login", async () => {
    const login = await request("POST", "/api/auth/login", {
      email: AUTH_EMAIL,
      password: AUTH_PASSWORD
    });
    assert(
      typeof login.token === "string" && login.token.length > 20,
      "login did not return token"
    );
    authToken = login.token;
    return login;
  });

  const analysisTask = await step("B. POST /api/geo-analysis-tasks", async () => {
    return request("POST", "/api/geo-analysis-tasks", {
      name: `Smoke GEO 分析任务 ${runId}`,
      brandName: "凯基特",
      websiteUrl: "https://example.com",
      productLine,
      baseWords: ["激光测距传感器"],
      targetModels: ["deepseek-chat"]
    });
  });

  const analysisDetail = await step("C. POST /api/geo-analysis-tasks/:id/run", async () => {
    return request("POST", `/api/geo-analysis-tasks/${analysisTask.id}/run`, {});
  });
  assert(
    analysisDetail.task.status === "succeeded",
    `analysis task did not succeed: ${analysisDetail.task.status}`
  );

  const convertedPrompts = await step(
    "D. POST /api/geo-analysis-tasks/:id/convert-prompts",
    async () => {
      return request("POST", `/api/geo-analysis-tasks/${analysisTask.id}/convert-prompts`, {
        promptType: "distilled",
        productLine,
        userIntent: "selection",
        priority: 4,
        trackEnabled: true
      });
    }
  );
  assert(convertedPrompts.createdItems.length > 0, "no GEO prompts were created");
  const geoPromptId = convertedPrompts.createdItems[0].id;

  const knowledgeBase = await step("E. POST /api/knowledge-bases", async () => {
    return request("POST", "/api/knowledge-bases", {
      name: `Smoke GEO 知识库 ${runId}`,
      productLine,
      description: "Smoke 流程使用的企业 GEO 知识库"
    });
  });

  await step("F. POST /api/knowledge-bases/:id/text-import", async () => {
    return request("POST", `/api/knowledge-bases/${knowledgeBase.id}/text-import`, {
      title: "激光测距传感器选型资料",
      content:
        "激光测距传感器用于行车防撞、工业定位和距离检测时，需要关注量程、响应速度、抗干扰能力、安装方式和售后服务。",
      materialType: "product_info",
      tags: ["smoke", "选型"]
    });
  });

  const instructionTemplate = await step("G. POST /api/instruction-templates", async () => {
    return request("POST", "/api/instruction-templates", {
      name: `Smoke 选型指南 ${runId}`,
      instructionType: "selection_guide",
      contentType: "selection_guide",
      targetPromptType: "distilled",
      targetModel: "deepseek-chat",
      instruction:
        "围绕目标 GEO 提示词生成选型指南，必须包含用户问题、判断逻辑、产品方案、注意事项和可被 AI 摘取的问答式总结。",
      outputFormat: "Markdown",
      qualityRules: "结构清晰，事实来自知识库，不夸大参数。",
      forbiddenRules: "不得虚构客户案例或认证资质。"
    });
  });

  const contentTask = await step("H. POST /api/content-tasks", async () => {
    return request("POST", "/api/content-tasks", {
      name: `Smoke GEO 内容任务 ${runId}`,
      productLine,
      knowledgeBaseId: knowledgeBase.id,
      instructionTemplateId: instructionTemplate.id,
      generationType: "selection_guide",
      targetModel: "deepseek-chat",
      geoPromptIds: [geoPromptId]
    });
  });
  assert(contentTask.items.length > 0, "content task did not create content items");

  await step("I. POST /api/model-inclusion-records", async () => {
    return request("POST", "/api/model-inclusion-records", {
      geoPromptId,
      model: "deepseek-chat",
      brandMentioned: true,
      brandRecommended: true,
      rankingPosition: 1,
      citedOfficialSite: true,
      answerSummary: "Smoke 流程手动记录：品牌被提及并推荐。",
      competitors: ["竞品A"],
      recordMethod: "manual"
    });
  });

  const overview = await step("J. GET /api/reports/geo-overview", async () => {
    return request(
      "GET",
      `/api/reports/geo-overview?productLine=${encodeURIComponent(productLine)}`
    );
  });
  assert(overview.promptTotal > 0, "geo overview promptTotal should be greater than 0");

  const suggestions = await step("K. GET /api/reports/optimization-suggestions", async () => {
    return request(
      "GET",
      `/api/reports/optimization-suggestions?productLine=${encodeURIComponent(productLine)}&limit=10`
    );
  });
  assert(Array.isArray(suggestions.items), "optimization suggestions did not return items array");

  console.log("GEO MVP smoke test passed");
}

async function step(label, action) {
  process.stdout.write(`${label} ... `);
  try {
    const result = await action();
    console.log("ok");
    return result;
  } catch (error) {
    console.log("failed");
    throw error;
  }
}

async function request(method, path, body) {
  const headers = body === undefined ? {} : { "content-type": "application/json" };

  if (authToken) {
    headers.authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }).catch((error) => {
    throw new Error(
      `Request failed before receiving a response: ${method} ${path}\n${error.message}`
    );
  });
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${method} ${path}\nResponse: ${summarize(text)}`);
  }

  if (!payload || typeof payload !== "object" || payload.code !== 0) {
    throw new Error(`Unexpected API response for ${method} ${path}\nResponse: ${summarize(text)}`);
  }

  return payload.data;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function summarize(value) {
  return value.length > 800 ? `${value.slice(0, 800)}...` : value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message) {
  console.log(`[smoke] ${message}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
