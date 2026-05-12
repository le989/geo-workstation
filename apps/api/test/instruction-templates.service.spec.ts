import { BadRequestException } from "@nestjs/common";
import { GeoPromptType, UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { InstructionTemplatesService } from "../src/modules/geo-instructions/instruction-templates.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("InstructionTemplatesService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: InstructionTemplatesService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new InstructionTemplatesService(prisma as unknown as PrismaService);

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

    const deletedAgain = await service.softDelete(template.id);
    expect(deletedAgain.alreadyDeleted).toBe(true);

    const list = await service.findMany({
      search: uniqueName("软删除")
    });
    expect(list.total).toBe(0);
  });
});
