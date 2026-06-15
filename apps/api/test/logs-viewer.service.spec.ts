import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  AiCallStatus,
  CompanyStatus,
  CompanyType,
  DepartmentStatus,
  MembershipRole,
  UserRole,
  UserStatus
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { resolveApiModuleKey } from "../src/modules/auth/module-access";
import { LogsViewerService } from "../src/modules/usage/logs-viewer.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${crypto.randomUUID()}`;
const runStart = new Date(Date.now() + 10 * 60 * 1000);
const runEnd = new Date(runStart.getTime() + 60_000);

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

describe("LogsViewerService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let logsViewerService: LogsViewerService;
  let company: CompanySeed;
  let department: DepartmentSeed;
  let companyAdmin: UserSeed;
  let viewer: UserSeed;
  let operationLogId: string;
  let aiUsageRecordId: string;
  let aiCallLogId: string;

  beforeAll(async () => {
    if (!databaseUrl?.includes("geo_workstation_crud_smoke")) {
      throw new Error("Logs viewer tests must run with the geo_workstation_crud_smoke database.");
    }

    prisma = createPrismaClient();
    await prisma.$connect();
    logsViewerService = new LogsViewerService(prisma as unknown as PrismaService);

    company = await prisma.company.create({
      data: {
        name: `LOGS Viewer Company ${runId}`,
        code: `logs-viewer-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    department = await prisma.department.create({
      data: {
        companyId: company.id,
        name: `LOGS Viewer Department ${runId}`,
        code: `logs-viewer-dept-${runId}`,
        status: DepartmentStatus.active
      }
    });
    companyAdmin = await prisma.user.create({
      data: {
        email: `logs-viewer-admin-${runId}@example.com`,
        name: "LOGS Viewer Admin",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    viewer = await prisma.user.create({
      data: {
        email: `logs-viewer-viewer-${runId}@example.com`,
        name: "LOGS Viewer Viewer",
        role: UserRole.viewer,
        status: UserStatus.active
      }
    });

    await seedLogs();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns paged operation logs without raw ip, userAgent, or metadata values", async () => {
    const result = await logsViewerService.queryOperationLogs(
      {
        page: 1,
        pageSize: 10,
        moduleKey: "geo-content",
        action: "geo_content.article.quality_checked",
        success: false,
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdmin, MembershipRole.company_admin)
    );

    expect(result).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 10
    });
    expect(result.items[0]).toMatchObject({
      id: operationLogId,
      companyId: company.id,
      userId: companyAdmin.id,
      userName: companyAdmin.name,
      departmentId: department.id,
      moduleKey: "geo-content",
      action: "geo_content.article.quality_checked",
      targetType: "content_item",
      targetId: "content-item-safe",
      success: false,
      hasIp: true,
      hasUserAgent: true,
      metadataKeys: ["safeCount"]
    });
    expect(result.items[0]?.errorSummary).toContain("provider failed");
    expect(JSON.stringify(result)).not.toContain("127.0.0.1");
    expect(JSON.stringify(result)).not.toContain("Chrome Sensitive UA");
    expect(JSON.stringify(result)).not.toContain("完整 prompt");
    expect(JSON.stringify(result)).not.toContain("Bearer secret-token");
    expect(result.items[0]).not.toHaveProperty("ip");
    expect(result.items[0]).not.toHaveProperty("userAgent");
    expect(result.items[0]).not.toHaveProperty("metadata");
  });

  it("returns safe operation log detail and blocks unauthorized roles", async () => {
    const detail = await logsViewerService.getOperationLogDetail(
      operationLogId,
      contextFor(companyAdmin, MembershipRole.company_admin)
    );

    expect(detail).toMatchObject({
      id: operationLogId,
      hasIp: true,
      hasUserAgent: true,
      metadataKeys: ["safeCount"],
      metadataSummary: {
        safeCount: 2
      }
    });
    expect(JSON.stringify(detail)).not.toContain("完整 prompt");
    expect(JSON.stringify(detail)).not.toContain("sk-test-secret-key");
    await expect(
      logsViewerService.getOperationLogDetail(operationLogId, contextFor(viewer, MembershipRole.viewer))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns paged AI usage records with whitelisted metadata summary only", async () => {
    const result = await logsViewerService.queryAiUsageRecords(
      {
        page: 1,
        pageSize: 10,
        provider: "openai_compatible",
        success: false,
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdmin, MembershipRole.company_admin)
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: aiUsageRecordId,
      provider: "openai_compatible",
      isMock: false,
      requestCount: 1,
      success: false,
      metadataSummary: {
        usageUnknown: true,
        providerReturnedUsage: false,
        latencyMs: 1234,
        errorType: "provider_timeout"
      }
    });
    expect(result.items[0]).not.toHaveProperty("metadata");
    expect(JSON.stringify(result)).not.toContain("完整 response");
    expect(JSON.stringify(result)).not.toContain("Authorization");
  });

  it("returns AI call logs without cost estimates and explains request count semantics", async () => {
    const result = await logsViewerService.queryAiCallLogs(
      {
        page: 1,
        pageSize: 10,
        provider: "mock",
        status: AiCallStatus.succeeded,
        startDate: runStart.toISOString(),
        endDate: runEnd.toISOString()
      },
      contextFor(companyAdmin, MembershipRole.company_admin)
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: aiCallLogId,
      createdById: companyAdmin.id,
      createdByName: companyAdmin.name,
      provider: "mock",
      purpose: "content_publish_optimization",
      relatedType: "content_item",
      relatedId: "content-item-safe",
      status: AiCallStatus.succeeded,
      isMockInferred: true,
      requestCountLabel: "一条调用流水=1"
    });
    expect(result.items[0]).not.toHaveProperty("costEstimate");

    const detail = await logsViewerService.getAiCallLogDetail(
      aiCallLogId,
      contextFor(companyAdmin, MembershipRole.company_admin)
    );
    expect(detail).not.toHaveProperty("costEstimate");
    expect(JSON.stringify(detail)).not.toContain("9.990000");
  });

  it("returns NotFoundException for missing or invisible records", async () => {
    await expect(
      logsViewerService.getAiUsageRecordDetail("missing-log-id", contextFor(companyAdmin, MembershipRole.company_admin))
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps logs viewer API routes to the existing operation logs module permission", () => {
    expect(resolveApiModuleKey("/api/logs-viewer/ai-call-logs?page=1")).toBe("operation-logs");
  });

  async function seedLogs() {
    // 直接写入带敏感字段的测试日志，验证 viewer API 不依赖写入端脱敏也能安全收口。
    const operationLog = await prisma.operationLog.create({
      data: {
        companyId: company.id,
        userId: companyAdmin.id,
        departmentId: department.id,
        moduleKey: "geo-content",
        action: "geo_content.article.quality_checked",
        targetType: "content_item",
        targetId: "content-item-safe",
        targetTitle: "安全质检样本",
        success: false,
        errorMessage: "provider failed because Authorization Bearer secret-token was rejected",
        ip: "127.0.0.1",
        userAgent: "Chrome Sensitive UA",
        metadata: {
          safeCount: 2,
          prompt: "完整 prompt 不应出现在日志查看 API",
          apiKey: "sk-test-secret-key"
        },
        createdAt: new Date(runStart.getTime() + 1_000)
      }
    });
    operationLogId = operationLog.id;

    const aiUsageRecord = await prisma.aiUsageRecord.create({
      data: {
        companyId: company.id,
        userId: companyAdmin.id,
        departmentId: department.id,
        moduleKey: "geo-content",
        action: "quality_check",
        provider: "openai_compatible",
        model: "safe-test-model",
        isMock: false,
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        requestCount: 1,
        success: false,
        errorMessage: "provider timeout with Authorization Bearer secret-token",
        metadata: {
          usageUnknown: true,
          providerReturnedUsage: false,
          latencyMs: 1234,
          errorType: "provider_timeout",
          response: "完整 response 不应出现在日志查看 API",
          Authorization: "Bearer secret-token"
        },
        createdAt: new Date(runStart.getTime() + 2_000)
      }
    });
    aiUsageRecordId = aiUsageRecord.id;

    // costEstimate 只留在数据库里，日志查看 API 不能把它当成前端费用字段返回。
    const aiCallLog = await prisma.aiCallLog.create({
      data: {
        companyId: company.id,
        createdById: companyAdmin.id,
        provider: "mock",
        model: "mock-content-v1",
        purpose: "content_publish_optimization",
        relatedType: "content_item",
        relatedId: "content-item-safe",
        tokenInput: 12,
        tokenOutput: 24,
        costEstimate: "9.990000",
        status: AiCallStatus.succeeded,
        createdAt: new Date(runStart.getTime() + 3_000)
      }
    });
    aiCallLogId = aiCallLog.id;
  }

  function contextFor(user: UserSeed, role: MembershipRole): ResourceAccessContext {
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
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
          status: department.status
        },
        accessibleModules: ["operation-logs", "usage-analytics"]
      },
      currentMembership: {
        companyId: company.id,
        role,
        isDefault: true,
        isPlatformAdmin: user.role === UserRole.platform_admin,
        departmentId: department.id,
        accessibleModules: ["operation-logs", "usage-analytics"]
      }
    };
  }
});
