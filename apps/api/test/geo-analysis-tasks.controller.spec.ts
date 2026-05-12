import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TaskStatus, UserRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoAnalysisTasksController", () => {
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
        email: `geo-analysis-controller-${runId}@example.com`,
        name: "Phase 2J GEO Analysis API Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
    productLine = `Phase 2J API 产品线 ${runId}`;

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

  it("runs the GEO analysis API flow through ApiResponse", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/geo-analysis-tasks")
      .send({
        name: `Phase 2J API 分析任务 ${runId}`,
        brandName: "凯基特",
        websiteUrl: "https://example.com",
        productLine,
        baseWords: ["激光测距传感器"],
        targetModels: ["deepseek-chat"],
        createdBy
      })
      .expect(201);

    expect(created.body.code).toBe(0);
    expect(created.body.data.status).toBe(TaskStatus.pending);
    const taskId = created.body.data.id as string;

    const list = await request(app.getHttpServer())
      .get("/api/geo-analysis-tasks")
      .query({
        productLine,
        status: TaskStatus.pending,
        targetModel: "deepseek-chat"
      })
      .expect(200);
    expect(list.body.data.items.some((item: { id: string }) => item.id === taskId)).toBe(true);

    const patched = await request(app.getHttpServer())
      .patch(`/api/geo-analysis-tasks/${taskId}`)
      .send({
        name: `Phase 2J API 已编辑 ${runId}`
      })
      .expect(200);
    expect(patched.body.data.name).toContain("已编辑");

    const run = await request(app.getHttpServer())
      .post(`/api/geo-analysis-tasks/${taskId}/run`)
      .send({})
      .expect(201);
    expect(run.body.data.task.status).toBe(TaskStatus.succeeded);
    expect(run.body.data.modelResults).toHaveLength(1);

    const detail = await request(app.getHttpServer())
      .get(`/api/geo-analysis-tasks/${taskId}`)
      .expect(200);
    expect(detail.body.data.modelResults).toHaveLength(1);
    expect(detail.body.data.task.promptSuggestions.length).toBeGreaterThanOrEqual(5);

    const converted = await request(app.getHttpServer())
      .post(`/api/geo-analysis-tasks/${taskId}/convert-prompts`)
      .send({
        createdBy
      })
      .expect(201);
    expect(converted.body.data.createdCount).toBeGreaterThan(0);

    const contentTask = await request(app.getHttpServer())
      .post(`/api/geo-analysis-tasks/${taskId}/create-content-task`)
      .send({
        generationType: "article",
        targetModel: "deepseek-chat",
        createdBy
      })
      .expect(201);
    expect(contentTask.body.data.task.status).toBe(TaskStatus.succeeded);
    expect(contentTask.body.data.items.length).toBeGreaterThan(0);
  });

  it("keeps validation errors in ApiResponse shape", async () => {
    const invalid = await request(app.getHttpServer())
      .post("/api/geo-analysis-tasks")
      .send({
        name: "缺少目标模型",
        brandName: "凯基特",
        targetModels: []
      })
      .expect(400);

    expect(invalid.body.code).toBe(400);
    expect(invalid.body.message).toBe("Validation failed");
  });
});
