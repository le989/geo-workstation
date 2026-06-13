import { ForbiddenException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  KnowledgeMaterialType,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  MembershipRole,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ContentTasksService } from "../src/modules/geo-content/content-tasks.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ContentTasksService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ContentTasksService;
  let createdBy: string;
  let companyA: { id: string; name: string; code: string };
  let companyB: { id: string; name: string; code: string };
  let platformAdmin: { id: string };
  let companyAdminA: { id: string };
  let operatorA: { id: string };
  let operatorB: { id: string };
  let viewerA: { id: string };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new ContentTasksService(prisma as unknown as PrismaService);

    const user = await prisma.user.create({
      data: {
        email: `content-task-service-${runId}@example.com`,
        name: "Phase 2G GEO Content Operator",
        role: UserRole.content_editor,
        status: UserStatus.active
      }
    });
    createdBy = user.id;

    companyA = await prisma.company.create({
      data: {
        name: `Auth 4D Content Company A ${runId}`,
        code: `auth4d-content-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Auth 4D Content Company B ${runId}`,
        code: `auth4d-content-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    platformAdmin = await prisma.user.create({
      data: {
        email: `auth4d-content-platform-${runId}@example.com`,
        name: "Auth 4D Content Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    companyAdminA = await prisma.user.create({
      data: {
        email: `auth4d-content-company-admin-${runId}@example.com`,
        name: "Auth 4D Content Company Admin A",
        role: UserRole.company_admin,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `auth4d-content-operator-a-${runId}@example.com`,
        name: "Auth 4D Content Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `auth4d-content-operator-b-${runId}@example.com`,
        name: "Auth 4D Content Operator B",
        role: UserRole.operator,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    viewerA = await prisma.user.create({
      data: {
        email: `auth4d-content-viewer-a-${runId}@example.com`,
        name: "Auth 4D Content Viewer A",
        role: UserRole.viewer,
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

  function unique(label: string): string {
    return `Phase 2G ${label} ${runId}`;
  }

  async function createGeoPrompt(label: string) {
    return prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: "激光测距传感器",
        scenario: "行车防撞",
        userIntent: UserIntent.selection,
        priority: 3,
        targetModels: ["deepseek-chat"],
        source: "phase_2g_test",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  async function createKnowledgeBase(label: string) {
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: unique(label),
        productLine: "激光测距传感器",
        description: "GEO 内容生成可引用的事实底座",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    await prisma.knowledgeChunk.create({
      data: {
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        title: "行车防撞应用资料",
        content: "激光测距传感器可用于行车防撞，提供连续距离检测、快速响应和现场抗干扰能力。",
        sourceType: "pasted_text",
        productLine: "激光测距传感器",
        materialType: "solution",
        tags: ["GEO素材", "应用方案"]
      }
    });

    return knowledgeBase;
  }

  async function createKnowledgeBaseWithTrustedAndLowMaterials(label: string) {
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: unique(label),
        productLine: "激光测距传感器",
        description: "用于验证正式引用规则的知识库。",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    const trustedFile = await prisma.knowledgeFile.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        title: unique("高可信产品资料"),
        fileName: "trusted-product.txt",
        fileType: "txt",
        fileSize: 120,
        sourceType: "manual",
        materialType: KnowledgeMaterialType.product_material,
        trustLevel: KnowledgeTrustLevel.medium,
        reviewStatus: KnowledgeReviewStatus.approved,
        applicableModules: ["geo-content"],
        parseStatus: "succeeded",
        createdById: createdBy
      }
    });
    const lowTrustFile = await prisma.knowledgeFile.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        title: unique("低可信产品资料"),
        fileName: "low-trust-product.txt",
        fileType: "txt",
        fileSize: 120,
        sourceType: "manual",
        materialType: KnowledgeMaterialType.product_material,
        trustLevel: KnowledgeTrustLevel.low,
        reviewStatus: KnowledgeReviewStatus.approved,
        applicableModules: ["geo-content"],
        parseStatus: "succeeded",
        createdById: createdBy
      }
    });

    await prisma.knowledgeChunk.createMany({
      data: [
        {
          knowledgeBaseId: knowledgeBase.id,
          fileId: trustedFile.id,
          title: "正式可引用资料",
          content: "正式可引用资料说明：ZX900 激光测距传感器适合行车防撞场景。",
          sourceType: "manual",
          productLine: "激光测距传感器",
          materialType: KnowledgeMaterialType.product_material
        },
        {
          knowledgeBaseId: knowledgeBase.id,
          fileId: lowTrustFile.id,
          title: "低可信资料",
          content: "低可信资料声称：ZX900 可保证所有行车防撞项目零误触发。",
          sourceType: "manual",
          productLine: "激光测距传感器",
          materialType: KnowledgeMaterialType.product_material
        }
      ]
    });

    return knowledgeBase;
  }

  async function createInstructionTemplate(label: string) {
    return prisma.instructionTemplate.create({
      data: {
        name: unique(label),
        instructionType: "selection_guide",
        contentType: "selection_guide",
        targetPromptType: GeoPromptType.distilled,
        targetModel: "deepseek-chat",
        instruction:
          "请围绕 GEO 提示词生成选型指南，突出品牌实体、应用场景、结构化问答和可引用事实。",
        outputFormat: "markdown",
        qualityRules: "必须包含用户问题、选型逻辑和 FAQ 总结。",
        forbiddenRules: "不得伪造客户或认证。",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  const contextFor = (
    user: { id: string },
    company: { id: string; name: string; code: string },
    role: MembershipRole,
    isPlatformAdmin = false
  ): ResourceAccessContext => ({
    user: {
      id: user.id,
      email: `${user.id}@auth4d.local`,
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

  async function expectOperationLog(targetId: string, action: string) {
    const log = await prisma.operationLog.findFirst({
      where: {
        targetId,
        action
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    expect(log).toBeTruthy();
    return log!;
  }

  async function createScopedPrompt(
    label: string,
    company: { id: string },
    user: { id: string },
    visibility = Visibility.COMPANY
  ) {
    return prisma.geoPrompt.create({
      data: {
        companyId: company.id,
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: "激光测距传感器",
        userIntent: UserIntent.selection,
        priority: 3,
        visibility,
        createdById: user.id
      }
    });
  }

  async function createScopedContentTask(
    label: string,
    company: { id: string },
    user: { id: string },
    status = TaskStatus.succeeded
  ) {
    const prompt = await createScopedPrompt(`${label} 提示词`, company, user);
    const task = await prisma.contentTask.create({
      data: {
        companyId: company.id,
        name: unique(label),
        productLine: "激光测距传感器",
        generationType: "faq",
        status,
        provider: "mock",
        model: "mock-content-v1",
        createdById: user.id
      }
    });
    const item = await prisma.contentItem.create({
      data: {
        companyId: company.id,
        taskId: task.id,
        geoPromptId: prompt.id,
        title: unique(`${label} 内容项`),
        body: "## FAQ 总结\n这是用于 Auth-4D 内容任务隔离测试的内容项。",
        geoOptimizationPoints: ["隔离测试"],
        status: status === TaskStatus.failed ? "failed" : "draft",
        errorMessage: status === TaskStatus.failed ? "previous failure" : null
      }
    });

    return {
      task,
      item,
      prompt
    };
  }

  it("creates a content task, generates content items, and records a mock AI call log", async () => {
    const prompt = await createGeoPrompt("创建内容任务提示词");
    const knowledgeBase = await createKnowledgeBase("创建内容任务知识库");
    const instructionTemplate = await createInstructionTemplate("创建内容任务指令");

    const result = await service.create({
      name: ` ${unique("创建任务")} `,
      productLine: " 激光测距传感器 ",
      knowledgeBaseId: knowledgeBase.id,
      instructionTemplateId: instructionTemplate.id,
      generationType: "selection_guide",
      targetModel: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });

    expect(result.task).toMatchObject({
      name: unique("创建任务"),
      status: TaskStatus.succeeded,
      provider: "mock",
      model: "mock-content-v1"
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      geoPromptId: prompt.id,
      status: "draft",
      suggestedPublishChannel: "官网文章 / 公众号 / B2B 产品页"
    });
    expect(result.items[0]?.body).toContain("Mock 生成结果");

    const aiCallLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "content_task",
        relatedId: result.task.id,
        provider: "mock",
        purpose: "content_generation"
      }
    });
    expect(aiCallLog?.status).toBe("succeeded");
  });

  it("creates an assistant article task from topic and selected citable files without exposed GEO prompts", async () => {
    const knowledgeBase = await createKnowledgeBaseWithTrustedAndLowMaterials("助理文章工作台知识库");

    const result = await service.create({
      name: unique("助理发布文章主题"),
      productLine: "激光测距传感器",
      knowledgeBaseId: knowledgeBase.id,
      generationType: "article",
      scopeType: "all",
      createdBy
    });

    expect(result.task).toMatchObject({
      name: unique("助理发布文章主题"),
      status: TaskStatus.succeeded,
      provider: "mock",
      model: "mock-content-v1"
    });
    expect(result.prompts).toHaveLength(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      geoPromptId: null,
      status: "draft"
    });
    expect(result.items[0]?.title).toContain(unique("助理发布文章主题"));
    expect(result.items[0]?.body).toContain(unique("助理发布文章主题"));
    expect(result.items[0]?.body).toContain("正式可引用资料说明");
    expect(result.items[0]?.body).not.toContain("低可信资料声称");
  });

  it("excludes low-trust materials from GEO content generation references", async () => {
    const prompt = await createGeoPrompt("低可信过滤内容提示词");
    const knowledgeBase = await createKnowledgeBaseWithTrustedAndLowMaterials("低可信过滤知识库");

    const result = await service.create({
      name: unique("低可信过滤任务"),
      productLine: "激光测距传感器",
      knowledgeBaseId: knowledgeBase.id,
      generationType: "selection_guide",
      targetModel: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.body).toContain("正式可引用资料说明");
    expect(result.items[0]?.body).not.toContain("低可信资料声称");
    expect(result.items[0]?.body).not.toContain("零误触发");
  });

  it("isolates content task lists, details, and retry by company and owner", async () => {
    const own = await createScopedContentTask("operator-a-visible-task", companyA, operatorA);
    const sameCompanyOtherUser = await createScopedContentTask(
      "operator-b-hidden-task",
      companyA,
      operatorB,
      TaskStatus.failed
    );
    const otherCompany = await createScopedContentTask("company-b-hidden-task", companyB, operatorB);

    const operatorList = await service.findMany(
      {
        page: 1,
        pageSize: 50
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(operatorList.items.map((item) => item.id)).toContain(own.task.id);
    expect(operatorList.items.map((item) => item.id)).not.toContain(sameCompanyOtherUser.task.id);
    expect(operatorList.items.map((item) => item.id)).not.toContain(otherCompany.task.id);

    const adminList = await service.findMany(
      {
        page: 1,
        pageSize: 50
      },
      contextFor(companyAdminA, companyA, MembershipRole.company_admin)
    );
    expect(adminList.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([own.task.id, sameCompanyOtherUser.task.id])
    );
    expect(adminList.items.map((item) => item.id)).not.toContain(otherCompany.task.id);

    const platformCompanyBList = await service.findMany(
      {
        page: 1,
        pageSize: 50
      },
      contextFor(platformAdmin, companyB, MembershipRole.platform_admin, true)
    );
    expect(platformCompanyBList.items.map((item) => item.id)).toContain(otherCompany.task.id);
    expect(platformCompanyBList.items.map((item) => item.id)).not.toContain(own.task.id);

    await expect(
      service.getDetail(
        sameCompanyOtherUser.task.id,
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO content task not found");
    await expect(
      service.getDetail(
        otherCompany.task.id,
        contextFor(companyAdminA, companyA, MembershipRole.company_admin)
      )
    ).rejects.toThrow("GEO content task not found");
    await expect(
      service.retry(
        sameCompanyOtherUser.task.id,
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO content task not found");
  });

  it("writes current company and user on direct content task creation", async () => {
    const prompt = await createScopedPrompt("current-company-create-prompt", companyA, operatorA);
    const result = await service.create(
      {
        name: unique("current company create"),
        productLine: "激光测距传感器",
        generationType: "faq",
        geoPromptIds: [prompt.id],
        createdBy: operatorB.id
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );

    const stored = await prisma.contentTask.findUniqueOrThrow({
      where: {
        id: result.task.id
      },
      include: {
        contentItems: true
      }
    });
    expect(stored.companyId).toBe(companyA.id);
    expect(stored.createdById).toBe(operatorA.id);
    expect(stored.updatedById).toBe(operatorA.id);
    expect(stored.contentItems.every((item) => item.companyId === companyA.id)).toBe(true);

    const aiCallLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "content_task",
        relatedId: stored.id
      }
    });
    expect(aiCallLog?.companyId).toBe(companyA.id);
    expect(aiCallLog?.createdById).toBe(operatorA.id);
  });

  it("rejects viewer creation of content tasks while allowing operators", async () => {
    const prompt = await createScopedPrompt(
      "viewer-create-denied-prompt",
      companyA,
      operatorA,
      Visibility.PLATFORM
    );

    await expect(
      service.create(
        {
          name: unique("viewer create denied"),
          generationType: "faq",
          geoPromptIds: [prompt.id],
          createdBy: viewerA.id
        },
        contextFor(viewerA, companyA, MembershipRole.viewer)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    const created = await service.create(
      {
        name: unique("operator create allowed"),
        generationType: "faq",
        geoPromptIds: [prompt.id],
        createdBy: viewerA.id
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );

    expect(created.task.companyId).toBe(companyA.id);
    expect(created.task.createdBy).toBe(operatorA.id);
  });

  it("archives content tasks as cancelled, hides them by default, and keeps content items", async () => {
    const archived = await createScopedContentTask("archive-hidden-task", companyA, operatorA);

    const result = await service.archive(
      archived.task.id,
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(result.status).toBe(TaskStatus.cancelled);
    await expectOperationLog(archived.task.id, "geo_content.task.archived");

    const defaultList = await service.findMany(
      {
        page: 1,
        pageSize: 50,
        productLine: archived.task.productLine ?? undefined
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(defaultList.items.map((item) => item.id)).not.toContain(archived.task.id);

    const archivedList = await service.findMany(
      {
        page: 1,
        pageSize: 50,
        productLine: archived.task.productLine ?? undefined,
        status: TaskStatus.cancelled
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(archivedList.items.map((item) => item.id)).toContain(archived.task.id);

    const detail = await service.getDetail(
      archived.task.id,
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(detail.task.status).toBe(TaskStatus.cancelled);
    expect(detail.items.map((item) => item.id)).toContain(archived.item.id);

    const storedItem = await prisma.contentItem.findUniqueOrThrow({
      where: {
        id: archived.item.id
      }
    });
    expect(storedItem.deletedAt).toBeNull();
  });

  it("enforces content task archive permissions by role and owner", async () => {
    const ownTask = await createScopedContentTask("archive-own-task", companyA, operatorA);
    const otherUserTask = await createScopedContentTask(
      "archive-other-user-task",
      companyA,
      operatorB
    );

    await expect(
      service.archive(ownTask.task.id, contextFor(viewerA, companyA, MembershipRole.viewer))
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.archive(otherUserTask.task.id, contextFor(operatorA, companyA, MembershipRole.operator))
    ).rejects.toThrow("GEO content task not found");

    const adminArchived = await service.archive(
      otherUserTask.task.id,
      contextFor(companyAdminA, companyA, MembershipRole.company_admin)
    );
    expect(adminArchived.status).toBe(TaskStatus.cancelled);
  });

  it("rejects unreadable associated resources when creating content tasks", async () => {
    const otherCompanyPrompt = await createScopedPrompt(
      "other-company-create-prompt",
      companyB,
      operatorB
    );
    const privatePromptByOtherUser = await createScopedPrompt(
      "same-company-private-other-user-prompt",
      companyA,
      operatorB,
      Visibility.PRIVATE
    );
    const otherCompanyKnowledgeBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyB.id,
        name: unique("other-company-knowledge"),
        status: "active",
        visibility: Visibility.COMPANY,
        createdById: operatorB.id
      }
    });
    const otherCompanyInstruction = await prisma.instructionTemplate.create({
      data: {
        companyId: companyB.id,
        name: unique("other-company-instruction"),
        instructionType: "faq",
        contentType: "faq",
        instruction: "只用于验证跨公司不可引用。",
        visibility: Visibility.COMPANY,
        createdById: operatorB.id
      }
    });

    await expect(
      service.create(
        {
          name: unique("reject other company prompt"),
          generationType: "faq",
          geoPromptIds: [otherCompanyPrompt.id],
          createdBy: operatorA.id
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO prompts not found or deleted");

    await expect(
      service.create(
        {
          name: unique("reject private prompt"),
          generationType: "faq",
          geoPromptIds: [privatePromptByOtherUser.id],
          createdBy: operatorA.id
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO prompts not found or deleted");

    const readablePrompt = await createScopedPrompt("readable-prompt", companyA, operatorA);
    await expect(
      service.create(
        {
          name: unique("reject other company knowledge"),
          generationType: "faq",
          geoPromptIds: [readablePrompt.id],
          knowledgeBaseId: otherCompanyKnowledgeBase.id,
          createdBy: operatorA.id
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO knowledge base not found or deleted");

    await expect(
      service.create(
        {
          name: unique("reject other company instruction"),
          generationType: "faq",
          geoPromptIds: [readablePrompt.id],
          instructionTemplateId: otherCompanyInstruction.id,
          createdBy: operatorA.id
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO instruction template not found or deleted");
  });

  it("creates content with an openai_compatible provider when selected", async () => {
    const prompt = await createGeoPrompt("真实Provider内容提示词");
    const generateText = vi.fn(async () => ({
      text: JSON.stringify({
        title: "真实 AI GEO 内容标题",
        body: "真实 AI 生成正文，用于验证 OpenAI-compatible Provider 可以参与 GEO 内容生成流程，并保持内容项真实入库。",
        geoOptimizationPoints: ["围绕提示词回答", "补充品牌可引用事实"],
        suggestedPublishChannel: "官网 GEO 内容专区"
      }),
      provider: "openai_compatible",
      model: "deepseek-chat",
      tokenInput: 21,
      tokenOutput: 34,
      raw: { id: "chatcmpl-content-test" }
    }));
    const providerAwareService = new (ContentTasksService as unknown as new (
      prisma: PrismaService,
      aiProviderService: { generateText: typeof generateText },
      projectProfileService: {
        getPromptContext: () => Promise<{
          projectName: string;
          brandName: string;
          industry: string;
          mainProducts: string[];
          targetCustomers: string;
          positioning: string;
          tone: string;
          forbiddenClaims: string[];
          targetModels: string[];
          createdAt: Date;
          updatedAt: Date;
          id: string;
        }>;
      }
    ) => ContentTasksService)(
      prisma as unknown as PrismaService,
      { generateText },
      {
        getPromptContext: async () => ({
          id: "project-profile-test",
          projectName: "跨行业 GEO 项目",
          brandName: "通用品牌",
          industry: "用户自由填写行业",
          mainProducts: ["产品", "服务", "课程", "门店"],
          targetCustomers: "正在向 AI 咨询方案的人群",
          positioning: "可信赖的项目上下文",
          tone: "专业、克制、可信",
          forbiddenClaims: ["不要承诺效果", "不要编造价格"],
          targetModels: ["deepseek", "kimi"],
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    );

    const result = await providerAwareService.create({
      name: unique("真实Provider内容任务"),
      productLine: "激光测距传感器",
      generationType: "article",
      provider: "openai_compatible",
      model: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });

    expect(generateText).toHaveBeenCalledOnce();
    const generateInput = generateText.mock.calls[0]?.[0];
    expect(generateInput?.systemPrompt).toContain("全局通用质量规则");
    expect(generateInput?.userPrompt).toContain("项目档案 / 品牌上下文");
    expect(generateInput?.userPrompt).toContain("跨行业 GEO 项目");
    expect(generateInput?.userPrompt).toContain("主营产品 / 服务 / 课程 / 门店 / 个人品牌方向");
    expect(generateInput?.userPrompt).toContain("项目档案只用于品牌语气、受众和基础上下文");
    expect(generateInput?.userPrompt).toContain("不得编造具体型号、参数、精度、量程");
    expect(generateInput?.userPrompt).toContain("需结合具体资料确认");
    expect(generateInput?.userPrompt).toContain("不要建议用户自行修改功率");
    expect(generateInput?.userPrompt).toContain(
      "输出内容要优先写需求决策逻辑、场景确认项、适用边界"
    );
    expect(result.task).toMatchObject({
      provider: "openai_compatible",
      model: "deepseek-chat",
      status: TaskStatus.succeeded
    });
    expect(result.items[0]).toMatchObject({
      title: "真实 AI GEO 内容标题",
      body: expect.stringContaining("真实 AI 生成正文"),
      suggestedPublishChannel: "官网 GEO 内容专区",
      status: "draft"
    });

    const aiCallLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "content_task",
        relatedId: result.task.id,
        provider: "openai_compatible",
        model: "deepseek-chat",
        purpose: "content_generation"
      }
    });
    expect(aiCallLog).toMatchObject({
      status: "succeeded",
      tokenInput: 21,
      tokenOutput: 34
    });
  });

  it("keeps content tasks viewable and records failed logs when openai_compatible generation fails", async () => {
    const prompt = await createGeoPrompt("真实Provider失败提示词");
    const generateText = vi.fn(async () => {
      throw new Error("模型不可用或名称错误，请检查后端 AI Provider 配置。");
    });
    const providerAwareService = new (ContentTasksService as unknown as new (
      prisma: PrismaService,
      aiProviderService: { generateText: typeof generateText }
    ) => ContentTasksService)(prisma as unknown as PrismaService, { generateText });

    const result = await providerAwareService.create({
      name: unique("真实Provider失败任务"),
      productLine: "激光测距传感器",
      generationType: "article",
      provider: "openai_compatible",
      model: "missing-model",
      geoPromptIds: [prompt.id],
      createdBy
    });

    expect(generateText).toHaveBeenCalledOnce();
    expect(result.task.status).toBe(TaskStatus.failed);
    expect(result.items[0]).toMatchObject({
      status: "failed",
      errorMessage: expect.stringContaining("模型不可用")
    });

    const detail = await providerAwareService.getDetail(result.task.id);
    expect(detail.items).toHaveLength(1);

    const aiCallLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "content_task",
        relatedId: result.task.id,
        provider: "openai_compatible",
        model: "missing-model",
        purpose: "content_generation"
      }
    });
    expect(aiCallLog?.status).toBe("failed");
  });

  it("rejects missing prompts and deleted knowledge bases", async () => {
    await expect(
      service.create({
        name: unique("不存在提示词失败"),
        generationType: "faq",
        geoPromptIds: ["missing-geo-prompt"],
        createdBy
      })
    ).rejects.toThrow("GEO prompts not found or deleted");

    const prompt = await createGeoPrompt("已删除知识库提示词");
    const knowledgeBase = await createKnowledgeBase("已删除知识库");
    await prisma.knowledgeBase.update({
      where: {
        id: knowledgeBase.id
      },
      data: {
        deletedAt: new Date()
      }
    });

    await expect(
      service.create({
        name: unique("已删除知识库失败"),
        knowledgeBaseId: knowledgeBase.id,
        generationType: "article",
        geoPromptIds: [prompt.id],
        createdBy
      })
    ).rejects.toThrow(`GEO knowledge base not found or deleted: ${knowledgeBase.id}`);
  });

  it("lists content tasks and returns task detail with items, prompts, and related assets", async () => {
    const prompt = await createGeoPrompt("任务列表提示词");
    const knowledgeBase = await createKnowledgeBase("任务列表知识库");
    const instructionTemplate = await createInstructionTemplate("任务列表指令");
    const created = await service.create({
      name: unique("任务列表"),
      productLine: "任务列表产品线",
      knowledgeBaseId: knowledgeBase.id,
      instructionTemplateId: instructionTemplate.id,
      generationType: "application_solution",
      targetModel: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });

    const list = await service.findMany({
      page: 1,
      pageSize: 10,
      status: TaskStatus.succeeded,
      productLine: "任务列表产品线",
      generationType: "application_solution",
      targetModel: "deepseek-chat",
      createdBy
    });
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(created.task.id);

    const detail = await service.getDetail(created.task.id);
    expect(detail.task.id).toBe(created.task.id);
    expect(detail.items).toHaveLength(1);
    expect(detail.prompts[0]?.id).toBe(prompt.id);
    expect(detail.knowledgeBase?.id).toBe(knowledgeBase.id);
    expect(detail.instructionTemplate?.id).toBe(instructionTemplate.id);
    expect(detail.aiCallLogs.length).toBeGreaterThan(0);
  });

  it("retries failed content items without duplicating succeeded items", async () => {
    const firstPrompt = await createGeoPrompt("重试成功提示词");
    const secondPrompt = await createGeoPrompt("重试失败提示词");
    const created = await service.create({
      name: unique("重试任务"),
      productLine: "重试产品线",
      generationType: "qa_material",
      geoPromptIds: [firstPrompt.id, secondPrompt.id],
      createdBy
    });
    const failedItem = created.items[1];
    expect(failedItem).toBeDefined();

    await prisma.contentItem.update({
      where: {
        id: failedItem!.id
      },
      data: {
        title: "生成失败占位",
        body: "Mock 生成失败占位内容，等待重试恢复。",
        status: "failed",
        errorMessage: "phase 2g retry test"
      }
    });
    await prisma.contentTask.update({
      where: {
        id: created.task.id
      },
      data: {
        status: TaskStatus.failed
      }
    });

    const retried = await service.retry(created.task.id);
    expect(retried.task.status).toBe(TaskStatus.succeeded);
    expect(retried.items).toHaveLength(2);
    expect(retried.items.filter((item) => item.status === "draft")).toHaveLength(2);

    const itemCount = await prisma.contentItem.count({
      where: {
        taskId: created.task.id,
        deletedAt: null
      }
    });
    expect(itemCount).toBe(2);

    const logs = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_task",
        relatedId: created.task.id,
        purpose: "content_generation"
      }
    });
    expect(logs).toBe(2);
  });
});
