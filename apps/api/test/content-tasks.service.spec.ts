import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, TaskStatus, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ContentTasksService } from "../src/modules/geo-content/content-tasks.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ContentTasksService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ContentTasksService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new ContentTasksService(prisma as unknown as PrismaService);

    const user = await prisma.user.create({
      data: {
        email: `content-task-service-${runId}@example.com`,
        name: "Phase 2G GEO Content Operator",
        role: UserRole.content_editor,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function unique(label: string): string {
    return `Phase 2G ${label} ${runId}`;
  }

  async function createGeoPrompt(label: string) {
    return prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: "激光测距传感器",
        scenario: "行车防撞",
        userIntent: UserIntent.selection,
        priority: 3,
        targetModels: ["deepseek-chat"],
        source: "phase_2g_test",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  async function createKnowledgeBase(label: string) {
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: unique(label),
        productLine: "激光测距传感器",
        description: "GEO 内容生成可引用的事实底座",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    await prisma.knowledgeChunk.create({
      data: {
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        title: "行车防撞应用资料",
        content: "激光测距传感器可用于行车防撞，提供连续距离检测、快速响应和现场抗干扰能力。",
        sourceType: "pasted_text",
        productLine: "激光测距传感器",
        materialType: "solution",
        tags: ["GEO素材", "应用方案"]
      }
    });

    return knowledgeBase;
  }

  async function createInstructionTemplate(label: string) {
    return prisma.instructionTemplate.create({
      data: {
        name: unique(label),
        instructionType: "selection_guide",
        contentType: "selection_guide",
        targetPromptType: GeoPromptType.distilled,
        targetModel: "deepseek-chat",
        instruction:
          "请围绕 GEO 提示词生成选型指南，突出品牌实体、应用场景、结构化问答和可引用事实。",
        outputFormat: "markdown",
        qualityRules: "必须包含用户问题、选型逻辑和 FAQ 总结。",
        forbiddenRules: "不得伪造客户或认证。",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  it("creates a content task, generates content items, and records a mock AI call log", async () => {
    const prompt = await createGeoPrompt("创建内容任务提示词");
    const knowledgeBase = await createKnowledgeBase("创建内容任务知识库");
    const instructionTemplate = await createInstructionTemplate("创建内容任务指令");

    const result = await service.create({
      name: ` ${unique("创建任务")} `,
      productLine: " 激光测距传感器 ",
      knowledgeBaseId: knowledgeBase.id,
      instructionTemplateId: instructionTemplate.id,
      generationType: "selection_guide",
      targetModel: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });

    expect(result.task).toMatchObject({
      name: unique("创建任务"),
      status: TaskStatus.succeeded,
      provider: "mock",
      model: "mock-content-v1"
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      geoPromptId: prompt.id,
      status: "draft",
      suggestedPublishChannel: "官网知识库 / 公众号 / B2B 产品页"
    });
    expect(result.items[0]?.body).toContain("Mock 生成结果");

    const aiCallLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "content_task",
        relatedId: result.task.id,
        provider: "mock",
        purpose: "content_generation"
      }
    });
    expect(aiCallLog?.status).toBe("succeeded");
  });

  it("creates content with an openai_compatible provider when selected", async () => {
    const prompt = await createGeoPrompt("真实Provider内容提示词");
    const generateText = vi.fn(async () => ({
      text: JSON.stringify({
        title: "真实 AI GEO 内容标题",
        body: "真实 AI 生成正文，用于验证 OpenAI-compatible Provider 可以参与 GEO 内容生成流程，并保持内容项真实入库。",
        geoOptimizationPoints: ["围绕提示词回答", "补充品牌可引用事实"],
        suggestedPublishChannel: "官网 GEO 内容专区"
      }),
      provider: "openai_compatible",
      model: "deepseek-chat",
      tokenInput: 21,
      tokenOutput: 34,
      raw: { id: "chatcmpl-content-test" }
    }));
    const providerAwareService = new (ContentTasksService as unknown as new (
      prisma: PrismaService,
      aiProviderService: { generateText: typeof generateText },
      projectProfileService: {
        getPromptContext: () => Promise<{
          projectName: string;
          brandName: string;
          industry: string;
          mainProducts: string[];
          targetCustomers: string;
          positioning: string;
          tone: string;
          forbiddenClaims: string[];
          targetModels: string[];
          createdAt: Date;
          updatedAt: Date;
          id: string;
        }>;
      }
    ) => ContentTasksService)(
      prisma as unknown as PrismaService,
      { generateText },
      {
        getPromptContext: async () => ({
          id: "project-profile-test",
          projectName: "跨行业 GEO 项目",
          brandName: "通用品牌",
          industry: "用户自由填写行业",
          mainProducts: ["产品", "服务", "课程", "门店"],
          targetCustomers: "正在向 AI 咨询方案的人群",
          positioning: "可信赖的项目上下文",
          tone: "专业、克制、可信",
          forbiddenClaims: ["不要承诺效果", "不要编造价格"],
          targetModels: ["deepseek", "kimi"],
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    );

    const result = await providerAwareService.create({
      name: unique("真实Provider内容任务"),
      productLine: "激光测距传感器",
      generationType: "article",
      provider: "openai_compatible",
      model: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });

    expect(generateText).toHaveBeenCalledOnce();
    const generateInput = generateText.mock.calls[0]?.[0];
    expect(generateInput?.systemPrompt).toContain("全局通用质量规则");
    expect(generateInput?.userPrompt).toContain("项目档案 / 品牌上下文");
    expect(generateInput?.userPrompt).toContain("跨行业 GEO 项目");
    expect(generateInput?.userPrompt).toContain("主营产品 / 服务 / 课程 / 门店 / 个人品牌方向");
    expect(generateInput?.userPrompt).toContain("项目档案只用于品牌语气、受众和基础上下文");
    expect(generateInput?.userPrompt).toContain("不得编造具体型号、参数、精度、量程");
    expect(generateInput?.userPrompt).toContain("需结合具体资料确认");
    expect(generateInput?.userPrompt).toContain("不要建议用户自行修改功率");
    expect(generateInput?.userPrompt).toContain(
      "输出内容要优先写需求决策逻辑、场景确认项、适用边界"
    );
    expect(result.task).toMatchObject({
      provider: "openai_compatible",
      model: "deepseek-chat",
      status: TaskStatus.succeeded
    });
    expect(result.items[0]).toMatchObject({
      title: "真实 AI GEO 内容标题",
      body: expect.stringContaining("真实 AI 生成正文"),
      suggestedPublishChannel: "官网 GEO 内容专区",
      status: "draft"
    });

    const aiCallLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "content_task",
        relatedId: result.task.id,
        provider: "openai_compatible",
        model: "deepseek-chat",
        purpose: "content_generation"
      }
    });
    expect(aiCallLog).toMatchObject({
      status: "succeeded",
      tokenInput: 21,
      tokenOutput: 34
    });
  });

  it("keeps content tasks viewable and records failed logs when openai_compatible generation fails", async () => {
    const prompt = await createGeoPrompt("真实Provider失败提示词");
    const generateText = vi.fn(async () => {
      throw new Error("模型不可用或名称错误，请检查后端 AI Provider 配置。");
    });
    const providerAwareService = new (ContentTasksService as unknown as new (
      prisma: PrismaService,
      aiProviderService: { generateText: typeof generateText }
    ) => ContentTasksService)(prisma as unknown as PrismaService, { generateText });

    const result = await providerAwareService.create({
      name: unique("真实Provider失败任务"),
      productLine: "激光测距传感器",
      generationType: "article",
      provider: "openai_compatible",
      model: "missing-model",
      geoPromptIds: [prompt.id],
      createdBy
    });

    expect(generateText).toHaveBeenCalledOnce();
    expect(result.task.status).toBe(TaskStatus.failed);
    expect(result.items[0]).toMatchObject({
      status: "failed",
      errorMessage: expect.stringContaining("模型不可用")
    });

    const detail = await providerAwareService.getDetail(result.task.id);
    expect(detail.items).toHaveLength(1);

    const aiCallLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "content_task",
        relatedId: result.task.id,
        provider: "openai_compatible",
        model: "missing-model",
        purpose: "content_generation"
      }
    });
    expect(aiCallLog?.status).toBe("failed");
  });

  it("rejects empty prompt selections, missing prompts, and deleted knowledge bases", async () => {
    await expect(
      service.create({
        name: unique("空提示词失败"),
        generationType: "faq",
        geoPromptIds: [],
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({
        name: unique("不存在提示词失败"),
        generationType: "faq",
        geoPromptIds: ["missing-geo-prompt"],
        createdBy
      })
    ).rejects.toThrow("GEO prompts not found or deleted");

    const prompt = await createGeoPrompt("已删除知识库提示词");
    const knowledgeBase = await createKnowledgeBase("已删除知识库");
    await prisma.knowledgeBase.update({
      where: {
        id: knowledgeBase.id
      },
      data: {
        deletedAt: new Date()
      }
    });

    await expect(
      service.create({
        name: unique("已删除知识库失败"),
        knowledgeBaseId: knowledgeBase.id,
        generationType: "article",
        geoPromptIds: [prompt.id],
        createdBy
      })
    ).rejects.toThrow(`GEO knowledge base not found or deleted: ${knowledgeBase.id}`);
  });

  it("lists content tasks and returns task detail with items, prompts, and related assets", async () => {
    const prompt = await createGeoPrompt("任务列表提示词");
    const knowledgeBase = await createKnowledgeBase("任务列表知识库");
    const instructionTemplate = await createInstructionTemplate("任务列表指令");
    const created = await service.create({
      name: unique("任务列表"),
      productLine: "任务列表产品线",
      knowledgeBaseId: knowledgeBase.id,
      instructionTemplateId: instructionTemplate.id,
      generationType: "application_solution",
      targetModel: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });

    const list = await service.findMany({
      page: 1,
      pageSize: 10,
      status: TaskStatus.succeeded,
      productLine: "任务列表产品线",
      generationType: "application_solution",
      targetModel: "deepseek-chat",
      createdBy
    });
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(created.task.id);

    const detail = await service.getDetail(created.task.id);
    expect(detail.task.id).toBe(created.task.id);
    expect(detail.items).toHaveLength(1);
    expect(detail.prompts[0]?.id).toBe(prompt.id);
    expect(detail.knowledgeBase?.id).toBe(knowledgeBase.id);
    expect(detail.instructionTemplate?.id).toBe(instructionTemplate.id);
    expect(detail.aiCallLogs.length).toBeGreaterThan(0);
  });

  it("retries failed content items without duplicating succeeded items", async () => {
    const firstPrompt = await createGeoPrompt("重试成功提示词");
    const secondPrompt = await createGeoPrompt("重试失败提示词");
    const created = await service.create({
      name: unique("重试任务"),
      productLine: "重试产品线",
      generationType: "qa_material",
      geoPromptIds: [firstPrompt.id, secondPrompt.id],
      createdBy
    });
    const failedItem = created.items[1];
    expect(failedItem).toBeDefined();

    await prisma.contentItem.update({
      where: {
        id: failedItem!.id
      },
      data: {
        title: "生成失败占位",
        body: "Mock 生成失败占位内容，等待重试恢复。",
        status: "failed",
        errorMessage: "phase 2g retry test"
      }
    });
    await prisma.contentTask.update({
      where: {
        id: created.task.id
      },
      data: {
        status: TaskStatus.failed
      }
    });

    const retried = await service.retry(created.task.id);
    expect(retried.task.status).toBe(TaskStatus.succeeded);
    expect(retried.items).toHaveLength(2);
    expect(retried.items.filter((item) => item.status === "draft")).toHaveLength(2);

    const itemCount = await prisma.contentItem.count({
      where: {
        taskId: created.task.id,
        deletedAt: null
      }
    });
    expect(itemCount).toBe(2);

    const logs = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_task",
        relatedId: created.task.id,
        purpose: "content_generation"
      }
    });
    expect(logs).toBe(2);
  });
});
