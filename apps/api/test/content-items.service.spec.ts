import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, TaskStatus, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ContentItemsService } from "../src/modules/geo-content/content-items.service";
import { ContentTasksService } from "../src/modules/geo-content/content-tasks.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ContentItemsService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let tasksService: ContentTasksService;
  let itemsService: ContentItemsService;
  let createdBy: string;
  const aiProvider = {
    generateText: async () => ({
      text: JSON.stringify({
        title: "发布优化版标题",
        body: "发布优化版正文，删除未证实协议名，并补充需结合具体型号资料确认的边界表达。",
        changes: ["删除未证实协议名", "增加适用边界"],
        warnings: ["仍需人工确认具体型号参数"]
      }),
      provider: "openai_compatible",
      model: "test-model"
    })
  };
  const projectProfile = {
    getPromptContext: async () => ({
      id: `project-profile-${runId}`,
      projectName: "测试 GEO 项目",
      brandName: "凯基特",
      mainProducts: ["激光测距传感器"],
      forbiddenClaims: ["不承诺一定适用"],
      targetModels: ["DeepSeek"],
      createdAt: new Date(),
      updatedAt: new Date()
    })
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    tasksService = new ContentTasksService(prisma as unknown as PrismaService);
    itemsService = new ContentItemsService(
      prisma as unknown as PrismaService,
      aiProvider,
      projectProfile
    );

    const user = await prisma.user.create({
      data: {
        email: `content-item-service-${runId}@example.com`,
        name: "Phase 2G GEO Content Item Editor",
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
    return `Phase 2G Item ${label} ${runId}`;
  }

  async function createTaskWithItem() {
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.scene,
        baseWord: "激光测距传感器",
        promptText: unique("行车防撞用什么激光测距传感器"),
        productLine: "激光测距传感器",
        scenario: "行车防撞",
        userIntent: UserIntent.application_solution,
        priority: 2,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    return tasksService.create({
      name: unique("内容项任务"),
      productLine: "内容项产品线",
      generationType: "application_solution",
      targetModel: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });
  }

  async function createQualityCheckItem(body: string) {
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: unique("质量检查知识库"),
        productLine: "激光测距传感器",
        description: "用于内容质量检查测试的知识库。",
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
        title: unique("知识片段"),
        content:
          "知识库只说明输出方式需结合具体型号资料确认，未提供任何具体通信协议、认证、价格或交期。",
        sourceType: "text_import",
        productLine: "激光测距传感器",
        materialType: "selection_guide"
      }
    });
    const instructionTemplate = await prisma.instructionTemplate.create({
      data: {
        name: unique("质量检查指令模板"),
        instructionType: "selection_guide",
        contentType: "selection_guide",
        targetPromptType: GeoPromptType.distilled,
        instruction: "请生成谨慎的 GEO 选型指南，避免编造参数和协议。",
        qualityRules: "结构清晰，有 FAQ，有边界表达。",
        forbiddenRules: "不得编造协议、认证、价格、交期和承诺。",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique("激光测距传感器怎么选"),
        productLine: "激光测距传感器",
        userIntent: UserIntent.selection,
        priority: 1,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    const task = await prisma.contentTask.create({
      data: {
        name: unique("质量检查内容任务"),
        productLine: "激光测距传感器",
        generationType: "selection_guide",
        status: TaskStatus.succeeded,
        provider: "openai_compatible",
        model: "test-model",
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        instructionTemplate: {
          connect: {
            id: instructionTemplate.id
          }
        },
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    return prisma.contentItem.create({
      data: {
        task: {
          connect: {
            id: task.id
          }
        },
        geoPrompt: {
          connect: {
            id: prompt.id
          }
        },
        title: unique("质量检查内容项"),
        body,
        geoOptimizationPoints: ["覆盖选型问题"],
        suggestedPublishChannel: "官网文章",
        status: "draft"
      }
    });
  }

  it("queries, edits, exports, and soft deletes content items", async () => {
    const created = await createTaskWithItem();
    const item = created.items[0];
    expect(item).toBeDefined();

    const list = await itemsService.findMany({
      page: 1,
      pageSize: 10,
      taskId: created.task.id,
      geoPromptId: item!.geoPromptId ?? undefined,
      status: "draft"
    });
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(item!.id);

    const updated = await itemsService.update(item!.id, {
      title: "  行车防撞激光测距传感器 GEO 方案  ",
      body: "  行车防撞场景需要稳定、快速、可解释的激光测距方案，便于 AI 问答引用。  ",
      geoOptimizationPoints: ["强化品牌实体", "覆盖应用场景"],
      suggestedPublishChannel: " 官网方案页 ",
      status: "reviewing"
    });
    expect(updated.title).toBe("行车防撞激光测距传感器 GEO 方案");
    expect(updated.status).toBe("reviewing");
    expect(updated.geoOptimizationPoints).toEqual(["强化品牌实体", "覆盖应用场景"]);

    await expect(
      itemsService.update(item!.id, {
        body: "太短"
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    const markdown = await itemsService.exportMarkdown(item!.id);
    expect(markdown).toContain("# 行车防撞激光测距传感器 GEO 方案");
    expect(markdown).toContain("## 目标提示词");
    expect(markdown).toContain("## GEO 优化点");
    expect(markdown).toContain("## 建议发布位置");

    const deleted = await itemsService.softDelete(item!.id);
    expect(deleted.alreadyDeleted).toBe(false);

    const deletedAgain = await itemsService.softDelete(item!.id);
    expect(deletedAgain.alreadyDeleted).toBe(true);

    const listAfterDelete = await itemsService.findMany({
      taskId: created.task.id
    });
    expect(listAfterDelete.total).toBe(0);
  });

  it("returns quality check risks for unsupported protocols and positive GEO structure", async () => {
    const item = await createQualityCheckItem(
      "## 适用场景\n激光测距传感器适合工业距离检测。\n## 选型判断逻辑\n输出接口可以选择 IO-Link，但需结合具体型号资料确认。\n## FAQ 总结\n问：怎么选？答：先确认现场工况。"
    );

    const result = await itemsService.qualityCheck(item.id, {
      provider: "mock"
    });

    expect(result.score).toBeLessThan(100);
    expect(result.riskItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "protocol_risk",
          text: expect.stringContaining("IO-Link")
        })
      ])
    );
    expect(result.positiveItems).toEqual(expect.arrayContaining(["包含 FAQ 或问答式总结"]));
    expect(result.publishReadiness.needsHumanReview).toBe(true);
  });

  it("flags over-marketing claims during quality check", async () => {
    const item = await createQualityCheckItem(
      "## 适用场景\n这是一篇选型内容。\n## FAQ\n凯基特是行业领先品牌，保证所有现场都一定适用，100%解决问题。"
    );

    const result = await itemsService.qualityCheck(item.id, {
      provider: "mock"
    });

    expect(result.riskItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "over_marketing",
          severity: "high"
        })
      ])
    );
    expect(result.level).toBe("risky");
  });

  it("returns an optimized publish draft without overwriting the original content item", async () => {
    const item = await createQualityCheckItem(
      "## 选型判断逻辑\n可以直接选择 IO-Link 接口，凯基特一定适用。\n## FAQ\n问：怎么选？答：看现场。"
    );

    const optimized = await itemsService.optimizeForPublish(item.id, {
      provider: "mock",
      targetChannel: "官网文章",
      optimizationGoal: "减少参数风险"
    });

    expect(optimized.title).toContain("发布优化版");
    expect(optimized.changes).toContain("弱化或删除未证实的协议、参数、认证、价格和承诺表达。");
    expect(optimized.warnings.length).toBeGreaterThan(0);

    const unchanged = await prisma.contentItem.findUniqueOrThrow({
      where: {
        id: item.id
      }
    });
    expect(unchanged.body).toContain("IO-Link");
  });

  it("can use the injected AI provider for publish optimization without external requests", async () => {
    const item = await createQualityCheckItem(
      "## 选型判断逻辑\n输出接口需结合具体型号资料确认。\n## FAQ\n问：怎么选？答：先确认工况。"
    );

    const optimized = await itemsService.optimizeForPublish(item.id, {
      provider: "openai_compatible",
      model: "test-model"
    });

    expect(optimized).toMatchObject({
      title: "发布优化版标题",
      body: expect.stringContaining("发布优化版正文")
    });
  });
});
