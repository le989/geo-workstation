import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, RecordMethod, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ModelInclusionRecordsService } from "../src/modules/model-inclusion/model-inclusion-records.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ModelInclusionRecordsService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ModelInclusionRecordsService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new ModelInclusionRecordsService(prisma as unknown as PrismaService);

    const user = await prisma.user.create({
      data: {
        email: `model-inclusion-service-${runId}@example.com`,
        name: "Phase 2H GEO Model Inclusion Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function unique(label: string): string {
    return `Phase 2H ${label} ${runId}`;
  }

  async function createGeoPrompt(
    label: string,
    options: {
      productLine?: string;
      type?: GeoPromptType;
      userIntent?: UserIntent;
      trackEnabled?: boolean;
      latestCoverageStatus?: string;
    } = {}
  ) {
    return prisma.geoPrompt.create({
      data: {
        type: options.type ?? GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: options.productLine ?? unique("产品线"),
        scenario: "模型覆盖测试",
        userIntent: options.userIntent ?? UserIntent.selection,
        priority: 3,
        trackEnabled: options.trackEnabled ?? true,
        latestCoverageStatus: options.latestCoverageStatus,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  it("creates a manual model inclusion record and updates latestCoverageStatus", async () => {
    const prompt = await createGeoPrompt("手动记录提示词");

    const created = await service.create({
      geoPromptId: prompt.id,
      model: " deepseek-chat ",
      checkedAt: new Date("2026-05-13T10:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: true,
      rankingPosition: 1,
      citedOfficialSite: true,
      answerSummary: "AI 推荐了品牌并引用官网资料。",
      competitors: ["竞品A", "竞品B"],
      createdBy
    });

    expect(created).toMatchObject({
      geoPromptId: prompt.id,
      model: "deepseek-chat",
      brandMentioned: true,
      brandRecommended: true,
      rankingPosition: 1,
      citedOfficialSite: true,
      recordMethod: RecordMethod.manual,
      competitors: ["竞品A", "竞品B"],
      geoPrompt: {
        id: prompt.id,
        promptText: prompt.promptText
      }
    });

    const updatedPrompt = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: prompt.id
      }
    });
    expect(updatedPrompt.latestCoverageStatus).toBe("recommended");
  });

  it("rejects missing prompts, empty models, and invalid ranking positions", async () => {
    await expect(
      service.create({
        geoPromptId: "missing-geo-prompt",
        model: "deepseek-chat",
        createdBy
      })
    ).rejects.toThrow("GEO prompt not found or deleted");

    const prompt = await createGeoPrompt("校验提示词");
    await expect(
      service.create({
        geoPromptId: prompt.id,
        model: " ",
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({
        geoPromptId: prompt.id,
        model: "deepseek-chat",
        rankingPosition: 0,
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists records with filters and includes GEO prompt information", async () => {
    const productLine = unique("筛选产品线");
    const matchedPrompt = await createGeoPrompt("列表匹配", {
      productLine,
      type: GeoPromptType.brand,
      userIntent: UserIntent.brand_verification
    });
    const otherPrompt = await createGeoPrompt("列表不匹配", {
      productLine: unique("其他产品线"),
      type: GeoPromptType.scene,
      userIntent: UserIntent.application_solution
    });

    await service.create({
      geoPromptId: matchedPrompt.id,
      model: "kimi-k2",
      brandMentioned: true,
      brandRecommended: false,
      citedOfficialSite: true,
      recordMethod: RecordMethod.api,
      answerSummary: "Kimi 提及品牌但没有推荐。",
      createdBy
    });
    await service.create({
      geoPromptId: otherPrompt.id,
      model: "deepseek-chat",
      brandMentioned: false,
      brandRecommended: false,
      recordMethod: RecordMethod.manual,
      createdBy
    });

    const result = await service.findMany({
      page: 1,
      pageSize: 10,
      model: "kimi-k2",
      brandMentioned: true,
      brandRecommended: false,
      citedOfficialSite: true,
      recordMethod: RecordMethod.api,
      productLine,
      promptType: GeoPromptType.brand,
      userIntent: UserIntent.brand_verification
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.geoPrompt).toMatchObject({
      id: matchedPrompt.id,
      promptText: matchedPrompt.promptText,
      type: GeoPromptType.brand,
      productLine,
      userIntent: UserIntent.brand_verification
    });
  });

  it("imports rows independently, resolves prompts by promptText, parses booleans, and forces import method", async () => {
    const firstPrompt = await createGeoPrompt("导入提示词A");
    const secondPrompt = await createGeoPrompt("导入提示词B");

    const result = await service.importRecords({
      rows: [
        {
          promptText: firstPrompt.promptText,
          model: "deepseek-chat",
          checkedAt: "2026-05-13T12:00:00.000Z",
          brandMentioned: "是",
          brandRecommended: "yes",
          citedOfficialSite: "1",
          rankingPosition: "2",
          answerSummary: "导入行通过 promptText 匹配提示词。",
          competitors: "竞品A,竞品B",
          recordMethod: "manual",
          createdBy
        },
        {
          geoPromptId: secondPrompt.id,
          model: "kimi-k2",
          brandMentioned: "0",
          brandRecommended: "否",
          citedOfficialSite: false,
          competitors: ["竞品C"],
          createdBy
        },
        {
          promptText: unique("不存在提示词"),
          model: "deepseek-chat"
        },
        {
          promptText: firstPrompt.promptText,
          model: " "
        }
      ]
    });

    expect(result.totalRows).toBe(4);
    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(2);
    expect(result.createdItems[0]).toMatchObject({
      geoPromptId: firstPrompt.id,
      brandMentioned: true,
      brandRecommended: true,
      citedOfficialSite: true,
      rankingPosition: 2,
      competitors: ["竞品A", "竞品B"],
      recordMethod: RecordMethod.import
    });
    expect(result.createdItems[1]).toMatchObject({
      geoPromptId: secondPrompt.id,
      brandMentioned: false,
      brandRecommended: false,
      citedOfficialSite: false,
      competitors: ["竞品C"],
      recordMethod: RecordMethod.import
    });
    expect(result.failedRows).toHaveLength(2);
  });

  it("exports CSV, finds uncovered prompts, and calculates summary rates", async () => {
    const productLine = unique("统计产品线");
    const coveredPrompt = await createGeoPrompt("统计已覆盖", {
      productLine,
      trackEnabled: true
    });
    const mentionedPrompt = await createGeoPrompt("统计已提及", {
      productLine,
      trackEnabled: true
    });
    const uncoveredPrompt = await createGeoPrompt("统计未覆盖", {
      productLine,
      trackEnabled: true
    });
    await createGeoPrompt("统计未追踪", {
      productLine,
      trackEnabled: false
    });

    await service.create({
      geoPromptId: coveredPrompt.id,
      model: "summary-model",
      checkedAt: new Date("2026-05-13T08:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: true,
      citedOfficialSite: true,
      answerSummary: "品牌被推荐。",
      createdBy
    });
    await service.create({
      geoPromptId: mentionedPrompt.id,
      model: "summary-model",
      checkedAt: new Date("2026-05-13T09:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: false,
      citedOfficialSite: false,
      answerSummary: "品牌被提及但未推荐。",
      createdBy
    });
    await service.create({
      geoPromptId: coveredPrompt.id,
      model: "summary-model",
      checkedAt: new Date("2026-05-13T10:00:00.000Z"),
      brandMentioned: false,
      brandRecommended: false,
      citedOfficialSite: false,
      answerSummary: "最新记录未提及品牌。",
      createdBy
    });

    const csv = await service.exportCsv({
      model: "summary-model",
      productLine
    });
    expect(csv).toContain("geoPromptId,promptText,promptType,productLine,model");
    expect(csv).toContain(coveredPrompt.promptText);

    const uncovered = await service.findUncoveredPrompts({
      model: "summary-model",
      productLine,
      trackEnabled: true,
      page: 1,
      pageSize: 10
    });
    expect(uncovered.total).toBe(1);
    expect(uncovered.items[0]?.geoPromptId).toBe(uncoveredPrompt.id);

    const summary = await service.getSummary({
      model: "summary-model",
      productLine
    });
    expect(summary.totalRecords).toBe(3);
    expect(summary.mentionedCount).toBe(2);
    expect(summary.notMentionedCount).toBe(1);
    expect(summary.recommendedCount).toBe(1);
    expect(summary.brandMentionRate).toBeCloseTo(2 / 3, 5);
    expect(summary.brandRecommendRate).toBeCloseTo(1 / 3, 5);

    const refreshedPrompt = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: coveredPrompt.id
      }
    });
    expect(refreshedPrompt.latestCoverageStatus).toBe("not_mentioned");
  });
});
