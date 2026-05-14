import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { GeoPromptType, UserIntent, UserRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { KimiWebSearchProvider } from "../src/modules/model-inclusion/providers/kimi-web-search.provider";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ModelInclusionRecordsController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;
  const kimiProvider = {
    search: async () => ({
      finalAnswer:
        "联网搜索后，推荐海伯森激光测距传感器用于工业高精度检测。官网参考：https://www.hypersen.com/laser",
      rawAnswer:
        "联网搜索后，推荐海伯森激光测距传感器用于工业高精度检测。官网参考：https://www.hypersen.com/laser",
      toolCalls: [
        {
          id: "call_search_1",
          name: "$web_search",
          arguments: {
            search_result: {
              search_id: "controller_search_1"
            }
          },
          searchResultId: "controller_search_1"
        }
      ],
      searchResultId: "controller_search_1",
      citations: [],
      searchResults: [{ searchId: "controller_search_1" }]
    })
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `model-inclusion-controller-${runId}@example.com`,
        name: "Phase 2H GEO Model Inclusion API Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(KimiWebSearchProvider)
      .useValue(kimiProvider)
      .compile();
    app = moduleRef.createNestApplication();
    configureApiApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  function unique(label: string): string {
    return `Phase 2H API ${label} ${runId}`;
  }

  async function createGeoPrompt(label: string, trackEnabled = true) {
    return prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.scene,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: unique("产品线"),
        scenario: "模型覆盖 API 测试",
        userIntent: UserIntent.application_solution,
        priority: 2,
        trackEnabled,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  it("runs model inclusion record APIs through ApiResponse", async () => {
    const prompt = await createGeoPrompt("记录提示词");
    const uncoveredPrompt = await createGeoPrompt("未覆盖提示词");

    const createResponse = await request(app.getHttpServer())
      .post("/api/model-inclusion-records")
      .send({
        geoPromptId: prompt.id,
        model: "deepseek-chat",
        platform: "DeepSeek",
        entryPoint: "manual",
        detectionMethod: "manual",
        deviceType: "desktop",
        isWebSearchEnabled: false,
        isLoggedIn: true,
        checkedAt: "2026-05-13T10:30:00.000Z",
        brandMentioned: true,
        brandRecommended: false,
        citedOfficialSite: "yes",
        citedContentAsset: "no",
        competitorMentioned: "yes",
        rawAnswer: "原始回答正文",
        citations: [{ title: "官网", url: "https://example.com" }],
        searchResults: '[{"title":"搜索结果","url":"https://example.com/search"}]',
        screenshotPath: "manual/deepseek.png",
        answerSummary: "模型提到了品牌，但没有明确推荐。",
        competitors: ["竞品A"],
        createdBy
      })
      .expect(201);
    expect(createResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        geoPromptId: prompt.id,
        model: "deepseek-chat",
        platform: "DeepSeek",
        entryPoint: "manual",
        detectionMethod: "manual",
        deviceType: "desktop",
        isLoggedIn: true,
        brandMentioned: true,
        brandRecommended: false,
        citedOfficialSite: true,
        citedContentAsset: false,
        competitorMentioned: true,
        hitLevel: "mentioned",
        rawAnswer: "原始回答正文",
        citations: [{ title: "官网", url: "https://example.com" }],
        searchResults: [{ title: "搜索结果", url: "https://example.com/search" }],
        screenshotPath: "manual/deepseek.png",
        recordMethod: "manual"
      }
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/model-inclusion-records")
      .query({
        model: "deepseek-chat",
        brandMentioned: "true",
        platform: "DeepSeek",
        entryPoint: "manual",
        hitLevel: "mentioned",
        recordMethod: "manual",
        page: "1",
        pageSize: "10"
      })
      .expect(200);
    expect(listResponse.body.data.total).toBeGreaterThan(0);
    expect(listResponse.body.data.items[0].geoPrompt.promptText).toBeTruthy();

    const importResponse = await request(app.getHttpServer())
      .post("/api/model-inclusion-records/import")
      .send({
        rows: [
          {
            promptText: uncoveredPrompt.promptText,
            model: "deepseek-chat",
            brandMentioned: "否",
            brandRecommended: "0",
            citedOfficialSite: "no",
            citedContentAsset: "是",
            competitorMentioned: "yes",
            platform: "通义",
            entryPoint: "web_search_api",
            detectionMethod: "web_search",
            deviceType: "api",
            isWebSearchEnabled: "1",
            isLoggedIn: "否",
            competitors: "竞品B,竞品C",
            createdBy
          },
          {
            promptText: unique("找不到的提示词"),
            model: "deepseek-chat"
          }
        ]
      })
      .expect(201);
    expect(importResponse.body.data).toMatchObject({
      totalRows: 2,
      successCount: 1,
      failedCount: 1
    });

    const exportResponse = await request(app.getHttpServer())
      .get("/api/model-inclusion-records/export")
      .query({
        model: "deepseek-chat"
      })
      .expect(200);
    expect(exportResponse.body.code).toBe(0);
    expect(exportResponse.body.data).toContain("geoPromptId,promptText,promptType");
    expect(exportResponse.body.data).toContain("platform,entryPoint,detectionMethod,deviceType");
    expect(exportResponse.body.data).toContain("hitLevel,rawAnswer,citations,searchResults");

    const uncoveredResponse = await request(app.getHttpServer())
      .get("/api/model-inclusion-records/uncovered-prompts")
      .query({
        model: "kimi-k2",
        trackEnabled: "true",
        page: "1",
        pageSize: "10"
      })
      .expect(200);
    expect(uncoveredResponse.body.data.items.length).toBeGreaterThan(0);

    const summaryResponse = await request(app.getHttpServer())
      .get("/api/model-inclusion-records/summary")
      .query({
        model: "deepseek-chat"
      })
      .expect(200);
    expect(summaryResponse.body.data.totalRecords).toBeGreaterThan(0);
    expect(summaryResponse.body.data.brandMentionRate).toBeGreaterThanOrEqual(0);
    expect(summaryResponse.body.data.hitLevelDistribution.mentioned).toBeGreaterThanOrEqual(1);
    expect(summaryResponse.body.data.entryPointDistribution.manual).toBeGreaterThanOrEqual(1);
  });

  it("runs the Kimi web-search-check API without requesting external Kimi", async () => {
    const prompt = await createGeoPrompt("Kimi 联网检测 API 提示词");

    const response = await request(app.getHttpServer())
      .post("/api/model-inclusion-records/web-search-check")
      .send({
        geoPromptIds: [prompt.id],
        provider: "kimi_web_search",
        brandName: "海伯森",
        companyName: "海伯森技术",
        websiteUrl: "https://www.hypersen.com"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        successCount: 1,
        failedCount: 0,
        createdItems: [
          {
            geoPromptId: prompt.id,
            platform: "Kimi",
            entryPoint: "web_search_api",
            detectionMethod: "web_search",
            deviceType: "api",
            isWebSearchEnabled: true,
            recordMethod: "api",
            brandMentioned: true,
            brandRecommended: true,
            citedOfficialSite: true,
            hitLevel: "recommended"
          }
        ]
      }
    });
  });

  it("keeps validation errors in the unified ApiResponse shape", async () => {
    const invalid = await request(app.getHttpServer())
      .post("/api/model-inclusion-records")
      .send({
        geoPromptId: " ",
        model: " ",
        rankingPosition: "0"
      })
      .expect(400);

    expect(invalid.body.code).toBe(400);
    expect(invalid.body.message).toBe("Validation failed");
    expect(invalid.body.data.errors.length).toBeGreaterThan(0);
  });
});
