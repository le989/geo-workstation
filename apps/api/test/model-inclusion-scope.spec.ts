import {
  BadRequestException,
  ForbiddenException
} from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  RecordMethod,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { ReportsService } from "../src/modules/geo-reports/reports.service";
import { ModelInclusionRecordsService } from "../src/modules/model-inclusion/model-inclusion-records.service";
import { AliyunBailianWebSearchProvider } from "../src/modules/model-inclusion/providers/aliyun-bailian-web-search.provider";
import { KimiWebSearchProvider } from "../src/modules/model-inclusion/providers/kimi-web-search.provider";
import { VolcengineWebSearchProvider } from "../src/modules/model-inclusion/providers/volcengine-web-search.provider";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ModelInclusionRecordsService SCHEMA-1 scope", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ModelInclusionRecordsService;
  let reportsService: ReportsService;
  let companyA: Awaited<ReturnType<typeof createCompany>>;
  let companyB: Awaited<ReturnType<typeof createCompany>>;
  let platformAdmin: Awaited<ReturnType<typeof createUser>>;
  let companyAdminA: Awaited<ReturnType<typeof createUser>>;
  let companyAdminB: Awaited<ReturnType<typeof createUser>>;
  let operatorA: Awaited<ReturnType<typeof createUser>>;
  let viewerA: Awaited<ReturnType<typeof createUser>>;
  let platformContext: ResourceAccessContext;
  let companyAdminAContext: ResourceAccessContext;
  let operatorAContext: ResourceAccessContext;
  let viewerAContext: ResourceAccessContext;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new ModelInclusionRecordsService(
      prisma as unknown as PrismaService,
      { search: vi.fn() } as unknown as KimiWebSearchProvider,
      { search: vi.fn() } as unknown as VolcengineWebSearchProvider,
      { search: vi.fn() } as unknown as AliyunBailianWebSearchProvider
    );
    reportsService = new ReportsService(prisma as unknown as PrismaService);

    companyA = await createCompany("a");
    companyB = await createCompany("b");
    platformAdmin = await createUser("platform-admin", UserRole.platform_admin);
    companyAdminA = await createUser("company-admin-a", UserRole.company_admin);
    companyAdminB = await createUser("company-admin-b", UserRole.company_admin);
    operatorA = await createUser("operator-a", UserRole.operator);
    viewerA = await createUser("viewer-a", UserRole.viewer);
    platformContext = buildContext(platformAdmin, companyA, MembershipRole.platform_admin);
    companyAdminAContext = buildContext(companyAdminA, companyA, MembershipRole.company_admin);
    operatorAContext = buildContext(operatorA, companyA, MembershipRole.operator);
    viewerAContext = buildContext(viewerA, companyA, MembershipRole.viewer);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function unique(label: string): string {
    return `SCHEMA-1 ${label} ${runId}`;
  }

  async function createCompany(label: string) {
    return prisma.company.create({
      data: {
        name: unique(`公司 ${label}`),
        code: `schema-1-${label}-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
  }

  async function createUser(label: string, role: UserRole) {
    return prisma.user.create({
      data: {
        email: `schema-1-${label}-${runId}@example.com`,
        name: `SCHEMA-1 ${label}`,
        role,
        status: UserStatus.active
      }
    });
  }

  function buildContext(
    user: Awaited<ReturnType<typeof createUser>>,
    company: Awaited<ReturnType<typeof createCompany>>,
    role: MembershipRole
  ): ResourceAccessContext {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isPlatformAdmin: user.role === UserRole.platform_admin || user.role === UserRole.admin
      },
      currentCompany: {
        id: company.id,
        name: company.name,
        code: company.code,
        role,
        isDefault: true,
        status: company.status
      },
      currentMembership: {
        companyId: company.id,
        role,
        isDefault: true,
        isPlatformAdmin: role === MembershipRole.platform_admin
      }
    };
  }

  async function createPrompt(
    label: string,
    companyId = companyA.id,
    createdById = operatorA.id,
    latestCoverageStatus?: string
  ) {
    return prisma.geoPrompt.create({
      data: {
        company: {
          connect: {
            id: companyId
          }
        },
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: unique("模型覆盖产品线"),
        scenario: "模型覆盖记录编辑作废测试",
        userIntent: UserIntent.selection,
        priority: 4,
        trackEnabled: true,
        latestCoverageStatus,
        visibility: Visibility.COMPANY,
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });
  }

  async function createRecord(input: {
    label: string;
    companyId?: string;
    geoPromptId?: string;
    createdById?: string;
    model?: string;
    platform?: string;
    checkedAt?: Date;
    brandMentioned?: boolean;
    brandRecommended?: boolean;
    hitLevel?: string;
  }) {
    const prompt =
      input.geoPromptId ??
      (
        await createPrompt(
          `${input.label} prompt`,
          input.companyId ?? companyA.id,
          input.createdById ?? operatorA.id
        )
      ).id;

    return prisma.modelInclusionRecord.create({
      data: {
        company: {
          connect: {
            id: input.companyId ?? companyA.id
          }
        },
        geoPrompt: {
          connect: {
            id: prompt
          }
        },
        model: input.model ?? unique(`${input.label} model`),
        platform: input.platform ?? "Kimi",
        checkedAt: input.checkedAt ?? new Date(),
        brandMentioned: input.brandMentioned ?? false,
        brandRecommended: input.brandRecommended ?? false,
        citedOfficialSite: false,
        citedContentAsset: false,
        competitorMentioned: false,
        hitLevel: input.hitLevel ?? "not_mentioned",
        answerSummary: unique(`${input.label} answer`),
        competitors: [],
        recordMethod: RecordMethod.manual,
        createdBy: {
          connect: {
            id: input.createdById ?? operatorA.id
          }
        }
      }
    });
  }

  it("allows platform_admin and company_admin to edit result fields only", async () => {
    const record = await createRecord({ label: "edit own" });
    const updatedByPlatform = await service.updateRecord(
      record.id,
      {
        brandMentioned: true,
        brandRecommended: true,
        rankingPosition: 2,
        citedOfficialSite: true,
        citedContentAsset: true,
        competitorMentioned: true,
        hitLevel: "recommended",
        answerSummary: "管理员修订后的回答摘要",
        rawAnswer: "管理员修订后的原始回答",
        citations: [{ title: "官网", url: "https://example.com" }],
        searchResults: [{ title: "搜索结果", url: "https://example.com/search" }],
        screenshotPath: "screenshots/schema-1.png",
        errorMessage: "管理员补充错误说明",
        competitors: ["竞品A"],
        checkedAt: new Date("2026-05-21T19:10:00.000Z")
      },
      platformContext
    );

    expect(updatedByPlatform).toMatchObject({
      id: record.id,
      brandMentioned: true,
      brandRecommended: true,
      rankingPosition: 2,
      citedOfficialSite: true,
      citedContentAsset: true,
      competitorMentioned: true,
      hitLevel: "recommended",
      answerSummary: "管理员修订后的回答摘要",
      rawAnswer: "管理员修订后的原始回答",
      screenshotPath: "screenshots/schema-1.png",
      errorMessage: "管理员补充错误说明",
      competitors: ["竞品A"]
    });

    const updatedByCompanyAdmin = await service.updateRecord(
      record.id,
      {
        brandRecommended: false,
        hitLevel: "mentioned",
        answerSummary: "公司管理员二次修订"
      },
      companyAdminAContext
    );
    const stored = await prisma.modelInclusionRecord.findUniqueOrThrow({
      where: {
        id: record.id
      }
    });

    expect(updatedByCompanyAdmin.answerSummary).toBe("公司管理员二次修订");
    expect(stored.companyId).toBe(companyA.id);
    expect(stored.geoPromptId).toBe(record.geoPromptId);
    expect(stored.model).toBe(record.model);
    expect(stored.platform).toBe(record.platform);
    expect(stored.recordMethod).toBe(RecordMethod.manual);
    expect(stored.createdAt.toISOString()).toBe(record.createdAt.toISOString());
    expect(stored.updatedById).toBe(companyAdminA.id);
  });

  it("blocks cross-company, operator, viewer, and core field mutations", async () => {
    const otherRecord = await createRecord({
      label: "other company",
      companyId: companyB.id,
      createdById: companyAdminB.id
    });
    const ownRecord = await createRecord({ label: "blocked own" });

    await expect(
      service.updateRecord(
        otherRecord.id,
        {
          answerSummary: "跨公司修订"
        },
        companyAdminAContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateRecord(
        ownRecord.id,
        {
          answerSummary: "运营人员修订"
        },
        operatorAContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.voidRecord(
        otherRecord.id,
        {
          voidReason: "跨公司作废"
        },
        companyAdminAContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.voidRecord(
        ownRecord.id,
        {
          voidReason: "运营人员作废"
        },
        operatorAContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.voidRecord(
        ownRecord.id,
        {
          voidReason: "只读用户作废"
        },
        viewerAContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateRecord(
        ownRecord.id,
        {
          answerSummary: "只读用户修订"
        },
        viewerAContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    const maliciousPayload = {
      companyId: companyB.id,
      geoPromptId: otherRecord.geoPromptId,
      model: "malicious-model",
      platform: "Malicious Platform",
      recordMethod: "api",
      createdAt: "2020-01-01T00:00:00.000Z",
      answerSummary: "只应更新结果字段"
    };
    await service.updateRecord(ownRecord.id, maliciousPayload, companyAdminAContext);
    const stored = await prisma.modelInclusionRecord.findUniqueOrThrow({
      where: {
        id: ownRecord.id
      }
    });

    expect(stored.companyId).toBe(companyA.id);
    expect(stored.geoPromptId).toBe(ownRecord.geoPromptId);
    expect(stored.model).toBe(ownRecord.model);
    expect(stored.platform).toBe(ownRecord.platform);
    expect(stored.recordMethod).toBe(RecordMethod.manual);
    expect(stored.createdAt.toISOString()).toBe(ownRecord.createdAt.toISOString());
    expect(stored.answerSummary).toBe("只应更新结果字段");
  });

  it("soft voids records, filters them from default list, summary, reports, and uncovered prompts", async () => {
    const prompt = await createPrompt("void prompt", companyA.id, operatorA.id, "recommended");
    const olderRecord = await createRecord({
      label: "older",
      geoPromptId: prompt.id,
      checkedAt: new Date("2026-05-21T18:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: false,
      hitLevel: "mentioned"
    });
    const latestRecord = await createRecord({
      label: "latest",
      geoPromptId: prompt.id,
      checkedAt: new Date("2026-05-21T19:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: true,
      hitLevel: "recommended"
    });
    const model = latestRecord.model;

    await expect(
      service.voidRecord(latestRecord.id, { voidReason: "" }, companyAdminAContext)
    ).rejects.toBeInstanceOf(BadRequestException);

    const voided = await service.voidRecord(
      latestRecord.id,
      {
        voidReason: "人工复查发现该回答来自错误来源。"
      },
      companyAdminAContext
    );
    const storedVoided = await prisma.modelInclusionRecord.findUniqueOrThrow({
      where: {
        id: latestRecord.id
      }
    });
    const promptAfterVoid = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: prompt.id
      }
    });

    expect(voided.voidedAt).toBeTruthy();
    expect(voided.voidedByUserId).toBe(companyAdminA.id);
    expect(voided.voidReason).toBe("人工复查发现该回答来自错误来源。");
    expect(storedVoided.voidedAt).toBeTruthy();
    expect(storedVoided.voidedByUserId).toBe(companyAdminA.id);
    expect(storedVoided.voidReason).toBe("人工复查发现该回答来自错误来源。");
    expect(promptAfterVoid.latestCoverageStatus).toBe("mentioned");

    await expect(
      service.voidRecord(latestRecord.id, { voidReason: "重复作废" }, companyAdminAContext)
    ).rejects.toBeInstanceOf(BadRequestException);

    const defaultList = await service.findMany({ model, page: 1, pageSize: 20 }, companyAdminAContext);
    const voidedList = await service.findMany(
      { model, voidStatus: "voided", page: 1, pageSize: 20 },
      companyAdminAContext
    );
    const allList = await service.findMany(
      { model, voidStatus: "all", page: 1, pageSize: 20 },
      companyAdminAContext
    );
    const defaultSummary = await service.getSummary({ model }, companyAdminAContext);
    const modelCoverage = await reportsService.getModelCoverage({ model }, companyAdminAContext);
    const uncovered = await service.findUncoveredPrompts(
      {
        model,
        trackEnabled: true,
        page: 1,
        pageSize: 20
      },
      companyAdminAContext
    );
    const existingCount = await prisma.modelInclusionRecord.count({
      where: {
        id: latestRecord.id
      }
    });

    expect(defaultList.items.map((item) => item.id)).not.toContain(latestRecord.id);
    expect(voidedList.items.map((item) => item.id)).toContain(latestRecord.id);
    expect(allList.items.map((item) => item.id)).toContain(latestRecord.id);
    expect(defaultSummary.totalRecords).toBe(0);
    expect(modelCoverage.totalRecords).toBe(0);
    expect(uncovered.items.map((item) => item.geoPromptId)).toContain(prompt.id);
    expect(existingCount).toBe(1);
    expect(olderRecord.id).toBeTruthy();
  });

  it("restores voided records and brings them back into default list and reports", async () => {
    const prompt = await createPrompt("restore prompt", companyA.id, operatorA.id, "not_mentioned");
    const record = await createRecord({
      label: "restore",
      geoPromptId: prompt.id,
      checkedAt: new Date("2026-05-21T20:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: true,
      hitLevel: "recommended"
    });
    const model = record.model;
    await service.voidRecord(record.id, { voidReason: "待恢复测试" }, companyAdminAContext);

    await expect(service.restoreRecord(record.id, operatorAContext)).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.restoreRecord(record.id, viewerAContext)).rejects.toBeInstanceOf(
      ForbiddenException
    );

    const restored = await service.restoreRecord(record.id, companyAdminAContext);
    const storedRestored = await prisma.modelInclusionRecord.findUniqueOrThrow({
      where: {
        id: record.id
      }
    });
    const promptAfterRestore = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: prompt.id
      }
    });
    const defaultList = await service.findMany({ model, page: 1, pageSize: 20 }, companyAdminAContext);
    const defaultSummary = await service.getSummary({ model }, companyAdminAContext);
    const modelCoverage = await reportsService.getModelCoverage({ model }, companyAdminAContext);

    expect(restored.voidedAt).toBeUndefined();
    expect(restored.voidReason).toBeUndefined();
    expect(restored.restoredAt).toBeTruthy();
    expect(restored.restoredByUserId).toBe(companyAdminA.id);
    expect(storedRestored.voidedAt).toBeNull();
    expect(storedRestored.voidReason).toBeNull();
    expect(storedRestored.restoredAt).toBeTruthy();
    expect(storedRestored.restoredByUserId).toBe(companyAdminA.id);
    expect(promptAfterRestore.latestCoverageStatus).toBe("recommended");
    expect(defaultList.items.map((item) => item.id)).toContain(record.id);
    expect(defaultSummary.totalRecords).toBe(1);
    expect(modelCoverage.totalRecords).toBe(1);

    await expect(service.restoreRecord(record.id, companyAdminAContext)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
