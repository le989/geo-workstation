import { BadRequestException } from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { KnowledgeBasesService } from "../src/modules/geo-knowledge/knowledge-bases.service";
import { KnowledgeChunksService } from "../src/modules/geo-knowledge/knowledge-chunks.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("KnowledgeBasesService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let knowledgeBasesService: KnowledgeBasesService;
  let knowledgeChunksService: KnowledgeChunksService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    knowledgeBasesService = new KnowledgeBasesService(prisma as unknown as PrismaService);
    knowledgeChunksService = new KnowledgeChunksService(prisma as unknown as PrismaService);

    const user = await prisma.user.create({
      data: {
        email: `knowledge-service-${runId}@example.com`,
        name: "Phase 2D GEO Knowledge Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function uniqueName(label: string): string {
    return `激光测距传感器${label}${runId}`;
  }

  it("creates a GEO knowledge base and rejects an empty name", async () => {
    const created = await knowledgeBasesService.create({
      name: `  ${uniqueName("知识库")}  `,
      productLine: " 激光测距传感器 ",
      description: " 面向 GEO 内容生成的事实底座 ",
      createdBy
    });

    expect(created).toMatchObject({
      name: uniqueName("知识库"),
      productLine: "激光测距传感器",
      status: "active",
      createdBy
    });

    await expect(
      knowledgeBasesService.create({
        name: " ",
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects duplicate knowledge base names within the same product line", async () => {
    const name = uniqueName("重复");
    await knowledgeBasesService.create({
      name,
      productLine: "重复产品线",
      createdBy
    });

    await expect(
      knowledgeBasesService.create({
        name: ` ${name} `,
        productLine: "重复产品线",
        createdBy
      })
    ).rejects.toThrow(`Active GEO knowledge base already exists: ${name}`);
  });

  it("lists knowledge bases with pagination and productLine filters", async () => {
    const productLineA = `列表产品线A${runId}`;
    const productLineB = `列表产品线B${runId}`;
    await knowledgeBasesService.create({
      name: uniqueName("列表A"),
      productLine: productLineA,
      createdBy
    });
    await knowledgeBasesService.create({
      name: uniqueName("列表B"),
      productLine: productLineB,
      createdBy
    });

    const result = await knowledgeBasesService.findMany({
      page: 1,
      pageSize: 10,
      productLine: productLineA
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(1);
    expect(result.items[0]?.productLine).toBe(productLineA);
  });

  it("returns knowledge base details with chunk counts and latest chunks", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("详情"),
      productLine: "详情产品线",
      createdBy
    });
    await knowledgeBasesService.textImport(knowledgeBase.id, {
      title: "产品优势",
      content: "激光测距传感器具备高精度、稳定输出和复杂工业场景适配能力。",
      materialType: "product_info",
      createdBy
    });

    const detail = await knowledgeBasesService.getDetail(knowledgeBase.id);

    expect(detail.knowledgeBase.id).toBe(knowledgeBase.id);
    expect(detail.filesCount).toBe(0);
    expect(detail.chunksCount).toBe(1);
    expect(detail.latestChunks[0]?.title).toBe("产品优势");
  });

  it("updates and soft deletes knowledge bases, then excludes them from lists", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("删除前"),
      productLine: "删除产品线",
      createdBy
    });

    const updated = await knowledgeBasesService.update(knowledgeBase.id, {
      name: uniqueName("删除后"),
      description: "更新后的 GEO 知识资产说明"
    });
    expect(updated.name).toBe(uniqueName("删除后"));

    const deleted = await knowledgeBasesService.softDelete(knowledgeBase.id);
    expect(deleted.alreadyDeleted).toBe(false);

    const idempotent = await knowledgeBasesService.softDelete(knowledgeBase.id);
    expect(idempotent.alreadyDeleted).toBe(true);

    const list = await knowledgeBasesService.findMany({
      search: uniqueName("删除后")
    });
    expect(list.total).toBe(0);
  });

  it("text-import creates a knowledge chunk, inherits product line, and rejects deleted bases", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("文本导入"),
      productLine: "文本导入产品线",
      createdBy
    });

    const chunk = await knowledgeBasesService.textImport(knowledgeBase.id, {
      title: "  选型参数  ",
      content: "  选型时应关注量程、精度、响应速度、安装方式和现场干扰环境。  ",
      materialType: "solution",
      tags: ["  选型 ", "", "GEO素材"],
      createdBy
    });

    expect(chunk).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      fileId: null,
      title: "选型参数",
      sourceType: "pasted_text",
      productLine: "文本导入产品线",
      materialType: "solution",
      tags: ["选型", "GEO素材"]
    });

    await knowledgeBasesService.softDelete(knowledgeBase.id);
    await expect(
      knowledgeBasesService.textImport(knowledgeBase.id, {
        title: "已删除知识库",
        content: "已删除知识库不能继续导入 GEO 知识片段。",
        createdBy
      })
    ).rejects.toThrow(`Deleted GEO knowledge base cannot accept text import: ${knowledgeBase.id}`);
  });

  it("queries, updates, and soft deletes knowledge chunks", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("片段管理"),
      productLine: "片段产品线",
      createdBy
    });
    const chunk = await knowledgeBasesService.textImport(knowledgeBase.id, {
      title: "应用案例",
      content: "某工业现场使用激光测距传感器进行行车防撞和位置检测。",
      sourceType: "text_import",
      materialType: "case",
      tags: ["案例", "行车防撞"],
      createdBy
    });

    const list = await knowledgeChunksService.findMany(knowledgeBase.id, {
      page: 1,
      pageSize: 5,
      search: "行车防撞",
      tags: ["案例"]
    });
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(chunk.id);

    const updated = await knowledgeChunksService.update(chunk.id, {
      title: "行车防撞应用案例",
      content: "行车防撞场景中，激光测距传感器可提供连续距离数据支持安全联锁。",
      tags: ["案例", "安全"]
    });
    expect(updated.title).toBe("行车防撞应用案例");
    expect(updated.tags).toEqual(["案例", "安全"]);

    const deleted = await knowledgeChunksService.softDelete(chunk.id);
    expect(deleted.alreadyDeleted).toBe(false);

    const afterDelete = await knowledgeChunksService.findMany(knowledgeBase.id, {
      search: "行车防撞"
    });
    expect(afterDelete.total).toBe(0);
  });
});
