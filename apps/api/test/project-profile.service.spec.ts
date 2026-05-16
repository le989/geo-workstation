import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  MembershipRole,
  UserRole,
  UserStatus
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { ProjectProfileService } from "../src/modules/project-profile/project-profile.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ProjectProfileService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ProjectProfileService;
  let companyA: { id: string; name: string; code: string };
  let companyB: { id: string; name: string; code: string };
  let companyC: { id: string; name: string; code: string };
  let platformAdmin: { id: string };
  let operatorA: { id: string };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new ProjectProfileService(prisma as unknown as PrismaService);

    companyA = await prisma.company.create({
      data: {
        name: `Auth 4H Profile Company A ${runId}`,
        code: `auth4h-profile-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Auth 4H Profile Company B ${runId}`,
        code: `auth4h-profile-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyC = await prisma.company.create({
      data: {
        name: `Auth 4H Profile Company C ${runId}`,
        code: `auth4h-profile-c-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    platformAdmin = await prisma.user.create({
      data: {
        email: `auth4h-profile-platform-${runId}@example.com`,
        name: "Auth 4H Profile Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `auth4h-profile-operator-${runId}@example.com`,
        name: "Auth 4H Profile Operator",
        role: UserRole.operator,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const contextFor = (
    user: { id: string },
    company: { id: string; name: string; code: string },
    role: MembershipRole,
    isPlatformAdmin = false
  ): ResourceAccessContext => ({
    user: {
      id: user.id,
      email: `${user.id}@auth4h.local`,
      name: user.id,
      role: isPlatformAdmin
        ? UserRole.platform_admin
        : role === MembershipRole.company_admin
          ? UserRole.company_admin
          : UserRole.operator,
      status: UserStatus.active,
      isPlatformAdmin
    },
    currentCompany: {
      id: company.id,
      name: company.name,
      code: company.code,
      role,
      isDefault: true,
      status: CompanyStatus.active
    },
    currentMembership: {
      companyId: company.id,
      role,
      isDefault: true,
      isPlatformAdmin
    }
  });

  it("returns null for the current company without falling back to another company profile", async () => {
    await prisma.projectProfile.create({
      data: {
        projectName: `B 公司项目档案 ${runId}`,
        mainProducts: [],
        forbiddenClaims: [],
        targetModels: [],
        company: {
          connect: {
            id: companyB.id
          }
        },
        createdBy: {
          connect: {
            id: platformAdmin.id
          }
        }
      }
    });

    await expect(
      service.getCurrent(
        contextFor(platformAdmin, companyA, MembershipRole.platform_admin, true)
      )
    ).resolves.toBeNull();
    await expect(
      service.getPromptContext(
        contextFor(platformAdmin, companyA, MembershipRole.platform_admin, true)
      )
    ).resolves.toBeNull();
  });

  it("creates a project profile scoped to current company and current user", async () => {
    const context = contextFor(platformAdmin, companyA, MembershipRole.platform_admin, true);
    const profile = await service.create(
      {
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
      },
      context
    );

    expect(profile).toMatchObject({
      companyId: companyA.id,
      projectName: `通用 GEO 项目 ${runId}`,
      brandName: "示例品牌",
      industry: "用户自由填写的行业",
      mainProducts: ["产品", "服务", "课程", "门店"],
      forbiddenClaims: ["不要承诺效果", "不要编造案例"],
      targetModels: ["deepseek", "kimi"]
    });

    const stored = await prisma.projectProfile.findUniqueOrThrow({
      where: {
        id: profile.id
      }
    });
    expect(stored.companyId).toBe(companyA.id);
    expect(stored.createdById).toBe(platformAdmin.id);
    expect(stored.updatedById).toBe(platformAdmin.id);

    await expect(
      service.create(
        {
          projectName: `重复项目 ${runId}`
        },
        context
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates only the current company profile", async () => {
    const updated = await service.update(
      {
        projectName: `通用 GEO 项目更新 ${runId}`,
        brandName: "更新后的品牌",
        mainProducts: "产品线A\n服务B\n课程C",
        forbiddenClaims: "不要写行业第一, 不要承诺收益",
        targetModels: "deepseek,kimi,doubao"
      },
      contextFor(platformAdmin, companyA, MembershipRole.platform_admin, true)
    );

    expect(updated).toMatchObject({
      companyId: companyA.id,
      projectName: `通用 GEO 项目更新 ${runId}`,
      brandName: "更新后的品牌",
      mainProducts: ["产品线A", "服务B", "课程C"],
      forbiddenClaims: ["不要写行业第一", "不要承诺收益"],
      targetModels: ["deepseek", "kimi", "doubao"]
    });

    const companyBProfile = await service.getCurrent(
      contextFor(platformAdmin, companyB, MembershipRole.platform_admin, true)
    );
    expect(companyBProfile?.projectName).toBe(`B 公司项目档案 ${runId}`);
  });

  it("rejects updates when the current company has no project profile", async () => {
    await expect(
      service.update(
        {
          projectName: `不存在项目 ${runId}`
        },
        contextFor(platformAdmin, companyC, MembershipRole.platform_admin, true)
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects operator writes to project profile", async () => {
    await expect(
      service.update(
        {
          projectName: `运营不应修改 ${runId}`
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
