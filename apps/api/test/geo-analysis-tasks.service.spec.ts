import { ForbiddenException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ContentTasksService } from "../src/modules/geo-content/content-tasks.service";
import { GeoAnalysisTasksService } from "../src/modules/geo-analysis/geo-analysis-tasks.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoAnalysisTasksService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: GeoAnalysisTasksService;
  let createdBy: string;
  let productLine: string;
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
    const prismaService = prisma as unknown as PrismaService;
    service = new GeoAnalysisTasksService(prismaService, new ContentTasksService(prismaService));

    const user = await prisma.user.create({
      data: {
        email: `geo-analysis-service-${runId}@example.com`,
        name: "Phase 2J GEO Analysis Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
    productLine = `Phase 2J 激光测距传感器 ${runId}`;

    companyA = await prisma.company.create({
      data: {
        name: `Auth 4C GEO Analysis Company A ${runId}`,
        code: `auth4c-analysis-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Auth 4C GEO Analysis Company B ${runId}`,
        code: `auth4c-analysis-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    platformAdmin = await prisma.user.create({
      data: {
        email: `auth4c-platform-${runId}@example.com`,
        name: "Auth 4C Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    companyAdminA = await prisma.user.create({
      data: {
        email: `auth4c-company-admin-${runId}@example.com`,
        name: "Auth 4C Company Admin A",
        role: UserRole.company_admin,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `auth4c-operator-a-${runId}@example.com`,
        name: "Auth 4C Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `auth4c-operator-b-${runId}@example.com`,
        name: "Auth 4C Operator B",
        role: UserRole.operator,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    viewerA = await prisma.user.create({
      data: {
        email: `auth4c-viewer-a-${runId}@example.com`,
        name: "Auth 4C Viewer A",
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

  async function createTask(label: string, overrides: Record<string, unknown> = {}) {
    return service.create({
      name: `Phase 2J ${label} ${runId}`,
      brandName: "凯基特",
      websiteUrl: "https://example.com",
      productLine,
      baseWords: ["激光测距传感器"],
      targetModels: ["deepseek-chat", "kimi-k2"],
      createdBy,
      ...overrides
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
      email: `${user.id}@auth4c.local`,
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

  async function createScopedTask(
    label: string,
    company: { id: string },
    user: { id: string },
    overrides: Record<string, unknown> = {}
  ) {
    return prisma.geoAnalysisTask.create({
      data: {
        company: {
          connect: {
            id: company.id
          }
        },
        name: `Auth 4C ${label} ${runId}`,
        brandName: "凯基特",
        websiteUrl: "https://example.com",
        productLine: `Auth 4C 产品线 ${runId}`,
        targetModels: ["deepseek-chat"],
        status: TaskStatus.pending,
        summary: {
          inputBaseWords: [`Auth 4C ${label}`]
        },
        promptSuggestions: [
          {
            promptText: `Auth 4C ${label} 怎么选 ${runId}`,
            userIntent: UserIntent.selection
          }
        ],
        createdBy: {
          connect: {
            id: user.id
          }
        },
        ...overrides
      }
    });
  }

  it("creates a pending GEO analysis task and rejects empty target models", async () => {
    const task = await createTask("创建");

    expect(task.status).toBe(TaskStatus.pending);
    expect(task.brandName).toBe("凯基特");
    expect(task.targetModels).toEqual(["deepseek-chat", "kimi-k2"]);

    await expect(
      service.create({
        name: `Phase 2J 空模型 ${runId}`,
        brandName: "凯基特",
        targetModels: [],
        createdBy
      })
    ).rejects.toThrow("targetModels must contain at least one target model");
  });

  it("queries tasks with pagination and status/productLine filters", async () => {
    await createTask("列表筛选 A");
    await createTask("列表筛选 B", {
      productLine: `${productLine} 其他`
    });

    const result = await service.findMany({
      page: 1,
      pageSize: 10,
      status: TaskStatus.pending,
      productLine
    });

    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items.every((item) => item.status === TaskStatus.pending)).toBe(true);
    expect(result.items.every((item) => item.productLine === productLine)).toBe(true);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("returns task detail with modelResults and edits pending tasks", async () => {
    const task = await createTask("详情与编辑");
    const detail = await service.getDetail(task.id);

    expect(detail.task.id).toBe(task.id);
    expect(detail.modelResults).toEqual([]);

    const updated = await service.update(task.id, {
      name: `Phase 2J 已编辑 ${runId}`,
      brandName: "凯基特传感器",
      targetModels: ["deepseek-chat"]
    });

    expect(updated.name).toContain("已编辑");
    expect(updated.brandName).toBe("凯基特传感器");
    expect(updated.targetModels).toEqual(["deepseek-chat"]);
  });

  it("rejects editing a running task", async () => {
    const running = await prisma.geoAnalysisTask.create({
      data: {
        name: `Phase 2J running ${runId}`,
        brandName: "凯基特",
        productLine,
        targetModels: ["deepseek-chat"],
        status: TaskStatus.running,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    await expect(
      service.update(running.id, {
        name: "不应允许编辑"
      })
    ).rejects.toThrow("running GEO analysis task cannot be edited");
  });

  it("runs mock GEO analysis and stores model results, gaps and suggestions", async () => {
    const task = await createTask("执行分析");
    const result = await service.run(task.id);

    expect(result.task.status).toBe(TaskStatus.succeeded);
    expect(result.modelResults).toHaveLength(2);
    expect(result.modelResults.every((item) => item.rawAnswer?.includes("Mock GEO 分析"))).toBe(
      true
    );
    expect(result.task.summary).toMatchObject({
      isMock: true
    });
    expect(result.task.contentGaps.length).toBeGreaterThanOrEqual(3);
    expect(result.task.knowledgeGaps.length).toBeGreaterThanOrEqual(3);
    expect(result.task.promptSuggestions.length).toBeGreaterThanOrEqual(5);
  });

  it("converts prompt suggestions into geo_prompts and skips duplicates", async () => {
    const task = await createTask("转提示词");
    await service.run(task.id);

    const converted = await service.convertPrompts(task.id, {
      promptType: GeoPromptType.distilled,
      userIntent: UserIntent.selection,
      priority: 4,
      trackEnabled: true,
      createdBy
    });

    expect(converted.createdCount).toBeGreaterThanOrEqual(5);
    expect(converted.skippedCount).toBe(0);
    expect(converted.createdItems.every((item) => item.source === `geo_analysis:${task.id}`)).toBe(
      true
    );

    const convertedAgain = await service.convertPrompts(task.id, {
      createdBy
    });

    expect(convertedAgain.createdCount).toBe(0);
    expect(convertedAgain.skippedCount).toBeGreaterThanOrEqual(5);
  });

  it("creates a GEO content task by reusing content generation logic", async () => {
    const task = await createTask("创建内容任务");
    await service.run(task.id);
    await service.convertPrompts(task.id, {
      createdBy
    });

    const created = await service.createContentTask(task.id, {
      generationType: "article",
      targetModel: "deepseek-chat",
      createdBy
    });

    expect(created.task.status).toBe(TaskStatus.succeeded);
    expect(created.items.length).toBeGreaterThan(0);
    expect(created.items.every((item) => item.title.includes("Mock GEO内容"))).toBe(true);
  });

  it("isolates task lists and details by company and owner", async () => {
    const taskAByOperatorA = await createScopedTask("operator-a-visible", companyA, operatorA);
    const taskAByOperatorB = await createScopedTask("operator-b-hidden", companyA, operatorB);
    const taskBByOperatorB = await createScopedTask("company-b-hidden", companyB, operatorB);

    const operatorList = await service.findMany(
      {
        page: 1,
        pageSize: 20
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(operatorList.items.map((item) => item.id)).toContain(taskAByOperatorA.id);
    expect(operatorList.items.map((item) => item.id)).not.toContain(taskAByOperatorB.id);
    expect(operatorList.items.map((item) => item.id)).not.toContain(taskBByOperatorB.id);

    const adminList = await service.findMany(
      {
        page: 1,
        pageSize: 20
      },
      contextFor(companyAdminA, companyA, MembershipRole.company_admin)
    );
    expect(adminList.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([taskAByOperatorA.id, taskAByOperatorB.id])
    );
    expect(adminList.items.map((item) => item.id)).not.toContain(taskBByOperatorB.id);

    const platformCompanyBList = await service.findMany(
      {
        page: 1,
        pageSize: 20
      },
      contextFor(platformAdmin, companyB, MembershipRole.platform_admin, true)
    );
    expect(platformCompanyBList.items.map((item) => item.id)).toContain(taskBByOperatorB.id);
    expect(platformCompanyBList.items.map((item) => item.id)).not.toContain(taskAByOperatorA.id);

    await expect(
      service.getDetail(taskAByOperatorB.id, contextFor(operatorA, companyA, MembershipRole.operator))
    ).rejects.toThrow("GEO analysis task not found");
    await expect(
      service.getDetail(taskBByOperatorB.id, contextFor(companyAdminA, companyA, MembershipRole.company_admin))
    ).rejects.toThrow("GEO analysis task not found");
  });

  it("writes current company and user on create/update/run boundaries", async () => {
    const created = await service.create(
      {
        name: `Auth 4C create context ${runId}`,
        brandName: "凯基特",
        createdBy: operatorB.id,
        productLine: `Auth 4C 产品线 ${runId}`,
        targetModels: ["deepseek-chat"]
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    const stored = await prisma.geoAnalysisTask.findUniqueOrThrow({
      where: {
        id: created.id
      }
    });
    expect(stored.companyId).toBe(companyA.id);
    expect(stored.createdById).toBe(operatorA.id);
    expect(stored.updatedById).toBe(operatorA.id);

    const taskAByOperatorB = await createScopedTask("operator-b-manage-denied", companyA, operatorB);
    await expect(
      service.update(
        taskAByOperatorB.id,
        {
          name: "operator A cannot edit this"
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO analysis task not found");
    await expect(
      service.run(taskAByOperatorB.id, contextFor(operatorA, companyA, MembershipRole.operator))
    ).rejects.toThrow("GEO analysis task not found");

    const updated = await service.update(
      taskAByOperatorB.id,
      {
        name: `Auth 4C company admin edited ${runId}`
      },
      contextFor(companyAdminA, companyA, MembershipRole.company_admin)
    );
    expect(updated.name).toContain("company admin edited");

    const runnable = await createScopedTask("operator-a-runnable", companyA, operatorA);
    const run = await service.run(runnable.id, contextFor(operatorA, companyA, MembershipRole.operator));
    expect(run.task.status).toBe(TaskStatus.succeeded);
    expect(run.modelResults).toHaveLength(1);
  });

  it("rejects viewer creation of GEO analysis tasks while allowing operators", async () => {
    await expect(
      service.create(
        {
          name: `Auth 4C viewer create denied ${runId}`,
          brandName: "凯基特",
          productLine: `Auth 4C 产品线 ${runId}`,
          targetModels: ["deepseek-chat"]
        },
        contextFor(viewerA, companyA, MembershipRole.viewer)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    const created = await service.create(
      {
        name: `Auth 4C operator create allowed ${runId}`,
        brandName: "凯基特",
        productLine: `Auth 4C 产品线 ${runId}`,
        targetModels: ["deepseek-chat"]
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );

    expect(created.companyId).toBe(companyA.id);
    expect(created.createdBy).toBe(operatorA.id);
  });

  it("converts prompts inside current company with current user and role visibility", async () => {
    const operatorTask = await createScopedTask("operator-private-prompt", companyA, operatorA);
    const converted = await service.convertPrompts(
      operatorTask.id,
      {
        promptType: GeoPromptType.distilled,
        priority: 3,
        trackEnabled: true,
        createdBy: operatorB.id
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );

    expect(converted.createdCount).toBe(1);
    const prompt = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: converted.createdItems[0].id
      }
    });
    expect(prompt.companyId).toBe(companyA.id);
    expect(prompt.createdById).toBe(operatorA.id);
    expect(prompt.updatedById).toBe(operatorA.id);
    expect(prompt.visibility).toBe(Visibility.PRIVATE);

    const adminTask = await createScopedTask("admin-company-prompt", companyA, operatorB);
    const adminConverted = await service.convertPrompts(
      adminTask.id,
      {
        promptType: GeoPromptType.distilled
      },
      contextFor(companyAdminA, companyA, MembershipRole.company_admin)
    );
    const adminPrompt = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: adminConverted.createdItems[0].id
      }
    });
    expect(adminPrompt.visibility).toBe(Visibility.COMPANY);
    expect(adminPrompt.companyId).toBe(companyA.id);

    await createScopedTask("other-company-convert-denied", companyB, operatorB, {
      promptSuggestions: [
        {
          promptText: `Auth 4C duplicate allowed across company ${runId}`,
          userIntent: UserIntent.selection
        }
      ]
    });
    await prisma.geoPrompt.create({
      data: {
        companyId: companyB.id,
        type: GeoPromptType.distilled,
        promptText: `Auth 4C duplicate allowed across company ${runId}`,
        userIntent: UserIntent.selection,
        visibility: Visibility.COMPANY,
        createdById: operatorB.id
      }
    });
    const sameTextTask = await createScopedTask("same-text-current-company", companyA, operatorA, {
      promptSuggestions: [
        {
          promptText: `Auth 4C duplicate allowed across company ${runId}`,
          userIntent: UserIntent.selection
        }
      ]
    });
    const sameTextConverted = await service.convertPrompts(
      sameTextTask.id,
      {},
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(sameTextConverted.createdCount).toBe(1);

    await expect(
      service.convertPrompts(
        operatorTask.id,
        {},
        contextFor(operatorB, companyB, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO analysis task not found");
  });

  it("creates content tasks from authorized analysis with current company and user only", async () => {
    const task = await createScopedTask("content-task-context", companyA, operatorA);
    await service.convertPrompts(task.id, {}, contextFor(operatorA, companyA, MembershipRole.operator));

    const created = await service.createContentTask(
      task.id,
      {
        generationType: "article",
        targetModel: "deepseek-chat",
        createdBy: operatorB.id
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    const storedTask = await prisma.contentTask.findUniqueOrThrow({
      where: {
        id: created.task.id
      },
      include: {
        contentItems: true
      }
    });

    expect(storedTask.companyId).toBe(companyA.id);
    expect(storedTask.createdById).toBe(operatorA.id);
    expect(storedTask.updatedById).toBe(operatorA.id);
    expect(storedTask.contentItems.every((item) => item.companyId === companyA.id)).toBe(true);

    const otherCompanyPrompt = await prisma.geoPrompt.create({
      data: {
        companyId: companyB.id,
        type: GeoPromptType.distilled,
        promptText: `Auth 4C other company prompt ${runId}`,
        userIntent: UserIntent.selection,
        visibility: Visibility.COMPANY,
        createdById: operatorB.id
      }
    });
    const otherCompanyKnowledgeBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyB.id,
        name: `Auth 4C other company knowledge ${runId}`,
        status: "active",
        visibility: Visibility.COMPANY,
        createdById: operatorB.id
      }
    });
    const otherCompanyInstruction = await prisma.instructionTemplate.create({
      data: {
        companyId: companyB.id,
        name: `Auth 4C other company instruction ${runId}`,
        instructionType: "article",
        contentType: "guide",
        instruction: "只用于验证跨公司不可引用。",
        visibility: Visibility.COMPANY,
        createdById: operatorB.id
      }
    });

    await expect(
      service.createContentTask(
        task.id,
        {
          generationType: "article",
          geoPromptIds: [otherCompanyPrompt.id]
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO prompts not found or inaccessible");
    await expect(
      service.createContentTask(
        task.id,
        {
          generationType: "article",
          knowledgeBaseId: otherCompanyKnowledgeBase.id
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO knowledge base not found or deleted");
    await expect(
      service.createContentTask(
        task.id,
        {
          generationType: "article",
          instructionTemplateId: otherCompanyInstruction.id
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO instruction template not found or deleted");

    const otherCompanyTask = await createScopedTask("other-company-content-denied", companyB, operatorB);
    await expect(
      service.createContentTask(
        otherCompanyTask.id,
        {
          generationType: "article"
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO analysis task not found");
  });
});
