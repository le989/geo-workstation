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
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { KnowledgeBasesService } from "../src/modules/geo-knowledge/knowledge-bases.service";
import { KnowledgeDirectoriesService } from "../src/modules/geo-knowledge/knowledge-directories.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("KnowledgeDirectoriesService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let knowledgeBasesService: KnowledgeBasesService;
  let knowledgeDirectoriesService: KnowledgeDirectoriesService;
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
      isDefault: true
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
      isDefault: false
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
