import { GeoPromptType, TaskStatus, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ContentTasksService } from "../src/modules/geo-content/content-tasks.service";
import { GeoAnalysisTasksService } from "../src/modules/geo-analysis/geo-analysis-tasks.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoAnalysisTasksService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: GeoAnalysisTasksService;
  let createdBy: string;
  let productLine: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    const prismaService = prisma as unknown as PrismaService;
    service = new GeoAnalysisTasksService(prismaService, new ContentTasksService(prismaService));

    const user = await prisma.user.create({
      data: {
        email: `geo-analysis-service-${runId}@example.com`,
        name: "Phase 2J GEO Analysis Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
    productLine = `Phase 2J 激光测距传感器 ${runId}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createTask(label: string, overrides: Record<string, unknown> = {}) {
    return service.create({
      name: `Phase 2J ${label} ${runId}`,
      brandName: "凯基特",
      websiteUrl: "https://example.com",
      productLine,
      baseWords: ["激光测距传感器"],
      targetModels: ["deepseek-chat", "kimi-k2"],
      createdBy,
      ...overrides
    });
  }

  it("creates a pending GEO analysis task and rejects empty target models", async () => {
    const task = await createTask("创建");

    expect(task.status).toBe(TaskStatus.pending);
    expect(task.brandName).toBe("凯基特");
    expect(task.targetModels).toEqual(["deepseek-chat", "kimi-k2"]);

    await expect(
      service.create({
        name: `Phase 2J 空模型 ${runId}`,
        brandName: "凯基特",
        targetModels: [],
        createdBy
      })
    ).rejects.toThrow("targetModels must contain at least one target model");
  });

  it("queries tasks with pagination and status/productLine filters", async () => {
    await createTask("列表筛选 A");
    await createTask("列表筛选 B", {
      productLine: `${productLine} 其他`
    });

    const result = await service.findMany({
      page: 1,
      pageSize: 10,
      status: TaskStatus.pending,
      productLine
    });

    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items.every((item) => item.status === TaskStatus.pending)).toBe(true);
    expect(result.items.every((item) => item.productLine === productLine)).toBe(true);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("returns task detail with modelResults and edits pending tasks", async () => {
    const task = await createTask("详情与编辑");
    const detail = await service.getDetail(task.id);

    expect(detail.task.id).toBe(task.id);
    expect(detail.modelResults).toEqual([]);

    const updated = await service.update(task.id, {
      name: `Phase 2J 已编辑 ${runId}`,
      brandName: "凯基特传感器",
      targetModels: ["deepseek-chat"]
    });

    expect(updated.name).toContain("已编辑");
    expect(updated.brandName).toBe("凯基特传感器");
    expect(updated.targetModels).toEqual(["deepseek-chat"]);
  });

  it("rejects editing a running task", async () => {
    const running = await prisma.geoAnalysisTask.create({
      data: {
        name: `Phase 2J running ${runId}`,
        brandName: "凯基特",
        productLine,
        targetModels: ["deepseek-chat"],
        status: TaskStatus.running,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    await expect(
      service.update(running.id, {
        name: "不应允许编辑"
      })
    ).rejects.toThrow("running GEO analysis task cannot be edited");
  });

  it("runs mock GEO analysis and stores model results, gaps and suggestions", async () => {
    const task = await createTask("执行分析");
    const result = await service.run(task.id);

    expect(result.task.status).toBe(TaskStatus.succeeded);
    expect(result.modelResults).toHaveLength(2);
    expect(result.modelResults.every((item) => item.rawAnswer?.includes("Mock GEO 分析"))).toBe(
      true
    );
    expect(result.task.summary).toMatchObject({
      isMock: true
    });
    expect(result.task.contentGaps.length).toBeGreaterThanOrEqual(3);
    expect(result.task.knowledgeGaps.length).toBeGreaterThanOrEqual(3);
    expect(result.task.promptSuggestions.length).toBeGreaterThanOrEqual(5);
  });

  it("converts prompt suggestions into geo_prompts and skips duplicates", async () => {
    const task = await createTask("转提示词");
    await service.run(task.id);

    const converted = await service.convertPrompts(task.id, {
      promptType: GeoPromptType.distilled,
      userIntent: UserIntent.selection,
      priority: 4,
      trackEnabled: true,
      createdBy
    });

    expect(converted.createdCount).toBeGreaterThanOrEqual(5);
    expect(converted.skippedCount).toBe(0);
    expect(converted.createdItems.every((item) => item.source === `geo_analysis:${task.id}`)).toBe(
      true
    );

    const convertedAgain = await service.convertPrompts(task.id, {
      createdBy
    });

    expect(convertedAgain.createdCount).toBe(0);
    expect(convertedAgain.skippedCount).toBeGreaterThanOrEqual(5);
  });

  it("creates a GEO content task by reusing content generation logic", async () => {
    const task = await createTask("创建内容任务");
    await service.run(task.id);
    await service.convertPrompts(task.id, {
      createdBy
    });

    const created = await service.createContentTask(task.id, {
      generationType: "article",
      targetModel: "deepseek-chat",
      createdBy
    });

    expect(created.task.status).toBe(TaskStatus.succeeded);
    expect(created.items.length).toBeGreaterThan(0);
    expect(created.items.every((item) => item.title.includes("Mock GEO内容"))).toBe(true);
  });
});
