import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  UserRole,
  UserStatus,
  Visibility,
  type Company,
  type User
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { InstructionTemplatesService } from "../src/modules/geo-instructions/instruction-templates.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("InstructionTemplatesService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: InstructionTemplatesService;
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
    service = new InstructionTemplatesService(prisma as unknown as PrismaService);

    companyA = await prisma.company.create({
      data: {
        name: `Instruction Company A ${runId}`,
        code: `instruction-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Instruction Company B ${runId}`,
        code: `instruction-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    platformAdmin = await prisma.user.create({
      data: {
        email: `instruction-platform-${runId}@example.com`,
        name: "Auth 4B Instruction Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      }
    });
    companyAdmin = await prisma.user.create({
      data: {
        email: `instruction-company-admin-${runId}@example.com`,
        name: "Auth 4B Instruction Company Admin",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `instruction-operator-a-${runId}@example.com`,
        name: "Auth 4B Instruction Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `instruction-operator-b-${runId}@example.com`,
        name: "Auth 4B Instruction Operator B",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });

    const user = await prisma.user.create({
      data: {
        email: `instruction-templates-service-${runId}@example.com`,
        name: "Phase 2F GEO Instruction Operator",
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
    return `Phase 2F ${label} ${runId}`;
  }

  function longInstruction(label: string): string {
    return `${label}：围绕 GEO 提示词意图输出结构化内容，强化品牌实体、应用场景和可引用事实。`;
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

  it("creates a GEO instruction template and normalizes text fields", async () => {
    const created = await service.create({
      name: `  ${uniqueName("选型指南")}  `,
      instructionType: "  selection_guide  ",
      contentType: "  guide  ",
      targetPromptType: GeoPromptType.distilled,
      targetModel: "  deepseek-chat  ",
      instruction: `  ${longInstruction("选型指南")}  `,
      outputFormat: "  markdown  ",
      qualityRules: "  必须包含选型参数  ",
      forbiddenRules: "  不得编造认证信息  ",
      createdBy
    });
    const createLog = await expectOperationLog(created.id, "instruction_template.created");
    // 指令模板审计只记录模板类型等摘要，不记录 instruction 正文。
    expect(JSON.stringify(createLog.metadata ?? {})).not.toContain(longInstruction("选型指南"));

    expect(created).toMatchObject({
      name: uniqueName("选型指南"),
      instructionType: "selection_guide",
      contentType: "guide",
      targetPromptType: GeoPromptType.distilled,
      targetModel: "deepseek-chat",
      instruction: longInstruction("选型指南"),
      outputFormat: "markdown",
      qualityRules: "必须包含选型参数",
      forbiddenRules: "不得编造认证信息",
      createdBy
    });
  });

  it("rejects empty names, short instructions, and duplicate names within one instruction type", async () => {
    await expect(
      service.create({
        name: " ",
        instructionType: "faq",
        instruction: longInstruction("空名称"),
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({
        name: uniqueName("过短指令"),
        instructionType: "faq",
        instruction: "内容太短",
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    const name = uniqueName("重复名称");
    await service.create({
      name,
      instructionType: "faq",
      contentType: "faq",
      instruction: longInstruction("FAQ"),
      createdBy
    });

    await expect(
      service.create({
        name: ` ${name} `,
        instructionType: "faq",
        contentType: "qa_material",
        instruction: longInstruction("重复 FAQ"),
        createdBy
      })
    ).rejects.toThrow(`Active GEO instruction template already exists: faq / ${name}`);
  });

  it("lists instruction templates with pagination, search, and GEO instruction filters", async () => {
    await service.create({
      name: uniqueName("列表FAQ"),
      instructionType: "geo_qa_material",
      contentType: "faq",
      targetPromptType: GeoPromptType.scene,
      targetModel: "deepseek-chat",
      instruction: longInstruction("列表 FAQ"),
      createdBy
    });
    await service.create({
      name: uniqueName("列表不匹配"),
      instructionType: "comparison",
      contentType: "comparison_article",
      targetPromptType: GeoPromptType.brand,
      targetModel: "mock-model",
      instruction: longInstruction("列表不匹配"),
      createdBy
    });

    const result = await service.findMany({
      search: "FAQ",
      page: 1,
      pageSize: 10,
      instructionType: "geo_qa_material",
      contentType: "faq",
      targetPromptType: GeoPromptType.scene,
      targetModel: "deepseek-chat",
      createdBy
    });

    expect(result).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1
    });
    expect(result.items[0]?.name).toBe(uniqueName("列表FAQ"));
  });

  it("gets details, patches templates, and rejects patching to a duplicate name", async () => {
    const first = await service.create({
      name: uniqueName("待编辑"),
      instructionType: "landing_page",
      contentType: "official_site_page",
      instruction: longInstruction("官网落地页"),
      createdBy
    });
    const duplicate = await service.create({
      name: uniqueName("编辑重复目标"),
      instructionType: "landing_page",
      contentType: "official_site_page",
      instruction: longInstruction("官网落地页重复目标"),
      createdBy
    });

    const detail = await service.getDetail(first.id);
    expect(detail.id).toBe(first.id);

    const updated = await service.update(first.id, {
      name: uniqueName("已编辑"),
      instruction: longInstruction("已编辑官网落地页")
    });
    expect(updated.name).toBe(uniqueName("已编辑"));
    expect(updated.instruction).toBe(longInstruction("已编辑官网落地页"));
    const updateLog = await expectOperationLog(first.id, "instruction_template.updated");
    expect(JSON.stringify(updateLog.metadata ?? {})).not.toContain(longInstruction("已编辑官网落地页"));

    await expect(
      service.update(first.id, {
        name: duplicate.name
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("duplicates templates and automatically generates non-conflicting copy names", async () => {
    const source = await service.create({
      name: uniqueName("复制源"),
      instructionType: "manufacturer_recommendation",
      contentType: "recommendation_article",
      targetPromptType: GeoPromptType.brand,
      instruction: longInstruction("厂家推荐"),
      outputFormat: "markdown",
      qualityRules: "突出厂家资质、产品能力和真实应用场景。",
      forbiddenRules: "不得虚构客户案例。",
      createdBy
    });

    const firstCopy = await service.duplicate(source.id, {});
    const secondCopy = await service.duplicate(source.id, {});
    await expectOperationLog(firstCopy.id, "instruction_template.duplicated");

    expect(firstCopy.name).toBe(`${source.name} 副本`);
    expect(secondCopy.name).toBe(`${source.name} 副本 2`);
    expect(firstCopy).toMatchObject({
      instructionType: source.instructionType,
      contentType: source.contentType,
      targetPromptType: source.targetPromptType,
      instruction: source.instruction,
      outputFormat: source.outputFormat,
      qualityRules: source.qualityRules,
      forbiddenRules: source.forbiddenRules
    });
  });

  it("soft deletes templates idempotently and hides deleted templates from lists", async () => {
    const template = await service.create({
      name: uniqueName("软删除"),
      instructionType: "troubleshooting",
      contentType: "faq",
      instruction: longInstruction("故障排查"),
      createdBy
    });

    const deleted = await service.softDelete(template.id);
    expect(deleted).toMatchObject({
      id: template.id,
      deleted: true,
      alreadyDeleted: false
    });
    await expectOperationLog(template.id, "instruction_template.deleted");

    const deletedAgain = await service.softDelete(template.id);
    expect(deletedAgain.alreadyDeleted).toBe(true);

    const list = await service.findMany({
      search: uniqueName("软删除")
    });
    expect(list.total).toBe(0);
  });

  it("isolates instruction template list and detail by company, visibility, and owner", async () => {
    const prefix = uniqueName("隔离列表");
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);

    const companyTemplate = await prisma.instructionTemplate.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: `${prefix} COMPANY`,
        instructionType: "auth4_company",
        contentType: "guide",
        instruction: longInstruction("公司公共模板"),
        createdById: companyAdmin.id
      }
    });
    const ownPrivateTemplate = await prisma.instructionTemplate.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `${prefix} OWN PRIVATE`,
        instructionType: "auth4_private",
        contentType: "guide",
        instruction: longInstruction("自己的私有模板"),
        createdById: operatorA.id
      }
    });
    await prisma.instructionTemplate.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `${prefix} OTHER PRIVATE`,
        instructionType: "auth4_private",
        contentType: "guide",
        instruction: longInstruction("别人的私有模板"),
        createdById: operatorB.id
      }
    });
    await prisma.instructionTemplate.create({
      data: {
        companyId: companyB.id,
        visibility: Visibility.COMPANY,
        name: `${prefix} COMPANY B`,
        instructionType: "auth4_company",
        contentType: "guide",
        instruction: longInstruction("其他公司模板"),
        createdById: operatorB.id
      }
    });
    const platformTemplate = await prisma.instructionTemplate.create({
      data: {
        visibility: Visibility.PLATFORM,
        name: `${prefix} PLATFORM`,
        instructionType: "auth4_platform",
        contentType: "guide",
        instruction: longInstruction("平台模板"),
        createdById: platformAdmin.id
      }
    });

    const list = await service.findMany(
      {
        search: prefix,
        page: 1,
        pageSize: 20
      },
      operatorContext
    );
    const names = list.items.map((item) => item.name);

    expect(names).toEqual(
      expect.arrayContaining([
        companyTemplate.name,
        ownPrivateTemplate.name,
        platformTemplate.name
      ])
    );
    expect(names).not.toEqual(
      expect.arrayContaining([`${prefix} OTHER PRIVATE`, `${prefix} COMPANY B`])
    );

    await expect(service.getDetail(companyTemplate.id, operatorContext)).resolves.toMatchObject({
      id: companyTemplate.id
    });
    await expect(
      service.getDetail(
        (
          await prisma.instructionTemplate.findFirstOrThrow({
            where: {
              name: `${prefix} COMPANY B`
            }
          })
        ).id,
        operatorContext
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("enforces instruction template write permissions and duplicate copy ownership", async () => {
    const prefix = uniqueName("隔离写入");
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const companyBAdminContext = contextFor(companyAdmin, companyB, MembershipRole.company_admin);

    const companyTemplate = await prisma.instructionTemplate.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: `${prefix} COMPANY`,
        instructionType: "auth4_write",
        contentType: "guide",
        instruction: longInstruction("公司公共模板写入"),
        createdById: companyAdmin.id
      }
    });
    const privateTemplate = await prisma.instructionTemplate.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `${prefix} PRIVATE`,
        instructionType: "auth4_write",
        contentType: "guide",
        instruction: longInstruction("私有模板写入"),
        createdById: operatorA.id
      }
    });

    await expect(
      service.update(companyTemplate.id, { name: `${prefix} OPERATOR UPDATE` }, operatorContext)
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.softDelete(companyTemplate.id, operatorContext)).rejects.toBeInstanceOf(
      ForbiddenException
    );

    const updatedPrivate = await service.update(
      privateTemplate.id,
      {
        name: `${prefix} PRIVATE UPDATED`
      },
      operatorContext
    );
    expect(updatedPrivate.name).toBe(`${prefix} PRIVATE UPDATED`);

    const adminUpdated = await service.update(
      companyTemplate.id,
      {
        name: `${prefix} ADMIN UPDATE`
      },
      companyAdminContext
    );
    expect(adminUpdated.name).toBe(`${prefix} ADMIN UPDATE`);

    await expect(
      service.update(companyTemplate.id, { name: `${prefix} COMPANY B UPDATE` }, companyBAdminContext)
    ).rejects.toBeInstanceOf(NotFoundException);

    const duplicated = await service.duplicate(companyTemplate.id, {}, operatorContext);
    const duplicatedRecord = await prisma.instructionTemplate.findUniqueOrThrow({
      where: {
        id: duplicated.id
      }
    });
    expect(duplicatedRecord.companyId).toBe(companyA.id);
    expect(duplicatedRecord.createdById).toBe(operatorA.id);
    expect(duplicatedRecord.visibility).toBe(Visibility.PRIVATE);
  });

  it("creates instruction templates from trusted auth context and scopes name conflicts to company", async () => {
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const sameName = uniqueName("跨公司同名");

    await prisma.instructionTemplate.create({
      data: {
        companyId: companyB.id,
        visibility: Visibility.COMPANY,
        name: sameName,
        instructionType: "auth4_name",
        contentType: "guide",
        instruction: longInstruction("其他公司同名"),
        createdById: operatorB.id
      }
    });

    const createdByOperator = await service.create(
      {
        name: sameName,
        instructionType: "auth4_name",
        contentType: "guide",
        instruction: longInstruction("运营创建同名"),
        createdBy: operatorB.id
      },
      operatorContext
    );
    const operatorRecord = await prisma.instructionTemplate.findUniqueOrThrow({
      where: {
        id: createdByOperator.id
      }
    });
    expect(operatorRecord.companyId).toBe(companyA.id);
    expect(operatorRecord.createdById).toBe(operatorA.id);
    expect(operatorRecord.visibility).toBe(Visibility.PRIVATE);

    const createdByAdmin = await service.create(
      {
        name: uniqueName("公司公共创建"),
        instructionType: "auth4_admin_create",
        contentType: "guide",
        instruction: longInstruction("管理员创建公司公共模板")
      },
      companyAdminContext
    );
    const adminRecord = await prisma.instructionTemplate.findUniqueOrThrow({
      where: {
        id: createdByAdmin.id
      }
    });
    expect(adminRecord.companyId).toBe(companyA.id);
    expect(adminRecord.createdById).toBe(companyAdmin.id);
    expect(adminRecord.visibility).toBe(Visibility.COMPANY);
  });
});
