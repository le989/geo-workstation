import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  GeoPromptType,
  RecordMethod,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus
} from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ReportsController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;
  let productLine: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `reports-controller-${runId}@example.com`,
        name: "Phase 2I GEO Reports API Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
    productLine = `Phase 2I API 产品线 ${runId}`;
    await seedReportData();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    configureApiApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  async function seedReportData() {
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.base,
        baseWord: "激光测距传感器",
        promptText: `Phase 2I API 提示词 ${runId}`,
        productLine,
        scenario: "报表 API 测试",
        userIntent: UserIntent.selection,
        priority: 5,
        trackEnabled: true,
        latestCoverageStatus: "recommended",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    await prisma.modelInclusionRecord.create({
      data: {
        geoPrompt: {
          connect: {
            id: prompt.id
          }
        },
        model: "deepseek-chat",
        checkedAt: new Date("2026-05-13T02:00:00.000Z"),
        brandMentioned: true,
        brandRecommended: true,
        citedOfficialSite: true,
        answerSummary: "API 报表测试记录。",
        competitors: [],
        recordMethod: RecordMethod.manual,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    const task = await prisma.contentTask.create({
      data: {
        name: `Phase 2I API 内容任务 ${runId}`,
        productLine,
        generationType: "faq",
        status: TaskStatus.succeeded,
        provider: "mock",
        model: "mock-content-v1",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    await prisma.contentItem.create({
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
        title: "API 报表内容",
        body: "API 报表内容项",
        status: "draft"
      }
    });
  }

  it("returns all GEO report endpoints through ApiResponse", async () => {
    const overview = await request(app.getHttpServer())
      .get("/api/reports/geo-overview")
      .query({
        productLine,
        model: "deepseek-chat"
      })
      .expect(200);
    expect(overview.body.code).toBe(0);
    expect(overview.body.data.promptTotal).toBeGreaterThan(0);

    const promptCoverage = await request(app.getHttpServer())
      .get("/api/reports/prompt-coverage")
      .query({
        productLine,
        model: "deepseek-chat",
        trackEnabled: "true"
      })
      .expect(200);
    expect(promptCoverage.body.data.coverageRate).toBeGreaterThanOrEqual(0);

    const modelCoverage = await request(app.getHttpServer())
      .get("/api/reports/model-coverage")
      .query({
        productLine,
        model: "deepseek-chat"
      })
      .expect(200);
    expect(modelCoverage.body.data.modelDistribution["deepseek-chat"]).toBeGreaterThan(0);

    const geoHitSummary = await request(app.getHttpServer())
      .get("/api/reports/geo-hit-summary")
      .query({
        productLine,
        latestOnly: "true"
      })
      .expect(200);
    expect(geoHitSummary.body.code).toBe(0);
    expect(geoHitSummary.body.data.overview.recordCount).toBeGreaterThan(0);
    expect(Array.isArray(geoHitSummary.body.data.promptMatrix)).toBe(true);

    const contentCoverage = await request(app.getHttpServer())
      .get("/api/reports/content-coverage")
      .query({
        productLine
      })
      .expect(200);
    expect(contentCoverage.body.data.contentItemCount).toBeGreaterThan(0);

    const knowledgeCoverage = await request(app.getHttpServer())
      .get("/api/reports/knowledge-coverage")
      .query({
        productLine
      })
      .expect(200);
    expect(knowledgeCoverage.body.data.knowledgeBaseCount).toBeGreaterThanOrEqual(0);

    const suggestions = await request(app.getHttpServer())
      .get("/api/reports/optimization-suggestions")
      .query({
        productLine,
        limit: "10"
      })
      .expect(200);
    expect(Array.isArray(suggestions.body.data.items)).toBe(true);

    const exported = await request(app.getHttpServer())
      .get("/api/reports/export")
      .query({
        reportType: "geo_overview",
        productLine
      })
      .expect(200);
    expect(exported.body.data).toContain("metric,value");
  });

  it("keeps report validation errors in ApiResponse shape", async () => {
    const invalid = await request(app.getHttpServer())
      .get("/api/reports/export")
      .query({
        reportType: "unknown_report"
      })
      .expect(400);
    expect(invalid.body.code).toBe(400);
    expect(invalid.body.message).toBe("Validation failed");
  });
});
