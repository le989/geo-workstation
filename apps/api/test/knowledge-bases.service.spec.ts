import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  MembershipRole,
  UserRole,
  UserStatus,
  Visibility,
  type Company,
  type User
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { KnowledgeBasesService } from "../src/modules/geo-knowledge/knowledge-bases.service";
import { KnowledgeChunksService } from "../src/modules/geo-knowledge/knowledge-chunks.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("KnowledgeBasesService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let knowledgeBasesService: KnowledgeBasesService;
  let knowledgeChunksService: KnowledgeChunksService;
  let createdBy: string;
  let companyA: Company;
  let companyB: Company;
  let platformAdmin: User;
  let companyAdmin: User;
  let operatorA: User;
  let operatorB: User;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    knowledgeBasesService = new KnowledgeBasesService(prisma as unknown as PrismaService);
    knowledgeChunksService = new KnowledgeChunksService(prisma as unknown as PrismaService);

    companyA = await prisma.company.create({
      data: {
        name: `Knowledge Company A ${runId}`,
        code: `knowledge-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Knowledge Company B ${runId}`,
        code: `knowledge-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    platformAdmin = await prisma.user.create({
      data: {
        email: `knowledge-platform-${runId}@example.com`,
        name: "Auth 4B Knowledge Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      }
    });
    companyAdmin = await prisma.user.create({
      data: {
        email: `knowledge-company-admin-${runId}@example.com`,
        name: "Auth 4B Knowledge Company Admin",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `knowledge-operator-a-${runId}@example.com`,
        name: "Auth 4B Knowledge Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `knowledge-operator-b-${runId}@example.com`,
        name: "Auth 4B Knowledge Operator B",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });

    const user = await prisma.user.create({
      data: {
        email: `knowledge-service-${runId}@example.com`,
        name: "Phase 2D GEO Knowledge Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function uniqueName(label: string): string {
    return `激光测距传感器${label}${runId}`;
  }

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

  it("creates a GEO knowledge base and rejects an empty name", async () => {
    const created = await knowledgeBasesService.create({
      name: `  ${uniqueName("知识库")}  `,
      productLine: " 激光测距传感器 ",
      description: " 面向 GEO 内容生成的事实底座 ",
      createdBy
    });

    expect(created).toMatchObject({
      name: uniqueName("知识库"),
      productLine: "激光测距传感器",
      status: "active",
      createdBy
    });

    await expect(
      knowledgeBasesService.create({
        name: " ",
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects duplicate knowledge base names within the same product line", async () => {
    const name = uniqueName("重复");
    await knowledgeBasesService.create({
      name,
      productLine: "重复产品线",
      createdBy
    });

    await expect(
      knowledgeBasesService.create({
        name: ` ${name} `,
        productLine: "重复产品线",
        createdBy
      })
    ).rejects.toThrow(`Active GEO knowledge base already exists: ${name}`);
  });

  it("lists knowledge bases with pagination and productLine filters", async () => {
    const productLineA = `列表产品线A${runId}`;
    const productLineB = `列表产品线B${runId}`;
    await knowledgeBasesService.create({
      name: uniqueName("列表A"),
      productLine: productLineA,
      createdBy
    });
    await knowledgeBasesService.create({
      name: uniqueName("列表B"),
      productLine: productLineB,
      createdBy
    });

    const result = await knowledgeBasesService.findMany({
      page: 1,
      pageSize: 10,
      productLine: productLineA
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(1);
    expect(result.items[0]?.productLine).toBe(productLineA);
  });

  it("returns knowledge base details with chunk counts and latest chunks", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("详情"),
      productLine: "详情产品线",
      createdBy
    });
    await knowledgeBasesService.textImport(knowledgeBase.id, {
      title: "产品优势",
      content: "激光测距传感器具备高精度、稳定输出和复杂工业场景适配能力。",
      materialType: "product_info",
      createdBy
    });

    const detail = await knowledgeBasesService.getDetail(knowledgeBase.id);

    expect(detail.knowledgeBase.id).toBe(knowledgeBase.id);
    expect(detail.filesCount).toBe(0);
    expect(detail.chunksCount).toBe(1);
    expect(detail.latestChunks[0]?.title).toBe("产品优势");
  });

  it("updates and soft deletes knowledge bases, then excludes them from lists", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("删除前"),
      productLine: "删除产品线",
      createdBy
    });

    const updated = await knowledgeBasesService.update(knowledgeBase.id, {
      name: uniqueName("删除后"),
      description: "更新后的 GEO 知识资产说明"
    });
    expect(updated.name).toBe(uniqueName("删除后"));

    const deleted = await knowledgeBasesService.softDelete(knowledgeBase.id);
    expect(deleted.alreadyDeleted).toBe(false);

    const idempotent = await knowledgeBasesService.softDelete(knowledgeBase.id);
    expect(idempotent.alreadyDeleted).toBe(true);

    const list = await knowledgeBasesService.findMany({
      search: uniqueName("删除后")
    });
    expect(list.total).toBe(0);
  });

  it("text-import creates a knowledge chunk, inherits product line, and rejects deleted bases", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("文本导入"),
      productLine: "文本导入产品线",
      createdBy
    });

    const chunk = await knowledgeBasesService.textImport(knowledgeBase.id, {
      title: "  选型参数  ",
      content: "  选型时应关注量程、精度、响应速度、安装方式和现场干扰环境。  ",
      materialType: "solution",
      tags: ["  选型 ", "", "GEO素材"],
      createdBy
    });

    expect(chunk).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      fileId: null,
      title: "选型参数",
      sourceType: "pasted_text",
      productLine: "文本导入产品线",
      materialType: "solution",
      tags: ["选型", "GEO素材"]
    });

    await knowledgeBasesService.softDelete(knowledgeBase.id);
    await expect(
      knowledgeBasesService.textImport(knowledgeBase.id, {
        title: "已删除知识库",
        content: "已删除知识库不能继续导入 GEO 知识片段。",
        createdBy
      })
    ).rejects.toThrow(`Deleted GEO knowledge base cannot accept text import: ${knowledgeBase.id}`);
  });

  it("queries, updates, and soft deletes knowledge chunks", async () => {
    const knowledgeBase = await knowledgeBasesService.create({
      name: uniqueName("片段管理"),
      productLine: "片段产品线",
      createdBy
    });
    const chunk = await knowledgeBasesService.textImport(knowledgeBase.id, {
      title: "应用案例",
      content: "某工业现场使用激光测距传感器进行行车防撞和位置检测。",
      sourceType: "text_import",
      materialType: "case",
      tags: ["案例", "行车防撞"],
      createdBy
    });

    const list = await knowledgeChunksService.findMany(knowledgeBase.id, {
      page: 1,
      pageSize: 5,
      search: "行车防撞",
      tags: ["案例"]
    });
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(chunk.id);

    const updated = await knowledgeChunksService.update(chunk.id, {
      title: "行车防撞应用案例",
      content: "行车防撞场景中，激光测距传感器可提供连续距离数据支持安全联锁。",
      tags: ["案例", "安全"]
    });
    expect(updated.title).toBe("行车防撞应用案例");
    expect(updated.tags).toEqual(["案例", "安全"]);

    const deleted = await knowledgeChunksService.softDelete(chunk.id);
    expect(deleted.alreadyDeleted).toBe(false);

    const afterDelete = await knowledgeChunksService.findMany(knowledgeBase.id, {
      search: "行车防撞"
    });
    expect(afterDelete.total).toBe(0);
  });

  it("isolates knowledge base list and detail by company, visibility, and owner", async () => {
    const prefix = uniqueName("隔离列表");
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);

    const companyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: `${prefix} COMPANY`,
        status: "active",
        createdById: companyAdmin.id
      }
    });
    const ownPrivateBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `${prefix} OWN PRIVATE`,
        status: "active",
        createdById: operatorA.id
      }
    });
    await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `${prefix} OTHER PRIVATE`,
        status: "active",
        createdById: operatorB.id
      }
    });
    const companyBBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyB.id,
        visibility: Visibility.COMPANY,
        name: `${prefix} COMPANY B`,
        status: "active",
        createdById: operatorB.id
      }
    });
    const platformBase = await prisma.knowledgeBase.create({
      data: {
        visibility: Visibility.PLATFORM,
        name: `${prefix} PLATFORM`,
        status: "active",
        createdById: platformAdmin.id
      }
    });

    const list = await knowledgeBasesService.findMany(
      {
        search: prefix,
        page: 1,
        pageSize: 20
      },
      operatorContext
    );
    const names = list.items.map((item) => item.name);

    expect(names).toEqual(
      expect.arrayContaining([companyBase.name, ownPrivateBase.name, platformBase.name])
    );
    expect(names).not.toEqual(
      expect.arrayContaining([`${prefix} OTHER PRIVATE`, companyBBase.name])
    );
    await expect(knowledgeBasesService.getDetail(companyBase.id, operatorContext)).resolves.toMatchObject({
      knowledgeBase: {
        id: companyBase.id
      }
    });
    await expect(
      knowledgeBasesService.getDetail(companyBBase.id, operatorContext)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("enforces knowledge base write permissions and trusted create context", async () => {
    const prefix = uniqueName("隔离写入");
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const companyBAdminContext = contextFor(companyAdmin, companyB, MembershipRole.company_admin);

    const companyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: `${prefix} COMPANY`,
        status: "active",
        createdById: companyAdmin.id
      }
    });
    const privateBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `${prefix} PRIVATE`,
        status: "active",
        createdById: operatorA.id
      }
    });

    await expect(
      knowledgeBasesService.update(companyBase.id, { description: "运营越权" }, operatorContext)
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(knowledgeBasesService.softDelete(companyBase.id, operatorContext)).rejects.toBeInstanceOf(
      ForbiddenException
    );

    const updatedPrivate = await knowledgeBasesService.update(
      privateBase.id,
      {
        description: "运营可编辑自己的私有知识库"
      },
      operatorContext
    );
    expect(updatedPrivate.description).toBe("运营可编辑自己的私有知识库");

    const adminUpdated = await knowledgeBasesService.update(
      companyBase.id,
      {
        description: "管理员可编辑公司公共知识库"
      },
      companyAdminContext
    );
    expect(adminUpdated.description).toBe("管理员可编辑公司公共知识库");

    await expect(
      knowledgeBasesService.update(companyBase.id, { description: "跨公司越权" }, companyBAdminContext)
    ).rejects.toBeInstanceOf(NotFoundException);

    const created = await knowledgeBasesService.create(
      {
        name: uniqueName("上下文创建"),
        productLine: "上下文产品线",
        createdBy: operatorB.id
      },
      operatorContext
    );
    const createdRecord = await prisma.knowledgeBase.findUniqueOrThrow({
      where: {
        id: created.id
      }
    });
    expect(createdRecord.companyId).toBe(companyA.id);
    expect(createdRecord.createdById).toBe(operatorA.id);
    expect(createdRecord.visibility).toBe(Visibility.PRIVATE);
  });

  it("protects knowledge chunks through parent knowledge base permissions", async () => {
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);

    const companyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: uniqueName("片段公共知识库"),
        status: "active",
        createdById: companyAdmin.id
      }
    });
    const privateBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: uniqueName("片段私有知识库"),
        status: "active",
        createdById: operatorA.id
      }
    });
    const otherCompanyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyB.id,
        visibility: Visibility.COMPANY,
        name: uniqueName("片段其他公司知识库"),
        status: "active",
        createdById: operatorB.id
      }
    });
    const companyChunk = await prisma.knowledgeChunk.create({
      data: {
        companyId: companyA.id,
        knowledgeBaseId: companyBase.id,
        title: "公共片段",
        content: "公共片段内容用于验证运营人员不能直接修改公共知识库片段。",
        sourceType: "pasted_text"
      }
    });
    const privateChunk = await prisma.knowledgeChunk.create({
      data: {
        companyId: companyA.id,
        knowledgeBaseId: privateBase.id,
        title: "私有片段",
        content: "私有片段内容用于验证运营人员可以修改自己的私有知识库片段。",
        sourceType: "pasted_text"
      }
    });
    const otherCompanyChunk = await prisma.knowledgeChunk.create({
      data: {
        companyId: companyB.id,
        knowledgeBaseId: otherCompanyBase.id,
        title: "其他公司片段",
        content: "其他公司片段不能通过 id 被当前公司用户修改或删除。",
        sourceType: "pasted_text"
      }
    });

    await expect(
      knowledgeChunksService.findMany(otherCompanyBase.id, {}, operatorContext)
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      knowledgeChunksService.update(companyChunk.id, { title: "运营越权片段" }, operatorContext)
    ).rejects.toBeInstanceOf(ForbiddenException);

    const updatedPrivateChunk = await knowledgeChunksService.update(
      privateChunk.id,
      {
        title: "运营私有片段"
      },
      operatorContext
    );
    expect(updatedPrivateChunk.title).toBe("运营私有片段");

    const adminUpdatedChunk = await knowledgeChunksService.update(
      companyChunk.id,
      {
        title: "管理员公共片段"
      },
      companyAdminContext
    );
    expect(adminUpdatedChunk.title).toBe("管理员公共片段");

    await expect(
      knowledgeChunksService.update(otherCompanyChunk.id, { title: "跨公司片段" }, operatorContext)
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      knowledgeChunksService.softDelete(otherCompanyChunk.id, operatorContext)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
