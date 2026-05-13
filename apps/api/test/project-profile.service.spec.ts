import { BadRequestException, NotFoundException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ProjectProfileService } from "../src/modules/project-profile/project-profile.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ProjectProfileService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ProjectProfileService;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    await prisma.projectProfile.deleteMany({});
    service = new ProjectProfileService(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    await prisma.projectProfile.deleteMany({});
    await prisma.$disconnect();
  });

  it("returns null when the single project profile has not been configured", async () => {
    await prisma.projectProfile.deleteMany({});

    await expect(service.getCurrent()).resolves.toBeNull();
  });

  it("creates a single reusable project profile for cross-industry GEO context", async () => {
    const profile = await service.create({
      projectName: `通用 GEO 项目 ${runId}`,
      companyName: "示例公司",
      brandName: "示例品牌",
      websiteUrl: "https://example.com",
      industry: "用户自由填写的行业",
      mainProducts: ["产品", "服务", "课程", "门店"],
      targetCustomers: "需要在 AI 问答中了解项目的人群",
      positioning: "用于验证项目档案上下文",
      tone: "专业、克制、可信",
      forbiddenClaims: ["不要承诺效果", "不要编造案例"],
      targetModels: ["deepseek", "kimi"],
      notes: "项目档案不绑定固定行业。"
    });

    expect(profile).toMatchObject({
      projectName: `通用 GEO 项目 ${runId}`,
      brandName: "示例品牌",
      industry: "用户自由填写的行业",
      mainProducts: ["产品", "服务", "课程", "门店"],
      forbiddenClaims: ["不要承诺效果", "不要编造案例"],
      targetModels: ["deepseek", "kimi"]
    });

    await expect(
      service.create({
        projectName: `重复项目 ${runId}`
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates the existing project profile without creating another project", async () => {
    const updated = await service.update({
      projectName: `通用 GEO 项目更新 ${runId}`,
      brandName: "更新后的品牌",
      mainProducts: "产品线A\n服务B\n课程C",
      forbiddenClaims: "不要写行业第一, 不要承诺收益",
      targetModels: "deepseek,kimi,doubao"
    });

    expect(updated).toMatchObject({
      projectName: `通用 GEO 项目更新 ${runId}`,
      brandName: "更新后的品牌",
      mainProducts: ["产品线A", "服务B", "课程C"],
      forbiddenClaims: ["不要写行业第一", "不要承诺收益"],
      targetModels: ["deepseek", "kimi", "doubao"]
    });

    await expect(prisma.projectProfile.count()).resolves.toBe(1);
  });

  it("rejects updates when no project profile exists", async () => {
    await prisma.projectProfile.deleteMany({});

    await expect(
      service.update({
        projectName: `不存在项目 ${runId}`
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
