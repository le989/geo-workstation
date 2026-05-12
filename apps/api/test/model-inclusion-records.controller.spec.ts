import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { GeoPromptType, UserIntent, UserRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ModelInclusionRecordsController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;

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
    }).compile();
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
        checkedAt: "2026-05-13T10:30:00.000Z",
        brandMentioned: true,
        brandRecommended: false,
        citedOfficialSite: "yes",
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
        brandMentioned: true,
        brandRecommended: false,
        citedOfficialSite: true,
        recordMethod: "manual"
      }
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/model-inclusion-records")
      .query({
        model: "deepseek-chat",
        brandMentioned: "true",
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
