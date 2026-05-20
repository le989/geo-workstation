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
    expect(result.answer).toContain("未找到可引用资料");
  });

  it("answers system usage guide questions without citing knowledge material", async () => {
    const result = await service.ask(
      {
        question: "怎么补充资料？"
      },
      contextFor(allowedOperator, MembershipRole.operator)
    );
    const operations = await prisma.operationLog.findMany({
      where: {
        moduleKey: "aftersales-qa",
        action: "ai_question",
        targetId: result.recordId
      }
    });

    expect(result).toMatchObject({
      answerStatus: "answered",
      isAnswered: true,
      hasReliableSource: false,
      citedSources: [],
      usedMaterialTypes: []
    });
    expect(result.answer).toContain("知识库");
    expect(result.answer).toContain("审核通过后");
    expect(operations).toHaveLength(1);
    expect(JSON.stringify(operations[0]?.metadata)).not.toContain("storagePath");
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

  it("creates a conversation, auto-generates title after the first question, and supports renaming", async () => {
    await createKnowledgeMaterial({
      title: `LD30 会话售后资料 ${runId}`,
      materialType: KnowledgeMaterialType.aftersales_material,
      reviewStatus: KnowledgeReviewStatus.approved,
      allowedDepartmentIds: [allowedDepartment.id],
      content:
        "LD30 激光测距传感器没有输出时，应先确认供电电压，再检查输出线是否接反，最后复位控制器。"
    });

    const context = contextFor(allowedOperator, MembershipRole.operator);
    const conversation = await service.createConversation({}, context);

    expect(conversation).toMatchObject({
      companyId: companyA.id,
      userId: allowedOperator.id,
      departmentId: allowedDepartment.id,
      title: "新售后会话",
      status: "active"
    });

    const answer = await service.askInConversation(
      conversation.id,
      {
        question: "LD30 激光测距传感器没有输出怎么办？"
      },
      context
    );

    expect(answer).toMatchObject({
      conversationId: conversation.id,
      question: "LD30 激光测距传感器没有输出怎么办？",
      answerStatus: "answered",
      isAnswered: true,
      hasReliableSource: true
    });
    expect(answer.aiUsage).toMatchObject({
      provider: "mock",
      model: "internal-rule-based",
      isMock: true,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestCount: 1
    });

    const detail = await service.getConversation(conversation.id, context);
    expect(detail.conversation.title).toBe("LD30 激光测距传感器无输出排查");
    expect(detail.records).toHaveLength(1);
    expect(detail.records[0]).toMatchObject({
      id: answer.recordId,
      conversationId: conversation.id,
      sequence: 1
    });

    const renamed = await service.updateConversation(
      conversation.id,
      {
        title: "LD30 无输出排查"
      },
      context
    );

    expect(renamed.title).toBe("LD30 无输出排查");
  });

  it("uses previous question plus current question for the second turn retrieval", async () => {
    await createKnowledgeMaterial({
      title: `CTX123 连续追问资料 ${runId}`,
      materialType: KnowledgeMaterialType.product_material,
      reviewStatus: KnowledgeReviewStatus.approved,
      applicableModules: ["aftersales-qa"],
      content:
        "CTX123 设备故障时应先检查电源模块和端子排，再复位控制器；若仍异常，需要记录现场指示灯状态。"
    });

    const context = contextFor(companyAdmin, MembershipRole.company_admin);
    const conversation = await service.createConversation({ title: "CTX123 排查" }, context);

    await service.askInConversation(
      conversation.id,
      {
        question: "CTX123 设备故障应该先看什么？"
      },
      context
    );

    const followUp = await service.askInConversation(
      conversation.id,
      {
        question: "继续怎么办？"
      },
      context
    );

    expect(followUp.answerStatus).toBe("answered");
    expect(followUp.citedSources).toHaveLength(1);
    expect(followUp.citedSources[0].fileTitle).toContain("CTX123");
    expect(followUp.sequence).toBe(2);
  });

  it("returns a clarification answer for vague questions without useful context", async () => {
    const context = contextFor(companyAdmin, MembershipRole.company_admin);
    const conversation = await service.createConversation({}, context);

    const result = await service.askInConversation(
      conversation.id,
      {
        question: "没反应怎么办"
      },
      context
    );

    expect(result).toMatchObject({
      answerStatus: "needs_clarification",
      isAnswered: false,
      hasReliableSource: false,
      citedSources: []
    });
    expect(result.answer).toContain("需要补充信息后才能继续排查");
    expect(result.answer).toContain("1. 产品型号");
    expect(result.answer).toContain("4. 接线情况或供电电压");
  });

  it("limits cited sources to three and keeps old records API compatible", async () => {
    for (let index = 0; index < 4; index += 1) {
      await createKnowledgeMaterial({
        title: `E77 多引用资料 ${index} ${runId}`,
        materialType: KnowledgeMaterialType.aftersales_material,
        reviewStatus: KnowledgeReviewStatus.approved,
        allowedDepartmentIds: [allowedDepartment.id],
        content: `E77 故障表示安全回路断开，第 ${index} 条资料建议检查安全门、急停按钮和复位回路。`
      });
    }

    const context = contextFor(allowedOperator, MembershipRole.operator);
    const conversation = await service.createConversation({}, context);
    const result = await service.askInConversation(
      conversation.id,
      {
        question: "E77 故障安全回路断开怎么处理？"
      },
      context
    );

    expect(result.citedSources).toHaveLength(3);
    expect(JSON.stringify(result.citedSources)).not.toContain("storagePath");
    expect(JSON.stringify(result.citedSources)).not.toContain("/Users/a9527");

    const records = await service.findRecords({}, context);
    expect(records.items.some((record) => record.id === result.recordId)).toBe(true);

    const oldRecord = await service.ask(
      {
        question: "旧接口仍然可以提问吗？"
      },
      context
    );
    const oldRecordDetail = await service.getRecord(oldRecord.recordId, context);
    expect(oldRecordDetail.conversationId).toBeNull();
  });

  it("scopes conversations by role and company and logs conversation id", async () => {
    const operatorContext = contextFor(allowedOperator, MembershipRole.operator);
    const viewerContext = contextFor(viewer, MembershipRole.viewer);
    const adminContext = contextFor(companyAdmin, MembershipRole.company_admin);
    const otherCompanyContext = contextFor(otherCompanyAdmin, MembershipRole.company_admin, {
      company: companyB,
      department: null
    });
    const conversation = await service.createConversation({ title: "权限边界会话" }, operatorContext);
    const result = await service.askInConversation(
      conversation.id,
      {
        question: "权限边界会话没有资料时怎么回答？"
      },
      operatorContext
    );

    const operatorList = await service.findConversations({}, operatorContext);
    const viewerList = await service.findConversations({}, viewerContext);
    const adminList = await service.findConversations({}, adminContext);

    expect(operatorList.items.some((item) => item.id === conversation.id)).toBe(true);
    expect(viewerList.items.some((item) => item.id === conversation.id)).toBe(false);
    expect(adminList.items.some((item) => item.id === conversation.id)).toBe(true);
    await expect(service.getConversation(conversation.id, viewerContext)).rejects.toBeInstanceOf(
      NotFoundException
    );
    await expect(
      service.getConversation(conversation.id, otherCompanyContext)
    ).rejects.toBeInstanceOf(NotFoundException);

    const operation = await prisma.operationLog.findFirstOrThrow({
      where: {
        targetId: result.recordId,
        action: "ai_question"
      }
    });
    expect(operation.metadata).toMatchObject({
      conversationId: conversation.id
    });
    expect(JSON.stringify(operation.metadata)).not.toContain("storagePath");
  });

  it("filters conversations by status, keyword, scope, and pagination metadata", async () => {
    const context = contextFor(allowedOperator, MembershipRole.operator);
    const keyword = `UX ${runId}`;
    const activeOne = await service.createConversation({ title: `${keyword} Active LD30 会话` }, context);
    const activeTwo = await service.createConversation({ title: `${keyword} Active E77 会话` }, context);
    const archived = await service.createConversation({ title: `${keyword} Archived LD30 会话` }, context);
    await prisma.aftersalesConversation.update({
      where: {
        id: archived.id
      },
      data: {
        status: "archived"
      }
    });

    const defaultList = await service.findConversations(
      {
        keyword,
        page: 1,
        pageSize: 10
      },
      context
    );
    const archivedList = await service.findConversations(
      {
        keyword,
        status: "archived",
        page: 1,
        pageSize: 10
      },
      context
    );
    const allFirstPage = await service.findConversations(
      {
        keyword,
        status: "all",
        page: 1,
        pageSize: 2
      },
      context
    );

    expect(defaultList.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([activeOne.id, activeTwo.id])
    );
    expect(defaultList.items.some((item) => item.id === archived.id)).toBe(false);
    expect(archivedList.items.map((item) => item.id)).toEqual([archived.id]);
    expect(allFirstPage.total).toBeGreaterThanOrEqual(3);
    expect(allFirstPage.items).toHaveLength(2);
    expect(allFirstPage.hasMore).toBe(true);
    expect(allFirstPage.items.every((item) => typeof item.messageCount === "number")).toBe(true);
  });

  it("lets admins switch all and mine scope while regular users remain scoped to themselves", async () => {
    const operatorContext = contextFor(allowedOperator, MembershipRole.operator);
    const viewerContext = contextFor(viewer, MembershipRole.viewer);
    const adminContext = contextFor(companyAdmin, MembershipRole.company_admin);
    const keyword = `UX Scope ${runId}`;
    const operatorConversation = await service.createConversation(
      { title: `${keyword} Operator 会话` },
      operatorContext
    );
    const viewerConversation = await service.createConversation(
      { title: `${keyword} Viewer 会话` },
      viewerContext
    );

    const adminAll = await service.findConversations(
      {
        keyword,
        scope: "all"
      },
      adminContext
    );
    const adminMine = await service.findConversations(
      {
        keyword,
        scope: "mine"
      },
      adminContext
    );
    const operatorAllAttempt = await service.findConversations(
      {
        keyword,
        scope: "all"
      },
      operatorContext
    );

    expect(adminAll.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([operatorConversation.id, viewerConversation.id])
    );
    expect(adminMine.items.some((item) => item.id === operatorConversation.id)).toBe(false);
    expect(operatorAllAttempt.items.map((item) => item.id)).toContain(operatorConversation.id);
    expect(operatorAllAttempt.items.some((item) => item.id === viewerConversation.id)).toBe(false);
  });

  it("archives and restores conversations with permission checks and operation logs", async () => {
    const operatorContext = contextFor(allowedOperator, MembershipRole.operator);
    const viewerContext = contextFor(viewer, MembershipRole.viewer);
    const adminContext = contextFor(companyAdmin, MembershipRole.company_admin);
    const otherCompanyContext = contextFor(otherCompanyAdmin, MembershipRole.company_admin, {
      company: companyB,
      department: null
    });
    const conversation = await service.createConversation(
      { title: "UX Archive 权限会话" },
      operatorContext
    );

    await expect(
      service.updateConversationStatus(conversation.id, { status: "archived" }, viewerContext)
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.updateConversationStatus(conversation.id, { status: "archived" }, otherCompanyContext)
    ).rejects.toBeInstanceOf(NotFoundException);

    const archived = await service.updateConversationStatus(
      conversation.id,
      {
        status: "archived"
      },
      adminContext
    );
    const restored = await service.updateConversationStatus(
      conversation.id,
      {
        status: "active"
      },
      operatorContext
    );

    expect(archived.status).toBe("archived");
    expect(restored.status).toBe("active");

    const logs = await prisma.operationLog.findMany({
      where: {
        targetType: "aftersales_conversation",
        targetId: conversation.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    expect(logs.map((log) => log.action)).toEqual(
      expect.arrayContaining(["archive_conversation", "restore_conversation"])
    );
    expect(JSON.stringify(logs.map((log) => log.metadata))).not.toContain("storagePath");
    expect(JSON.stringify(logs.map((log) => log.metadata))).not.toContain("DATABASE_URL");
  });

  it("keeps archived conversations readable but blocks asking until restored", async () => {
    const context = contextFor(allowedOperator, MembershipRole.operator);
    const conversation = await service.createConversation(
      { title: "UX Archived Readonly 会话" },
      context
    );
    await service.askInConversation(
      conversation.id,
      {
        question: "E77 故障安全回路断开怎么处理？"
      },
      context
    );
    await prisma.aftersalesConversation.update({
      where: {
        id: conversation.id
      },
      data: {
        status: "archived"
      }
    });

    const detail = await service.getConversation(conversation.id, context);
    expect(detail.conversation.status).toBe("archived");
    expect(detail.records.length).toBeGreaterThan(0);
    await expect(
      service.askInConversation(
        conversation.id,
        {
          question: "继续怎么办？"
        },
        context
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
