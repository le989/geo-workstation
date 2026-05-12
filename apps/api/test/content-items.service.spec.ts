import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, UserIntent, UserRole, UserStatus } from "@prisma/client";
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

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    tasksService = new ContentTasksService(prisma as unknown as PrismaService);
    itemsService = new ContentItemsService(prisma as unknown as PrismaService);

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
});
