import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  MembershipRole,
  UserRole,
  UserStatus,
  type Company,
  type User
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { KnowledgeBasesService } from "../src/modules/geo-knowledge/knowledge-bases.service";
import { KnowledgeDirectoriesService } from "../src/modules/geo-knowledge/knowledge-directories.service";
import type { OperationLogsService } from "../src/modules/usage/operation-logs.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("KnowledgeDirectoriesService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let knowledgeBasesService: KnowledgeBasesService;
  let knowledgeDirectoriesService: KnowledgeDirectoriesService;
  let operationLogsService: { recordOperation: ReturnType<typeof vi.fn> };
  let companyA: Company;
  let companyB: Company;
  let companyAdmin: User;
  let operatorA: User;
  let operatorB: User;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    knowledgeBasesService = new KnowledgeBasesService(prisma as unknown as PrismaService);
    knowledgeDirectoriesService = new KnowledgeDirectoriesService(
      prisma as unknown as PrismaService
    );
    operationLogsService = {
      recordOperation: vi.fn().mockResolvedValue(undefined)
    };
    (knowledgeDirectoriesService as unknown as { operationLogsService?: OperationLogsService })
      .operationLogsService = operationLogsService as unknown as OperationLogsService;

    companyA = await prisma.company.create({
      data: {
        name: `KB Directory Company A ${runId}`,
        code: `kb-dir-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `KB Directory Company B ${runId}`,
        code: `kb-dir-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyAdmin = await prisma.user.create({
      data: {
        email: `kb-dir-company-admin-${runId}@example.com`,
        name: "KB-DIR-1 Company Admin",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `kb-dir-operator-a-${runId}@example.com`,
        name: "KB-DIR-1 Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `kb-dir-operator-b-${runId}@example.com`,
        name: "KB-DIR-1 Operator B",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function contextFor(
    user: User,
    company: Company,
    role: MembershipRole,
    isPlatformAdmin = false
  ): ResourceAccessContext {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isPlatformAdmin
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
        isPlatformAdmin
      }
    };
  }

  async function createCompanyKnowledgeBase(label: string, context: ResourceAccessContext) {
    return knowledgeBasesService.create(
      {
        name: `KB-DIR-1 ${label} ${runId}`,
        productLine: `目录增强 ${label}`
      },
      context
    );
  }

  it("records safe operation logs for custom directory mutations", async () => {
    const context = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const knowledgeBase = await createCompanyKnowledgeBase("审计目录", context);

    // 默认根目录由系统维护，不作为用户目录操作写入审计日志。
    await knowledgeDirectoriesService.findMany(knowledgeBase.id, context);
    expect(operationLogsService.recordOperation).not.toHaveBeenCalled();

    const created = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      {
        name: "客户 FAQ 目录"
      },
      context
    );
    const updated = await knowledgeDirectoriesService.update(
      created.id,
      {
        name: "售后 FAQ 目录"
      },
      context
    );
    await knowledgeDirectoriesService.disable(updated.id, context);
    await knowledgeDirectoriesService.disable(updated.id, context);

    const actions = operationLogsService.recordOperation.mock.calls.map(
      ([input]) => input.action
    );
    expect(actions).toEqual([
      "knowledge_base.directory.created",
      "knowledge_base.directory.updated",
      "knowledge_base.directory.disabled"
    ]);

    const createdLog = operationLogsService.recordOperation.mock.calls.find(
      ([input]) => input.action === "knowledge_base.directory.created"
    )?.[0];
    const updatedLog = operationLogsService.recordOperation.mock.calls.find(
      ([input]) => input.action === "knowledge_base.directory.updated"
    )?.[0];
    const disabledLog = operationLogsService.recordOperation.mock.calls.find(
      ([input]) => input.action === "knowledge_base.directory.disabled"
    )?.[0];

    expect(createdLog).toMatchObject({
      moduleKey: "knowledge-bases",
      targetType: "knowledge_directory",
      targetId: created.id,
      success: true,
      metadata: {
        knowledgeBaseId: knowledgeBase.id,
        directoryId: created.id,
        statusAfter: "active",
        changedFields: ["name", "parentId"]
      }
    });
    expect(updatedLog?.metadata).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      directoryId: created.id,
      statusBefore: "active",
      statusAfter: "active",
      changedFields: ["name"]
    });
    expect(disabledLog?.metadata).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      directoryId: created.id,
      parentDirectoryId: null,
      statusBefore: "active",
      statusAfter: "disabled"
    });

    const serializedCalls = JSON.stringify(operationLogsService.recordOperation.mock.calls);
    expect(serializedCalls).not.toContain("requestBody");
    expect(serializedCalls).not.toContain("children");
    expect(serializedCalls).not.toContain("files");
  });

  it("ensures a default root directory and manages custom directories", async () => {
    const context = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const knowledgeBase = await createCompanyKnowledgeBase("基础管理", context);

    const initial = await knowledgeDirectoriesService.findMany(knowledgeBase.id, context);
    expect(initial.items).toHaveLength(1);
    expect(initial.items[0]).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      companyId: companyA.id,
      name: "默认根目录",
      status: "active",
      isDefault: true,
      parentId: undefined,
      sortOrder: 0
    });

    const created = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      {
        name: "FAQ 资料"
      },
      context
    );
    expect(created).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      companyId: companyA.id,
      name: "FAQ 资料",
      status: "active",
      isDefault: false,
      parentId: undefined,
      sortOrder: 0
    });

    await expect(
      knowledgeDirectoriesService.create(
        knowledgeBase.id,
        {
          name: " FAQ 资料 "
        },
        context
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    const renamed = await knowledgeDirectoriesService.update(
      created.id,
      {
        name: "售后 FAQ"
      },
      context
    );
    expect(renamed.name).toBe("售后 FAQ");

    const disabled = await knowledgeDirectoriesService.disable(created.id, context);
    expect(disabled).toMatchObject({
      id: created.id,
      status: "disabled",
      isDefault: false
    });
    expect(disabled.disabledAt).toBeTruthy();

    const afterDisable = await knowledgeDirectoriesService.findMany(knowledgeBase.id, context);
    expect(afterDisable.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([initial.items[0]!.id, created.id])
    );
  });

  it("creates child directories, enforces depth, and scopes duplicate names by parent", async () => {
    const context = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const knowledgeBase = await createCompanyKnowledgeBase("多级目录", context);

    const level1 = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "产品中心" },
      context
    );
    const level2 = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "传感器", parentId: level1.id },
      context
    );
    const level3 = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "激光测距", parentId: level2.id },
      context
    );
    const level4 = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "M 系列资料", parentId: level3.id },
      context
    );

    expect(level2.parentId).toBe(level1.id);
    expect(level3.parentId).toBe(level2.id);
    expect(level4.parentId).toBe(level3.id);
    expect(level4.sortOrder).toBe(0);

    await expect(
      knowledgeDirectoriesService.create(
        knowledgeBase.id,
        { name: "第 5 层", parentId: level4.id },
        context
      )
    ).rejects.toThrow("目录最多支持 4 层");

    await expect(
      knowledgeDirectoriesService.create(
        knowledgeBase.id,
        { name: "激光测距", parentId: level2.id },
        context
      )
    ).rejects.toThrow("同一父级下已存在目录");

    const siblingParent = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "售后资料" },
      context
    );
    const sameNameUnderDifferentParent = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "激光测距", parentId: siblingParent.id },
      context
    );
    expect(sameNameUnderDifferentParent.name).toBe("激光测距");
    expect(sameNameUnderDifferentParent.parentId).toBe(siblingParent.id);

    const listed = await knowledgeDirectoriesService.findMany(knowledgeBase.id, context);
    expect(listed.items.find((item) => item.id === level3.id)).toMatchObject({
      parentId: level2.id,
      sortOrder: 0
    });
  });

  it("rejects parent directories from another company, another knowledge base, or disabled parents", async () => {
    const contextA = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const contextB = contextFor(operatorB, companyB, MembershipRole.operator);
    const baseA = await createCompanyKnowledgeBase("父级校验 A", contextA);
    const baseB = await createCompanyKnowledgeBase("父级校验 B", contextB);
    const parentA = await knowledgeDirectoriesService.create(baseA.id, { name: "父级 A" }, contextA);
    const parentB = await knowledgeDirectoriesService.create(baseB.id, { name: "父级 B" }, contextB);
    const mismatchedCompanyParent = await prisma.knowledgeDirectory.create({
      data: {
        companyId: companyB.id,
        knowledgeBaseId: baseA.id,
        name: `异常公司父级 ${runId}`,
        status: "active",
        createdById: companyAdmin.id
      }
    });
    const disabledParent = await knowledgeDirectoriesService.create(
      baseA.id,
      { name: "停用父级" },
      contextA
    );
    await knowledgeDirectoriesService.disable(disabledParent.id, contextA);

    await expect(
      knowledgeDirectoriesService.create(
        baseA.id,
        { name: "跨库子目录", parentId: parentB.id },
        contextA
      )
    ).rejects.toThrow("父级目录必须属于当前知识库");
    await expect(
      knowledgeDirectoriesService.create(
        baseA.id,
        { name: "跨公司子目录", parentId: mismatchedCompanyParent.id },
        contextA
      )
    ).rejects.toThrow("父级目录必须属于当前公司");
    await expect(
      knowledgeDirectoriesService.create(
        baseB.id,
        { name: "跨公司读写", parentId: parentA.id },
        contextB
      )
    ).rejects.toThrow("父级目录必须属于当前知识库");
    await expect(
      knowledgeDirectoriesService.create(
        baseA.id,
        { name: "停用父级下子目录", parentId: disabledParent.id },
        contextA
      )
    ).rejects.toThrow("停用目录不能创建子目录");
  });

  it("prevents disabling directories that still have active child directories", async () => {
    const context = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const knowledgeBase = await createCompanyKnowledgeBase("停用子目录保护", context);
    const parent = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "产品中心" },
      context
    );
    await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      { name: "激光测距", parentId: parent.id },
      context
    );

    await expect(knowledgeDirectoriesService.disable(parent.id, context)).rejects.toThrow(
      "目录下仍有启用子目录"
    );
  });

  it("prevents disabling or renaming the default root directory", async () => {
    const context = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const knowledgeBase = await createCompanyKnowledgeBase("根目录保护", context);
    const [root] = (await knowledgeDirectoriesService.findMany(knowledgeBase.id, context)).items;

    await expect(
      knowledgeDirectoriesService.disable(root!.id, context)
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      knowledgeDirectoriesService.update(root!.id, { name: "归档目录" }, context)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps companyId isolation for directory management", async () => {
    const contextA = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const contextB = contextFor(operatorB, companyB, MembershipRole.operator);
    const knowledgeBase = await createCompanyKnowledgeBase("公司隔离", contextA);
    const directory = await knowledgeDirectoriesService.create(
      knowledgeBase.id,
      {
        name: "公司 A 目录"
      },
      contextA
    );

    await expect(
      knowledgeDirectoriesService.findMany(knowledgeBase.id, contextB)
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      knowledgeDirectoriesService.create(knowledgeBase.id, { name: "跨公司目录" }, contextB)
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      knowledgeDirectoriesService.update(directory.id, { name: "跨公司重命名" }, contextB)
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      knowledgeDirectoriesService.disable(directory.id, contextB)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires update permission for directory mutations", async () => {
    const adminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const knowledgeBase = await createCompanyKnowledgeBase("权限控制", adminContext);

    await expect(
      knowledgeDirectoriesService.create(knowledgeBase.id, { name: "运营目录" }, operatorContext)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
