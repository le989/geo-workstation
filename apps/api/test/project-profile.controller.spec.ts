import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  MembershipRole,
  UserRole,
  UserStatus
} from "@prisma/client";
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
  let company: { id: string; name: string; code: string; status: CompanyStatus };
  let otherCompany: { id: string; name: string; code: string; status: CompanyStatus };
  let user: { id: string; email: string; name: string; role: UserRole; status: UserStatus };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    process.env.JWT_SECRET ??= "test_only_jwt_secret";
    process.env.BYPASS_AUTH_FOR_TESTS = "true";
    prisma = createPrismaClient();
    await prisma.$connect();
    company = await prisma.company.create({
      data: {
        name: `Project Profile API Company ${runId}`,
        code: `project-profile-api-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    otherCompany = await prisma.company.create({
      data: {
        name: `Project Profile API Other Company ${runId}`,
        code: `project-profile-api-other-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    user = await prisma.user.create({
      data: {
        email: `project-profile-api-${runId}@example.com`,
        name: "Auth 4H Project Profile API Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      }
    });
    await prisma.projectProfile.create({
      data: {
        projectName: `其他公司项目档案 ${runId}`,
        mainProducts: [],
        forbiddenClaims: [],
        targetModels: [],
        company: {
          connect: {
            id: otherCompany.id
          }
        },
        createdBy: {
          connect: {
            id: user.id
          }
        }
      }
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    app.use((request: Record<string, unknown>, _response: unknown, next: () => void) => {
      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isPlatformAdmin: true
      };
      request.currentCompany = {
        id: company.id,
        name: company.name,
        code: company.code,
        role: MembershipRole.platform_admin,
        isDefault: true,
        status: company.status
      };
      request.currentMembership = {
        companyId: company.id,
        role: MembershipRole.platform_admin,
        isDefault: true,
        isPlatformAdmin: true
      };
      next();
    });
    configureApiApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("returns current-company empty state, creates, and updates profile through ApiResponse", async () => {
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
        companyId: company.id,
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
      companyId: company.id,
      projectName: `通用项目档案更新 ${runId}`,
      targetCustomers: "不同项目的真实目标用户",
      tone: "专业、清楚、克制"
    });

    const otherProfile = await prisma.projectProfile.findFirstOrThrow({
      where: {
        companyId: otherCompany.id
      }
    });
    expect(otherProfile.projectName).toBe(`其他公司项目档案 ${runId}`);
  });
});
