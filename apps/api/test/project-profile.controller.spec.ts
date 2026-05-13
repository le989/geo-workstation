import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ProjectProfileController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    process.env.JWT_SECRET ??= "test_only_jwt_secret";
    process.env.BYPASS_AUTH_FOR_TESTS = "true";
    prisma = createPrismaClient();
    await prisma.$connect();
    await prisma.projectProfile.deleteMany({});

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    configureApiApp(app);
    await app.init();
  });

  afterAll(async () => {
    await prisma.projectProfile.deleteMany({});
    await app.close();
    await prisma.$disconnect();
  });

  it("returns empty state, creates, and updates the single project profile through ApiResponse", async () => {
    const emptyResponse = await request(app.getHttpServer())
      .get("/api/project-profile")
      .expect(200);
    expect(emptyResponse.body).toEqual({
      code: 0,
      message: "ok",
      data: null
    });

    const createResponse = await request(app.getHttpServer())
      .post("/api/project-profile")
      .send({
        projectName: `通用项目档案 ${runId}`,
        brandName: "通用品牌",
        industry: "用户自由填写行业",
        mainProducts: "产品\n服务\n课程\n门店",
        forbiddenClaims: ["不要承诺效果"],
        targetModels: "deepseek,kimi"
      })
      .expect(201);
    expect(createResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        projectName: `通用项目档案 ${runId}`,
        mainProducts: ["产品", "服务", "课程", "门店"],
        forbiddenClaims: ["不要承诺效果"],
        targetModels: ["deepseek", "kimi"]
      }
    });

    const updateResponse = await request(app.getHttpServer())
      .patch("/api/project-profile")
      .send({
        projectName: `通用项目档案更新 ${runId}`,
        targetCustomers: "不同项目的真实目标用户",
        tone: "专业、清楚、克制"
      })
      .expect(200);
    expect(updateResponse.body.data).toMatchObject({
      projectName: `通用项目档案更新 ${runId}`,
      targetCustomers: "不同项目的真实目标用户",
      tone: "专业、清楚、克制"
    });
  });
});
