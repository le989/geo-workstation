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

describe("AI usage ledger read APIs", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let aiUsageService: AiUsageService;
  let companyA: CompanySeed;
  let companyB: CompanySeed;
  let departmentA: DepartmentSeed;
  let companyAdminA: UserSeed;
  let operatorA: UserSeed;
  let viewerA: UserSeed;

  beforeAll(async () => {
    if (!databaseUrl?.includes("geo_workstation_crud_smoke")) {
      throw new Error("Usage ledger tests must run with the geo_workstation_crud_smoke database.");
    }

    prisma = createPrismaClient();
    await prisma.$connect();
    aiUsageService = new AiUsageService(prisma as unknown as PrismaService);

    companyA = await prisma.company.create({
      data: {
        name: `LEDGER Company A ${runId}`,
        code: `ledger-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `LEDGER Company B ${runId}`,
        code: `ledger-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    departmentA = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `LEDGER Department ${runId}`,
        code: `ledger-dept-${runId}`,
        status: DepartmentStatus.active
      }
    });
    companyAdminA = await prisma.user.create({
      data: {
        email: `ledger-company-admin-${runId}@example.com`,
        name: "LEDGER Company Admin A",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `ledger-operator-${runId}@example.com`,
        name: "LEDGER Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    viewerA = await prisma.user.create({
      data: {
        email: `ledger-viewer-${runId}@example.com`,
        name: "LEDGER Viewer A",
        role: UserRole.viewer,
        status: UserStatus.active
      }
    });

    await seedUsageRecords();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("summarizes ledger usage without mixing mock into real consumption", async () => {
    const result = await aiUsageService.queryLedgerSummary(
      {
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(result).toMatchObject({
      totalRequestCount: 7,
      realRequestCount: 4,
      mockRequestCount: 3,
      successRequestCount: 5,
      failureRequestCount: 2,
      promptTokens: 120,
      completionTokens: 50,
      totalTokens: 170,
      realPromptTokens: 120,
      realCompletionTokens: 50,
      realTotalTokens: 170,
      mockPromptTokens: 0,
      mockCompletionTokens: 0,
      mockTotalTokens: 0,
      usageUnknownCount: 2,
      uniqueProviderCount: 3,
      uniqueModelCount: 3,
      uniqueUserCount: 2,
      recordCount: 4
    });
  });

  it("filters ledger summary by provider, model, module, user, mock, success, and date range", async () => {
    const result = await aiUsageService.queryLedgerSummary(
      {
        provider: "openai_compatible",
        model: "deepseek-chat",
        moduleKey: "expansion",
        action: "ai_generate",
        userId: operatorA.id,
        isMock: false,
        success: true,
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(result).toMatchObject({
      totalRequestCount: 2,
      realRequestCount: 2,
      mockRequestCount: 0,
      successRequestCount: 2,
      failureRequestCount: 0,
      totalTokens: 140,
      usageUnknownCount: 0,
      recordCount: 1
    });
  });

  it("groups ledger usage by provider and model", async () => {
    const providerResult = await aiUsageService.queryUsageByProvider(
      {
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );
    const modelResult = await aiUsageService.queryUsageByModel(
      {
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(providerResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "openai_compatible",
          requestCount: 3,
          realRequestCount: 3,
          mockRequestCount: 0,
          totalTokens: 170,
          modelCount: 1,
          usageUnknownCount: 1,
          recordCount: 2
        }),
        expect.objectContaining({
          provider: "mock",
          requestCount: 3,
          realRequestCount: 0,
          mockRequestCount: 3,
          mockTotalTokens: 0
        })
      ])
    );
    expect(modelResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "openai_compatible",
          model: "deepseek-chat",
          requestCount: 3,
          totalTokens: 170,
          usageUnknownCount: 1,
          recordCount: 2
        }),
        expect.objectContaining({
          provider: "mock",
          model: "mock-content-v1",
          requestCount: 3,
          mockRequestCount: 3
        })
      ])
    );
  });

  it("groups ledger trends by day and keeps unknown usage separate from token estimates", async () => {
    const result = await aiUsageService.queryLedgerTrends(
      {
        granularity: "day",
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        date: runStart.toISOString().slice(0, 10),
        requestCount: 7,
        realRequestCount: 4,
        mockRequestCount: 3,
        totalTokens: 170,
        realTotalTokens: 170,
        mockTotalTokens: 0,
        successRequestCount: 5,
        failureRequestCount: 2,
        usageUnknownCount: 2,
        recordCount: 4
      })
    ]);
  });

  it("returns paged ledger records with safe summaries only", async () => {
    const result = await aiUsageService.queryLedgerRecords(
      {
        page: 1,
        pageSize: 10,
        provider: "openai_compatible",
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(result).toMatchObject({
      total: 2,
      page: 1,
      pageSize: 10
    });
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          logId: expect.any(String),
          provider: "openai_compatible",
          model: "deepseek-chat",
          userName: operatorA.name,
          usageUnknown: true,
          errorSummary: expect.stringContaining("provider failed")
        })
      ])
    );
    expect(JSON.stringify(result)).not.toContain("完整 prompt");
    expect(JSON.stringify(result)).not.toContain("完整 response");
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("sk-ledger-secret");
    expect(JSON.stringify(result)).not.toContain("costEstimate");
    expect(result.items[0]).not.toHaveProperty("metadata");
    expect(result.items[0]).not.toHaveProperty("errorMessage");
  });

  it("keeps company_admin scoped to current company and blocks non-admin roles", async () => {
    const result = await aiUsageService.queryLedgerSummary(
      {
        companyId: companyB.id,
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );

    expect(result.recordCount).toBe(4);
    await expect(
      aiUsageService.queryLedgerSummary({}, contextFor(viewerA, MembershipRole.viewer))
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
        requestCount: 2,
        success: true,
        providerReturnedUsage: true,
        usageUnknown: false,
        metadata: {
          prompt: "完整 prompt 不应进入账本响应",
          API_KEY: "sk-ledger-secret"
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
        moduleKey: "geo-content",
        action: "quality_check",
        provider: "openai_compatible",
        model: "deepseek-chat",
        isMock: false,
        promptTokens: 20,
        completionTokens: 10,
        totalTokens: 30,
        success: false,
        errorMessage:
          "provider failed Authorization: Bearer raw-token with API key sk-ledger-secret",
        providerReturnedUsage: false,
        usageUnknown: true,
        metadata: {
          response: "完整 response 不应进入账本响应"
        },
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
        provider: "mock",
        model: "mock-content-v1",
        isMock: true,
        requestCount: 3,
        success: true,
        createdAt: new Date(runStart.getTime() + 3_000)
      },
      contextFor(companyAdminA, MembershipRole.company_admin)
    );
    await aiUsageService.recordUsage(
      {
        companyId: companyA.id,
        userId: companyAdminA.id,
        departmentId: null,
        moduleKey: "geo-analysis",
        action: "run_analysis",
        provider: "kimi_web_search",
        model: "kimi-test",
        isMock: false,
        success: false,
        providerReturnedUsage: false,
        usageUnknown: true,
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
