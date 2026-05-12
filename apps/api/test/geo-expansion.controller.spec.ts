import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { GeoPromptType, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoExpansionController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `geo-expansion-controller-${runId}@example.com`,
        name: "Phase 2C GEO Expansion API Operator",
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

  function uniqueBase(label: string): string {
    return `激光测距传感器${label}${runId}`;
  }

  it("generates rule candidates, returns job detail, and saves selected candidates through ApiResponse", async () => {
    const ruleResponse = await request(app.getHttpServer())
      .post("/api/expansion/rule-generate")
      .send({
        baseWord: uniqueBase("HTTP规则"),
        prefixes: ["国产"],
        serviceSuffixes: ["厂家推荐"],
        applicationSuffixes: ["怎么选"],
        promptType: GeoPromptType.distilled,
        userIntent: UserIntent.selection,
        createdBy
      })
      .expect(201);

    expect(ruleResponse.body.code).toBe(0);
    expect(ruleResponse.body.data.job.id).toBeTruthy();
    expect(ruleResponse.body.data.candidates.length).toBe(7);
    expect(ruleResponse.body.data.candidates[0].savedPromptId).toBeNull();

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/expansion/jobs/${ruleResponse.body.data.job.id}`)
      .expect(200);
    expect(detailResponse.body.code).toBe(0);
    expect(detailResponse.body.data.candidates[0].saveStatus).toBe("pending");

    const saveResponse = await request(app.getHttpServer())
      .post(`/api/expansion/jobs/${ruleResponse.body.data.job.id}/save-candidates`)
      .send({
        candidateIds: [ruleResponse.body.data.candidates[0].id],
        defaultProductLine: "HTTP拓词产品线",
        defaultPriority: "4",
        defaultTrackEnabled: "true",
        createdBy
      })
      .expect(201);

    expect(saveResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        totalSelected: 1,
        savedCount: 1,
        skippedCount: 0,
        failedCount: 0
      }
    });
  });

  it("generates AI candidates with the mock provider and records a mock AI call log", async () => {
    const aiResponse = await request(app.getHttpServer())
      .post("/api/expansion/ai-generate")
      .send({
        baseWord: uniqueBase("HTTPAI"),
        promptType: GeoPromptType.scene,
        userIntent: UserIntent.application_solution,
        productLine: "激光测距传感器",
        scenario: "行车防撞",
        count: "3",
        targetModels: ["deepseek-chat"],
        constraints: "偏 GEO 问答",
        createdBy
      })
      .expect(201);

    expect(aiResponse.body.code).toBe(0);
    expect(aiResponse.body.data.job.provider).toBe("mock");
    expect(aiResponse.body.data.job.model).toBe("mock-expansion-v1");
    expect(aiResponse.body.data.candidates).toHaveLength(3);

    const aiLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "expansion_job",
        relatedId: aiResponse.body.data.job.id,
        provider: "mock"
      }
    });
    expect(aiLog?.status).toBe("succeeded");
  });

  it("keeps validation and exceptions in the unified ApiResponse shape", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/expansion/ai-generate")
      .send({
        baseWord: " ",
        promptType: GeoPromptType.base,
        count: "99"
      })
      .expect(400);

    expect(response.body.code).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.data.errors.length).toBeGreaterThan(0);
  });
});
