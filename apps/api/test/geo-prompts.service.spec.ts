import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GeoPromptsService } from "../src/modules/geo-prompts/geo-prompts.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoPromptsService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: GeoPromptsService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new GeoPromptsService(prisma as unknown as PrismaService);

    const user = await prisma.user.create({
      data: {
        email: `geo-prompts-service-${runId}@example.com`,
        name: "Phase 2B GEO Prompt Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function uniquePrompt(label: string): string {
    return `Phase 2B ${label} ${runId}`;
  }

  it("creates one GEO prompt and normalizes GEO prompt text fields", async () => {
    const created = await service.create({
      type: GeoPromptType.base,
      baseWord: "  激光测距传感器  ",
      promptText: `  ${uniquePrompt("创建成功")}  `,
      productLine: "  激光测距传感器  ",
      scenario: "  选型  ",
      userIntent: UserIntent.selection,
      priority: 2,
      targetModels: ["deepseek-chat"],
      source: "  手工录入  ",
      trackEnabled: true,
      latestCoverageStatus: "untracked",
      createdBy
    });

    expect(created.promptText).toBe(uniquePrompt("创建成功"));
    expect(created.baseWord).toBe("激光测距传感器");
    expect(created.productLine).toBe("激光测距传感器");
    expect(created.trackEnabled).toBe(true);
    expect(created.createdBy).toBe(createdBy);
  });

  it("rejects duplicate active promptText when creating a GEO prompt", async () => {
    const promptText = uniquePrompt("重复创建");
    await service.create({
      type: GeoPromptType.base,
      promptText,
      userIntent: UserIntent.selection,
      createdBy
    });

    await expect(
      service.create({
        type: GeoPromptType.scene,
        promptText,
        userIntent: UserIntent.application_solution,
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("queries GEO prompts with pagination and GEO filters", async () => {
    const productLine = uniquePrompt("产品线筛选");
    await service.create({
      type: GeoPromptType.brand,
      promptText: uniquePrompt("品牌词筛选"),
      productLine,
      userIntent: UserIntent.brand_verification,
      priority: 1,
      trackEnabled: true,
      createdBy
    });
    await service.create({
      type: GeoPromptType.base,
      promptText: uniquePrompt("训练词不匹配"),
      productLine: uniquePrompt("其他产品线"),
      userIntent: UserIntent.selection,
      trackEnabled: false,
      createdBy
    });

    const result = await service.findMany({
      page: 1,
      pageSize: 10,
      type: GeoPromptType.brand,
      productLine,
      userIntent: UserIntent.brand_verification,
      trackEnabled: true
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(1);
    expect(result.items[0]?.promptText).toBe(uniquePrompt("品牌词筛选"));
  });

  it("updates a GEO prompt while preserving duplicate protection", async () => {
    const first = await service.create({
      type: GeoPromptType.distilled,
      promptText: uniquePrompt("待更新"),
      userIntent: UserIntent.comparison,
      createdBy
    });
    const duplicateTarget = await service.create({
      type: GeoPromptType.scene,
      promptText: uniquePrompt("重复更新目标"),
      userIntent: UserIntent.application_solution,
      createdBy
    });

    const updated = await service.update(first.id, {
      promptText: uniquePrompt("更新后"),
      priority: 5,
      trackEnabled: true
    });

    expect(updated.promptText).toBe(uniquePrompt("更新后"));
    expect(updated.priority).toBe(5);
    expect(updated.trackEnabled).toBe(true);

    await expect(
      service.update(first.id, {
        promptText: duplicateTarget.promptText
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("soft deletes a GEO prompt and hides it from normal list queries", async () => {
    const promptText = uniquePrompt("软删除");
    const created = await service.create({
      type: GeoPromptType.base,
      promptText,
      userIntent: UserIntent.selection,
      createdBy
    });

    const deleted = await service.softDelete(created.id);
    expect(deleted.deleted).toBe(true);
    expect(deleted.alreadyDeleted).toBe(false);

    const deletedAgain = await service.softDelete(created.id);
    expect(deletedAgain.deleted).toBe(true);
    expect(deletedAgain.alreadyDeleted).toBe(true);

    const list = await service.findMany({
      search: promptText,
      page: 1,
      pageSize: 10
    });
    expect(list.total).toBe(0);
  });

  it("bulk imports valid rows and reports batch duplicates, database duplicates, and failed rows", async () => {
    const databaseDuplicate = uniquePrompt("数据库重复");
    await service.create({
      type: GeoPromptType.base,
      promptText: databaseDuplicate,
      userIntent: UserIntent.selection,
      createdBy
    });

    const batchPrompt = uniquePrompt("批量导入成功");
    const result = await service.bulkImport({
      rows: [
        {
          type: GeoPromptType.base,
          baseWord: " 激光测距传感器 ",
          promptText: ` ${batchPrompt} `,
          productLine: " 激光测距传感器 ",
          userIntent: UserIntent.selection,
          priority: 3,
          targetModels: ["deepseek-chat"],
          source: " 批量导入 ",
          trackEnabled: false
        },
        {
          type: GeoPromptType.distilled,
          promptText: batchPrompt,
          userIntent: UserIntent.selection
        },
        {
          type: GeoPromptType.brand,
          promptText: databaseDuplicate,
          userIntent: UserIntent.brand_verification
        },
        {
          type: "scene",
          promptText: "",
          priority: 8
        }
      ]
    });

    expect(result.totalRows).toBe(4);
    expect(result.successCount).toBe(1);
    expect(result.duplicateCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(3);
    expect(result.createdItems[0]?.promptText).toBe(batchPrompt);
    expect(result.duplicateRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 2,
          promptText: batchPrompt,
          reason: "duplicate_in_batch"
        }),
        expect.objectContaining({
          rowIndex: 3,
          promptText: databaseDuplicate,
          reason: "duplicate_in_database"
        })
      ])
    );
    expect(result.failedRows[0]?.errors.length).toBeGreaterThan(0);
  });

  it("exports filtered GEO prompts as CSV text", async () => {
    const productLine = uniquePrompt("CSV产品线");
    const promptText = uniquePrompt("CSV导出");
    await service.create({
      type: GeoPromptType.scene,
      promptText,
      productLine,
      userIntent: UserIntent.application_solution,
      targetModels: ["deepseek-chat", "kimi"],
      createdBy
    });

    const csv = await service.exportCsv({
      productLine
    });

    expect(csv).toContain("id,type,baseWord,promptText,productLine");
    expect(csv).toContain(promptText);
    expect(csv).toContain('"[""deepseek-chat"",""kimi""]"');
  });
});
