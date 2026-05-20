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
import { OperationLogsService } from "../src/modules/usage/operation-logs.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("Usage and operation logs services", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let aiUsageService: AiUsageService;
  let operationLogsService: OperationLogsService;
  let companyA: { id: string; name: string; code: string; status: CompanyStatus };
  let companyB: { id: string; name: string; code: string; status: CompanyStatus };
  let companyAdminA: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let operatorA: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let viewerA: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let departmentA: { id: string; name: string; code: string; status: DepartmentStatus };

  beforeAll(async () => {
    if (!databaseUrl?.includes("geo_workstation_crud_smoke")) {
      throw new Error("Usage tests must run with the geo_workstation_crud_smoke database.");
    }

    prisma = createPrismaClient();
    await prisma.$connect();
    aiUsageService = new AiUsageService(prisma as unknown as PrismaService);
    operationLogsService = new OperationLogsService(prisma as unknown as PrismaService);

    companyA = await prisma.company.create({
      data: {
        name: `USAGE Company A ${runId}`,
        code: `usage-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `USAGE Company B ${runId}`,
        code: `usage-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    departmentA = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `USAGE Department ${runId}`,
        code: `usage-dept-${runId}`,
        status: DepartmentStatus.active
      }
    });
    companyAdminA = await prisma.user.create({
      data: {
        email: `usage-admin-a-${runId}@example.com`,
        name: "USAGE Company Admin A",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `usage-operator-a-${runId}@example.com`,
        name: "USAGE Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    viewerA = await prisma.user.create({
      data: {
        email: `usage-viewer-a-${runId}@example.com`,
        name: "USAGE Viewer A",
        role: UserRole.viewer,
        status: UserStatus.active
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function contextFor(
    user: typeof companyAdminA,
    role: MembershipRole,
    company = companyA
  ): ResourceAccessContext {
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
        department:
          company.id === companyA.id
            ? {
                id: departmentA.id,
                name: departmentA.name,
                code: departmentA.code,
                status: departmentA.status
              }
            : null,
        accessibleModules: ["usage-analytics", "operation-logs"]
      },
      currentMembership: {
        companyId: company.id,
        role,
        isDefault: true,
        isPlatformAdmin: user.role === UserRole.platform_admin,
        departmentId: company.id === companyA.id ? departmentA.id : null,
        accessibleModules: ["usage-analytics", "operation-logs"]
      }
    };
  }

  it("records mock AI usage with zero tokens and returns admin-only company summary", async () => {
    const adminContext = contextFor(companyAdminA, MembershipRole.company_admin);

    await aiUsageService.recordUsage(
      {
        moduleKey: "geo-content",
        action: "content_generate",
        provider: "mock",
        model: "mock-content-v1",
        isMock: true,
        promptTokens: 120,
        completionTokens: 80,
        success: true,
        metadata: {
          prompt: "这段完整 prompt 不应被写入 metadata",
          DATABASE_URL: "postgresql://should-not-be-stored",
          safeCount: 2
        }
      },
      adminContext
    );
    await aiUsageService.recordUsage(
      {
        companyId: companyB.id,
        moduleKey: "geo-content",
        action: "content_generate",
        provider: "mock",
        model: "mock-content-v1",
        isMock: true,
        success: true
      },
      undefined
    );

    const summary = await aiUsageService.querySummary({}, adminContext);
    const byModule = await aiUsageService.queryByModule({}, adminContext);
    const byUser = await aiUsageService.queryByUser({}, adminContext);
    const byDepartment = await aiUsageService.queryByDepartment({}, adminContext);

    expect(summary).toMatchObject({
      totalRequests: 1,
      totalTokens: 0,
      mockRequests: 1,
      realRequests: 0,
      successCount: 1,
      failureCount: 0
    });
    expect(byModule.items).toEqual([
      expect.objectContaining({
        moduleKey: "geo-content",
        totalRequests: 1,
        totalTokens: 0
      })
    ]);
    expect(byUser.items).toEqual([
      expect.objectContaining({
        userId: companyAdminA.id,
        userName: companyAdminA.name,
        totalRequests: 1
      })
    ]);
    expect(byDepartment.items).toEqual([
      expect.objectContaining({
        departmentId: departmentA.id,
        departmentName: departmentA.name,
        totalRequests: 1
      })
    ]);
    await expect(
      aiUsageService.querySummary({}, contextFor(operatorA, MembershipRole.operator))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("records operation logs with sanitized metadata and blocks viewer queries", async () => {
    const adminContext = contextFor(companyAdminA, MembershipRole.company_admin);

    await operationLogsService.recordOperation(
      {
        moduleKey: "knowledge-bases",
        action: "manual_create",
        targetType: "knowledge_file",
        targetId: "material-1",
        targetTitle: "手动录入资料",
        success: true,
        metadata: {
          storagePath: "/Users/a9527/Desktop/private/upload.txt",
          password: "secret",
          nested: {
            JWT: "token",
            safe: "kept"
          }
        }
      },
      adminContext
    );

    const logs = await operationLogsService.queryLogs(
      {
        moduleKey: "knowledge-bases",
        action: "manual_create"
      },
      adminContext
    );

    expect(logs.total).toBe(1);
    expect(logs.items[0]).toMatchObject({
      moduleKey: "knowledge-bases",
      action: "manual_create",
      targetType: "knowledge_file",
      targetId: "material-1",
      targetTitle: "手动录入资料",
      success: true,
      userId: companyAdminA.id,
      departmentId: departmentA.id
    });
    expect(JSON.stringify(logs.items[0].metadata)).not.toContain("secret");
    expect(JSON.stringify(logs.items[0].metadata)).not.toContain("storagePath");
    expect(JSON.stringify(logs.items[0].metadata)).not.toContain("/Users/a9527");
    expect(logs.items[0].metadata).toMatchObject({
      nested: {
        safe: "kept"
      }
    });
    await expect(
      operationLogsService.queryLogs({}, contextFor(viewerA, MembershipRole.viewer))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
