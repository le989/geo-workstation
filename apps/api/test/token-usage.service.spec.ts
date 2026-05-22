import { ForbiddenException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  DepartmentStatus,
  MembershipRole,
  UserRole,
  UserStatus
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { AiUsageService } from "../src/modules/usage/ai-usage.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${crypto.randomUUID()}`;
const runStart = new Date(Date.now() + 10 * 60 * 1000);
const runEnd = new Date(runStart.getTime() + 60 * 1000);

type CompanySeed = {
  id: string;
  name: string;
  code: string;
  status: CompanyStatus;
};

type DepartmentSeed = {
  id: string;
  name: string;
  code: string;
  status: DepartmentStatus;
};

type UserSeed = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

describe("Token usage AI summary", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let aiUsageService: AiUsageService;
  let companyA: CompanySeed;
  let companyB: CompanySeed;
  let departmentA: DepartmentSeed;
  let platformAdmin: UserSeed;
  let companyAdminA: UserSeed;
  let operatorA: UserSeed;
  let viewerA: UserSeed;

  beforeAll(async () => {
    if (!databaseUrl?.includes("geo_workstation_crud_smoke")) {
      throw new Error("Token usage tests must run with the geo_workstation_crud_smoke database.");
    }

    prisma = createPrismaClient();
    await prisma.$connect();
    aiUsageService = new AiUsageService(prisma as unknown as PrismaService);

    companyA = await prisma.company.create({
      data: {
        name: `TOKEN Usage Company A ${runId}`,
        code: `token-usage-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `TOKEN Usage Company B ${runId}`,
        code: `token-usage-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    departmentA = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `TOKEN Usage Department ${runId}`,
        code: `token-usage-dept-${runId}`,
        status: DepartmentStatus.active
      }
    });
    platformAdmin = await prisma.user.create({
      data: {
        email: `token-platform-${runId}@example.com`,
        name: "TOKEN Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      }
    });
    companyAdminA = await prisma.user.create({
      data: {
        email: `token-company-admin-${runId}@example.com`,
        name: "TOKEN Company Admin A",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `token-operator-${runId}@example.com`,
        name: "TOKEN Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    viewerA = await prisma.user.create({
      data: {
        email: `token-viewer-${runId}@example.com`,
        name: "TOKEN Viewer A",
        role: UserRole.viewer,
        status: UserStatus.active
      }
    });

    await seedUsageRecords();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("summarizes real AI usage by company, provider, module, user, and department", async () => {
    const result = await aiUsageService.queryAiSummary(
      {
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(result.overview).toMatchObject({
      totalCalls: 3,
      successCount: 2,
      failureCount: 1,
      tokenKnownCalls: 2,
      tokenUnknownCalls: 1,
      usageUnknownCount: 1,
      knownPromptTokens: 150,
      knownCompletionTokens: 70,
      knownTotalTokens: 220
    });
    expect(result.overview.successRate).toBeCloseTo(2 / 3, 4);
    expect(result.byCompany).toEqual([
      expect.objectContaining({
        companyId: companyA.id,
        companyName: companyA.name,
        totalCalls: 3
      })
    ]);
    expect(result.byProvider).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "kimi_web_search",
          model: "kimi-test",
          totalCalls: 1,
          failureCount: 1,
          tokenUnknownCalls: 1
        }),
        expect.objectContaining({
          provider: "openai_compatible",
          model: "deepseek-chat",
          totalCalls: 2,
          tokenKnownCalls: 2,
          knownTotalTokens: 220
        })
      ])
    );
    expect(result.byModule).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleKey: "expansion",
          action: "ai_generate",
          totalCalls: 1,
          knownTotalTokens: 140
        }),
        expect.objectContaining({
          moduleKey: "model-inclusion-records",
          action: "web_search_check",
          tokenUnknownCalls: 1
        })
      ])
    );
    expect(result.byUser).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: operatorA.id,
          userName: operatorA.name,
          userEmail: operatorA.email,
          totalCalls: 2
        }),
        expect.objectContaining({
          userId: companyAdminA.id,
          userName: companyAdminA.name,
          totalCalls: 1
        })
      ])
    );
    expect(result.byDepartment).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          departmentId: departmentA.id,
          departmentName: departmentA.name,
          totalCalls: 2
        }),
        expect.objectContaining({
          departmentId: null,
          departmentName: "未绑定部门",
          totalCalls: 1
        })
      ])
    );
    expect(JSON.stringify(result)).not.toContain("完整 prompt");
    expect(JSON.stringify(result)).not.toContain("sk-test-secret-key");
    expect(JSON.stringify(result)).not.toContain("完整 answer");
  });

  it("keeps company_admin scoped to the current company even when another company is requested", async () => {
    const result = await aiUsageService.queryAiSummary(
      {
        companyId: companyB.id,
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(result.overview.totalCalls).toBe(3);
    expect(result.byCompany).toHaveLength(1);
    expect(result.byCompany[0]?.companyId).toBe(companyA.id);
  });

  it("lets platform_admin see cross-company AI usage without leaking sensitive metadata", async () => {
    const result = await aiUsageService.queryAiSummary(
      {
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(platformAdmin, MembershipRole.platform_admin, companyA)
    );

    expect(result.overview.totalCalls).toBe(4);
    expect(result.byCompany).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ companyId: companyA.id, totalCalls: 3 }),
        expect.objectContaining({ companyId: companyB.id, totalCalls: 1 })
      ])
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("secret answer");
  });

  it("blocks operator and viewer from AI usage summary", async () => {
    await expect(
      aiUsageService.queryAiSummary(
        {
          startDate: runStart.toISOString(),
          endDate: runEnd.toISOString()
        },
        contextFor(operatorA, MembershipRole.operator)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      aiUsageService.queryAiSummary(
        {
          startDate: runStart.toISOString(),
          endDate: runEnd.toISOString()
        },
        contextFor(viewerA, MembershipRole.viewer)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  async function seedUsageRecords() {
    await aiUsageService.recordUsage(
      {
        companyId: companyA.id,
        userId: operatorA.id,
        departmentId: departmentA.id,
        moduleKey: "expansion",
        action: "ai_generate",
        provider: "openai_compatible",
        model: "deepseek-chat",
        isMock: false,
        promptTokens: 100,
        completionTokens: 40,
        totalTokens: 140,
        success: true,
        providerReturnedUsage: true,
        usageUnknown: false,
        metadata: {
          prompt: "完整 prompt 不应进入统计响应",
          answer: "完整 answer 不应进入统计响应",
          API_KEY: "sk-test-secret-key"
        },
        createdAt: new Date(runStart.getTime() + 1_000)
      },
      contextFor(operatorA, MembershipRole.operator)
    );
    await aiUsageService.recordUsage(
      {
        companyId: companyA.id,
        userId: operatorA.id,
        departmentId: departmentA.id,
        moduleKey: "model-inclusion-records",
        action: "web_search_check",
        provider: "kimi_web_search",
        model: "kimi-test",
        isMock: false,
        success: false,
        errorType: "provider_auth_error",
        providerReturnedUsage: false,
        usageUnknown: true,
        createdAt: new Date(runStart.getTime() + 2_000)
      },
      contextFor(operatorA, MembershipRole.operator)
    );
    await aiUsageService.recordUsage(
      {
        companyId: companyA.id,
        userId: companyAdminA.id,
        departmentId: null,
        moduleKey: "geo-content",
        action: "content_generate",
        provider: "openai_compatible",
        model: "deepseek-chat",
        isMock: false,
        promptTokens: 50,
        completionTokens: 30,
        totalTokens: 80,
        success: true,
        providerReturnedUsage: true,
        usageUnknown: false,
        createdAt: new Date(runStart.getTime() + 3_000)
      },
      undefined
    );
    await aiUsageService.recordUsage(
      {
        companyId: companyA.id,
        userId: companyAdminA.id,
        moduleKey: "geo-content",
        action: "content_generate",
        provider: "mock",
        model: "mock",
        isMock: true,
        requestCount: 5,
        success: true,
        createdAt: new Date(runStart.getTime() + 4_000)
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );
    await aiUsageService.recordUsage(
      {
        companyId: companyB.id,
        userId: null,
        departmentId: null,
        moduleKey: "geo-content",
        action: "quality_check",
        provider: "openai_compatible",
        model: "deepseek-chat",
        isMock: false,
        promptTokens: 12,
        completionTokens: 8,
        totalTokens: 20,
        success: true,
        providerReturnedUsage: true,
        usageUnknown: false,
        metadata: {
          DATABASE_URL: "postgresql://secret",
          answer: "secret answer"
        },
        createdAt: new Date(runStart.getTime() + 5_000)
      },
      undefined
    );
  }

  function contextFor(
    user: UserSeed,
    role: MembershipRole,
    company = companyA
  ): ResourceAccessContext {
    const department = company.id === companyA.id && role !== MembershipRole.platform_admin
      ? {
          id: departmentA.id,
          name: departmentA.name,
          code: departmentA.code,
          status: departmentA.status
        }
      : null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isPlatformAdmin: user.role === UserRole.platform_admin
      },
      currentCompany: {
        id: company.id,
        name: company.name,
        code: company.code,
        role,
        isDefault: true,
        status: company.status,
        department,
        accessibleModules: ["usage-analytics"]
      },
      currentMembership: {
        companyId: company.id,
        role,
        isDefault: true,
        isPlatformAdmin: user.role === UserRole.platform_admin,
        departmentId: department?.id ?? null,
        accessibleModules: ["usage-analytics"]
      }
    };
  }
});
