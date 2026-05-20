import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  DepartmentStatus,
  KnowledgeMaterialType,
  KnowledgeReviewStatus,
  MembershipRole,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { AftersalesQaService } from "../src/modules/aftersales-qa/aftersales-qa.service";
import { AiUsageService } from "../src/modules/usage/ai-usage.service";
import { OperationLogsService } from "../src/modules/usage/operation-logs.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("AftersalesQaService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: AftersalesQaService;
  let aiUsageService: AiUsageService;
  let operationLogsService: OperationLogsService;

  let companyA: { id: string; name: string; code: string; status: CompanyStatus };
  let companyB: { id: string; name: string; code: string; status: CompanyStatus };
  let allowedDepartment: { id: string; name: string; code: string; status: DepartmentStatus };
  let blockedDepartment: { id: string; name: string; code: string; status: DepartmentStatus };
  let inactiveDepartment: { id: string; name: string; code: string; status: DepartmentStatus };
  let companyAdmin: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let allowedOperator: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let blockedOperator: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let inactiveOperator: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let viewer: { id: string; name: string; email: string; role: UserRole; status: UserStatus };
  let otherCompanyAdmin: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  };

  beforeAll(async () => {
    if (!databaseUrl?.includes("geo_workstation_crud_smoke")) {
      throw new Error("Aftersales QA tests must run with the geo_workstation_crud_smoke database.");
    }

    prisma = createPrismaClient();
    await prisma.$connect();

    aiUsageService = new AiUsageService(prisma as unknown as PrismaService);
    operationLogsService = new OperationLogsService(prisma as unknown as PrismaService);
    service = new AftersalesQaService(
      prisma as unknown as PrismaService,
      aiUsageService,
      operationLogsService
    );

    companyA = await prisma.company.create({
      data: {
        name: `AFTERSALES Company A ${runId}`,
        code: `aftersales-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `AFTERSALES Company B ${runId}`,
        code: `aftersales-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    allowedDepartment = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `Allowed AfterSales ${runId}`,
        code: `aftersales-allowed-${runId}`,
        status: DepartmentStatus.active
      }
    });
    blockedDepartment = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `Blocked AfterSales ${runId}`,
        code: `aftersales-blocked-${runId}`,
        status: DepartmentStatus.active
      }
    });
    inactiveDepartment = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `Inactive AfterSales ${runId}`,
        code: `aftersales-inactive-${runId}`,
        status: DepartmentStatus.inactive
      }
    });

    companyAdmin = await createUser("company-admin", UserRole.company_admin);
    allowedOperator = await createUser("allowed-operator", UserRole.operator);
    blockedOperator = await createUser("blocked-operator", UserRole.operator);
    inactiveOperator = await createUser("inactive-operator", UserRole.operator);
    viewer = await createUser("viewer", UserRole.viewer);
    otherCompanyAdmin = await createUser("other-admin", UserRole.company_admin);

    await createMembership(companyAdmin.id, companyA.id, MembershipRole.company_admin);
    await createMembership(allowedOperator.id, companyA.id, MembershipRole.operator, allowedDepartment.id);
    await createMembership(blockedOperator.id, companyA.id, MembershipRole.operator, blockedDepartment.id);
    await createMembership(inactiveOperator.id, companyA.id, MembershipRole.operator, inactiveDepartment.id);
    await createMembership(viewer.id, companyA.id, MembershipRole.viewer, allowedDepartment.id);
    await createMembership(otherCompanyAdmin.id, companyB.id, MembershipRole.company_admin);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createUser(prefix: string, role: UserRole) {
    return prisma.user.create({
      data: {
        email: `aftersales-${prefix}-${runId}@example.com`,
        name: `AFTERSALES ${prefix}`,
        role,
        status: UserStatus.active
      }
    });
  }

  async function createMembership(
    userId: string,
    companyId: string,
    role: MembershipRole,
    departmentId?: string
  ) {
    return prisma.membership.create({
      data: {
        userId,
        companyId,
        role,
        departmentId,
        status: "active",
        isDefault: true
      }
    });
  }

  function contextFor(
    user: typeof companyAdmin,
    role: MembershipRole,
    options: {
      company?: typeof companyA;
      department?: typeof allowedDepartment | null;
      accessibleModules?: string[];
    } = {}
  ): ResourceAccessContext {
    const company = options.company ?? companyA;
    const department = options.department === undefined ? allowedDepartment : options.department;

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
        department: department
          ? {
              id: department.id,
              name: department.name,
              code: department.code,
              status: department.status
            }
          : null,
        accessibleModules: options.accessibleModules ?? ["aftersales-qa"]
      },
      currentMembership: {
        companyId: company.id,
        role,
        isDefault: true,
        isPlatformAdmin: user.role === UserRole.platform_admin,
        departmentId: department?.id ?? null,
        accessibleModules: options.accessibleModules ?? ["aftersales-qa"]
      }
    };
  }

  async function createKnowledgeMaterial(input: {
    companyId?: string;
    createdById?: string;
    title: string;
    fileName?: string;
    materialType: KnowledgeMaterialType;
    reviewStatus: KnowledgeReviewStatus;
    applicableModules?: string[] | null;
    allowedDepartmentIds?: string[] | null;
    content: string;
    chunkTitle?: string;
  }) {
    const companyId = input.companyId ?? companyA.id;
    const createdById = input.createdById ?? companyAdmin.id;
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        companyId,
        name: `${input.title} KB ${runId}`,
        description: "售后问答测试知识库",
        visibility: Visibility.COMPANY,
        status: "active",
        createdById
      }
    });
    const knowledgeFile = await prisma.knowledgeFile.create({
      data: {
        companyId,
        knowledgeBaseId: knowledgeBase.id,
        title: input.title,
        fileName: input.fileName ?? `${input.title}.txt`,
        fileType: "txt",
        fileSize: input.content.length,
        storagePath: `/Users/a9527/private/${input.title}.txt`,
        sourceType: "manual",
        materialType: input.materialType,
        reviewStatus: input.reviewStatus,
        trustLevel: "high",
        applicableModules: input.applicableModules ?? ["aftersales-qa"],
        allowedDepartmentIds: input.allowedDepartmentIds ?? [],
        parseStatus: "succeeded",
        createdById
      }
    });
    const chunk = await prisma.knowledgeChunk.create({
      data: {
        companyId,
        knowledgeBaseId: knowledgeBase.id,
        fileId: knowledgeFile.id,
        title: input.chunkTitle ?? input.title,
        content: input.content,
        sourceType: "manual",
        materialType: input.materialType
      }
    });

    return { knowledgeBase, knowledgeFile, chunk };
  }

  it("returns a no-reliable-source answer when there is no approved售后 or product material", async () => {
    await createKnowledgeMaterial({
      title: `Pending售后 ${runId}`,
      materialType: KnowledgeMaterialType.aftersales_material,
      reviewStatus: KnowledgeReviewStatus.pending,
      allowedDepartmentIds: [allowedDepartment.id],
      content: "变频器故障代码 E01 表示当前只是待审核资料，不能作为售后问答依据。"
    });
    await createKnowledgeMaterial({
      title: `Disabled售后 ${runId}`,
      materialType: KnowledgeMaterialType.aftersales_material,
      reviewStatus: KnowledgeReviewStatus.disabled,
      allowedDepartmentIds: [allowedDepartment.id],
      content: "变频器故障代码 E01 表示当前是停用资料，不能作为售后问答依据。"
    });

    const result = await service.ask(
      {
        question: "变频器 E01 故障怎么处理？"
      },
      contextFor(allowedOperator, MembershipRole.operator)
    );

    expect(result).toMatchObject({
      answerStatus: "no_reliable_source",
      isAnswered: false,
      hasReliableSource: false,
      citedSources: []
    });
    expect(result.answer).toContain("知识库中未找到可靠依据");
  });

  it("answers from approved售后 materials only when department access is valid", async () => {
    const approved = await createKnowledgeMaterial({
      title: `E01 售后处理 ${runId}`,
      materialType: KnowledgeMaterialType.aftersales_material,
      reviewStatus: KnowledgeReviewStatus.approved,
      allowedDepartmentIds: [allowedDepartment.id],
      content:
        "变频器 E01 故障表示过流保护。售后应先断电检查负载是否卡滞，再检查输出线缆短路，确认后复位试运行。"
    });
    await createKnowledgeMaterial({
      title: `公司可信信息 ${runId}`,
      materialType: KnowledgeMaterialType.company_trust_material,
      reviewStatus: KnowledgeReviewStatus.approved,
      content: "公司可信信息中也提到 E01，但售后问答不能把它作为直接依据。"
    });

    const allowedResult = await service.ask(
      {
        question: "客户反馈变频器 E01 过流故障，要怎么排查？"
      },
      contextFor(allowedOperator, MembershipRole.operator)
    );
    const blockedResult = await service.ask(
      {
        question: "客户反馈变频器 E01 过流故障，要怎么排查？"
      },
      contextFor(blockedOperator, MembershipRole.operator, {
        department: blockedDepartment
      })
    );
    const inactiveResult = await service.ask(
      {
        question: "客户反馈变频器 E01 过流故障，要怎么排查？"
      },
      contextFor(inactiveOperator, MembershipRole.operator, {
        department: inactiveDepartment
      })
    );

    expect(allowedResult).toMatchObject({
      answerStatus: "answered",
      isAnswered: true,
      hasReliableSource: true
    });
    expect(allowedResult.answer).toContain("过流保护");
    expect(allowedResult.citedSources).toHaveLength(1);
    expect(allowedResult.citedSources[0]).toMatchObject({
      knowledgeBaseId: approved.knowledgeBase.id,
      knowledgeBaseName: approved.knowledgeBase.name,
      fileId: approved.knowledgeFile.id,
      fileTitle: approved.knowledgeFile.title,
      chunkId: approved.chunk.id,
      materialType: KnowledgeMaterialType.aftersales_material
    });
    expect(JSON.stringify(allowedResult.citedSources)).not.toContain("storagePath");
    expect(JSON.stringify(allowedResult.citedSources)).not.toContain("/Users/a9527");
    expect(allowedResult.usedMaterialTypes).toEqual([KnowledgeMaterialType.aftersales_material]);
    expect(blockedResult.answerStatus).toBe("no_reliable_source");
    expect(inactiveResult.answerStatus).toBe("no_reliable_source");
  });

  it("falls back to approved product material and still ignores unrelated material types", async () => {
    const product = await createKnowledgeMaterial({
      title: `M300 产品手册 ${runId}`,
      materialType: KnowledgeMaterialType.product_material,
      reviewStatus: KnowledgeReviewStatus.approved,
      applicableModules: [],
      content:
        "M300 传感器支持 NPN 和 PNP 双输出，现场接线前应确认负载电源和输出类型，避免误接导致无信号。"
    });
    await createKnowledgeMaterial({
      title: `内容引用资料 ${runId}`,
      materialType: KnowledgeMaterialType.content_reference_material,
      reviewStatus: KnowledgeReviewStatus.approved,
      content: "内容引用资料提到 M300 接线，但售后问答第一版不能把它作为依据。"
    });

    const result = await service.ask(
      {
        question: "M300 传感器无信号，应该先检查什么？"
      },
      contextFor(blockedOperator, MembershipRole.operator, {
        department: blockedDepartment
      })
    );

    expect(result).toMatchObject({
      answerStatus: "answered",
      isAnswered: true,
      hasReliableSource: true
    });
    expect(result.citedSources).toHaveLength(1);
    expect(result.citedSources[0]).toMatchObject({
      fileId: product.knowledgeFile.id,
      materialType: KnowledgeMaterialType.product_material
    });
    expect(result.usedMaterialTypes).toEqual([KnowledgeMaterialType.product_material]);
  });

  it("creates usage and operation records and scopes question history by role and company", async () => {
    const result = await service.ask(
      {
        question: "M300 传感器无信号如何排查？"
      },
      contextFor(allowedOperator, MembershipRole.operator)
    );

    const usage = await prisma.aiUsageRecord.findMany({
      where: {
        moduleKey: "aftersales-qa",
        action: "ask",
        userId: allowedOperator.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const operations = await prisma.operationLog.findMany({
      where: {
        moduleKey: "aftersales-qa",
        action: "ai_question",
        targetId: result.recordId
      }
    });

    expect(usage[0]).toMatchObject({
      companyId: companyA.id,
      userId: allowedOperator.id,
      departmentId: allowedDepartment.id,
      provider: "mock",
      model: "internal-rule-based",
      isMock: true,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestCount: 1,
      success: true
    });
    expect(operations[0]).toMatchObject({
      companyId: companyA.id,
      userId: allowedOperator.id,
      departmentId: allowedDepartment.id,
      moduleKey: "aftersales-qa",
      action: "ai_question",
      targetType: "aftersales_question_record",
      targetId: result.recordId,
      success: true
    });
    expect(JSON.stringify(operations[0].metadata)).not.toContain("storagePath");
    expect(JSON.stringify(operations[0].metadata)).not.toContain("输出线缆短路");

    const ownRecords = await service.findRecords({}, contextFor(allowedOperator, MembershipRole.operator));
    const viewerRecords = await service.findRecords({}, contextFor(viewer, MembershipRole.viewer));
    const adminRecords = await service.findRecords({}, contextFor(companyAdmin, MembershipRole.company_admin));

    expect(ownRecords.items.every((record) => record.userId === allowedOperator.id)).toBe(true);
    expect(viewerRecords.items.every((record) => record.userId === viewer.id)).toBe(true);
    expect(adminRecords.items.some((record) => record.id === result.recordId)).toBe(true);

    const otherCompanyRecords = await service.findRecords(
      {},
      contextFor(otherCompanyAdmin, MembershipRole.company_admin, {
        company: companyB,
        department: null
      })
    );

    expect(otherCompanyRecords.items.some((record) => record.id === result.recordId)).toBe(false);
    await expect(
      service.getRecord(
        result.recordId,
        contextFor(otherCompanyAdmin, MembershipRole.company_admin, {
          company: companyB,
          department: null
        })
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.ask(
        {
          question: "没有模块权限时能否提问？"
        },
        contextFor(allowedOperator, MembershipRole.operator, {
          accessibleModules: ["dashboard"]
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
