import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility,
  type Company,
  type User
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { GeoPromptsService } from "../src/modules/geo-prompts/geo-prompts.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoPromptsService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: GeoPromptsService;
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
    service = new GeoPromptsService(prisma as unknown as PrismaService);

    companyA = await prisma.company.create({
      data: {
        name: `Geo Prompts Company A ${runId}`,
        code: `geo-prompts-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Geo Prompts Company B ${runId}`,
        code: `geo-prompts-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    platformAdmin = await prisma.user.create({
      data: {
        email: `geo-prompts-platform-${runId}@example.com`,
        name: "Auth 4B Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active
      }
    });
    companyAdmin = await prisma.user.create({
      data: {
        email: `geo-prompts-company-admin-${runId}@example.com`,
        name: "Auth 4B Company Admin",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `geo-prompts-operator-a-${runId}@example.com`,
        name: "Auth 4B Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `geo-prompts-operator-b-${runId}@example.com`,
        name: "Auth 4B Operator B",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });

    const user = await prisma.user.create({
      data: {
        email: `geo-prompts-service-${runId}@example.com`,
        name: "Phase 2B GEO Prompt Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function uniquePrompt(label: string): string {
    return `Phase 2B ${label} ${runId}`;
  }

  function attachOperationLogMock() {
    const recordOperation = vi.fn().mockResolvedValue(undefined);

    (service as unknown as { operationLogsService?: { recordOperation: typeof recordOperation } })
      .operationLogsService = { recordOperation };

    return recordOperation;
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

  it("creates one GEO prompt and normalizes GEO prompt text fields", async () => {
    const created = await service.create({
      type: GeoPromptType.base,
      baseWord: "  激光测距传感器  ",
      promptText: `  ${uniquePrompt("创建成功")}  `,
      productLine: "  激光测距传感器  ",
      scenario: "  选型  ",
      userIntent: UserIntent.selection,
      priority: 2,
      targetModels: ["deepseek-chat"],
      source: "  手工录入  ",
      trackEnabled: true,
      latestCoverageStatus: "untracked",
      createdBy
    });

    expect(created.promptText).toBe(uniquePrompt("创建成功"));
    expect(created.baseWord).toBe("激光测距传感器");
    expect(created.productLine).toBe("激光测距传感器");
    expect(created.trackEnabled).toBe(true);
    expect(created.createdBy).toBe(createdBy);
  });

  it("rejects duplicate active promptText when creating a GEO prompt", async () => {
    const promptText = uniquePrompt("重复创建");
    await service.create({
      type: GeoPromptType.base,
      promptText,
      userIntent: UserIntent.selection,
      createdBy
    });

    await expect(
      service.create({
        type: GeoPromptType.scene,
        promptText,
        userIntent: UserIntent.application_solution,
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("queries GEO prompts with pagination and GEO filters", async () => {
    const productLine = uniquePrompt("产品线筛选");
    await service.create({
      type: GeoPromptType.brand,
      promptText: uniquePrompt("品牌词筛选"),
      productLine,
      userIntent: UserIntent.brand_verification,
      priority: 1,
      trackEnabled: true,
      createdBy
    });
    await service.create({
      type: GeoPromptType.base,
      promptText: uniquePrompt("训练词不匹配"),
      productLine: uniquePrompt("其他产品线"),
      userIntent: UserIntent.selection,
      trackEnabled: false,
      createdBy
    });

    const result = await service.findMany({
      page: 1,
      pageSize: 10,
      type: GeoPromptType.brand,
      productLine,
      userIntent: UserIntent.brand_verification,
      trackEnabled: true
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(1);
    expect(result.items[0]?.promptText).toBe(uniquePrompt("品牌词筛选"));
  });

  it("updates a GEO prompt while preserving duplicate protection", async () => {
    const first = await service.create({
      type: GeoPromptType.distilled,
      promptText: uniquePrompt("待更新"),
      userIntent: UserIntent.comparison,
      createdBy
    });
    const duplicateTarget = await service.create({
      type: GeoPromptType.scene,
      promptText: uniquePrompt("重复更新目标"),
      userIntent: UserIntent.application_solution,
      createdBy
    });

    const updated = await service.update(first.id, {
      promptText: uniquePrompt("更新后"),
      priority: 5,
      trackEnabled: true
    });

    expect(updated.promptText).toBe(uniquePrompt("更新后"));
    expect(updated.priority).toBe(5);
    expect(updated.trackEnabled).toBe(true);

    await expect(
      service.update(first.id, {
        promptText: duplicateTarget.promptText
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("soft deletes a GEO prompt and hides it from normal list queries", async () => {
    const promptText = uniquePrompt("软删除");
    const created = await service.create({
      type: GeoPromptType.base,
      promptText,
      userIntent: UserIntent.selection,
      createdBy
    });

    const deleted = await service.softDelete(created.id);
    expect(deleted.deleted).toBe(true);
    expect(deleted.alreadyDeleted).toBe(false);

    const deletedAgain = await service.softDelete(created.id);
    expect(deletedAgain.deleted).toBe(true);
    expect(deletedAgain.alreadyDeleted).toBe(true);

    const list = await service.findMany({
      search: promptText,
      page: 1,
      pageSize: 10
    });
    expect(list.total).toBe(0);
  });

  it("records safe operation logs for GEO prompt create, update, and delete", async () => {
    const recordOperation = attachOperationLogMock();
    const promptText = uniquePrompt("审计创建13812345678");
    const updatedPromptText = uniquePrompt("审计更新微信号wxaudit123");

    const created = await service.create({
      type: GeoPromptType.base,
      promptText,
      userIntent: UserIntent.selection,
      createdBy
    });
    await service.update(created.id, {
      promptText: updatedPromptText,
      priority: 4,
      latestCoverageStatus: "mentioned"
    });
    await service.softDelete(created.id);

    const actions = recordOperation.mock.calls.map(([input]) => input.action);
    const serializedCalls = JSON.stringify(recordOperation.mock.calls);

    expect(actions).toEqual([
      "geo_prompt.question.created",
      "geo_prompt.question.updated",
      "geo_prompt.question.deleted"
    ]);
    expect(serializedCalls).not.toContain(promptText);
    expect(serializedCalls).not.toContain(updatedPromptText);
    expect(recordOperation.mock.calls[1]?.[0].metadata).toMatchObject({
      questionId: created.id,
      changedFields: expect.arrayContaining(["promptText", "priority", "latestCoverageStatus"])
    });
  });

  it("bulk imports valid rows and reports batch duplicates, database duplicates, and failed rows", async () => {
    const databaseDuplicate = uniquePrompt("数据库重复");
    await service.create({
      type: GeoPromptType.base,
      promptText: databaseDuplicate,
      userIntent: UserIntent.selection,
      createdBy
    });

    const batchPrompt = uniquePrompt("批量导入成功");
    const result = await service.bulkImport({
      rows: [
        {
          type: GeoPromptType.base,
          baseWord: " 激光测距传感器 ",
          promptText: ` ${batchPrompt} `,
          productLine: " 激光测距传感器 ",
          userIntent: UserIntent.selection,
          priority: 3,
          targetModels: ["deepseek-chat"],
          source: " 批量导入 ",
          trackEnabled: false
        },
        {
          type: GeoPromptType.distilled,
          promptText: batchPrompt,
          userIntent: UserIntent.selection
        },
        {
          type: GeoPromptType.brand,
          promptText: databaseDuplicate,
          userIntent: UserIntent.brand_verification
        },
        {
          type: "scene",
          promptText: "",
          priority: 8
        }
      ]
    });

    expect(result.totalRows).toBe(4);
    expect(result.successCount).toBe(1);
    expect(result.duplicateCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(3);
    expect(result.createdItems[0]?.promptText).toBe(batchPrompt);
    expect(result.duplicateRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 2,
          promptText: batchPrompt,
          reason: "duplicate_in_batch"
        }),
        expect.objectContaining({
          rowIndex: 3,
          promptText: databaseDuplicate,
          reason: "duplicate_in_database"
        })
      ])
    );
    expect(result.failedRows[0]?.errors.length).toBeGreaterThan(0);
  });

  it("exports filtered GEO prompts as CSV text", async () => {
    const productLine = uniquePrompt("CSV产品线");
    const promptText = uniquePrompt("CSV导出");
    await service.create({
      type: GeoPromptType.scene,
      promptText,
      productLine,
      userIntent: UserIntent.application_solution,
      targetModels: ["deepseek-chat", "kimi"],
      createdBy
    });

    const csv = await service.exportCsv({
      productLine
    });

    expect(csv).toContain("id,type,baseWord,promptText,productLine");
    expect(csv).toContain(promptText);
    expect(csv).toContain('"[""deepseek-chat"",""kimi""]"');
  });

  it("records safe operation logs for GEO prompt bulk import and export", async () => {
    const databaseDuplicate = uniquePrompt("审计数据库重复");
    await service.create({
      type: GeoPromptType.base,
      promptText: databaseDuplicate,
      userIntent: UserIntent.selection,
      createdBy
    });

    const recordOperation = attachOperationLogMock();
    const importedPrompt = uniquePrompt("审计批量导入13812345678");

    await service.bulkImport({
      rows: [
        {
          type: GeoPromptType.base,
          promptText: importedPrompt,
          userIntent: UserIntent.selection
        },
        {
          type: GeoPromptType.scene,
          promptText: importedPrompt,
          userIntent: UserIntent.application_solution
        },
        {
          type: GeoPromptType.brand,
          promptText: databaseDuplicate,
          userIntent: UserIntent.brand_verification
        },
        {
          type: "scene",
          promptText: "失败行原文13812345678",
          priority: 8
        }
      ],
      createdBy
    });
    await service.exportCsv({
      search: importedPrompt
    });

    const actions = recordOperation.mock.calls.map(([input]) => input.action);
    const bulkLog = recordOperation.mock.calls.find(
      ([input]) => input.action === "geo_prompt.question.bulk_imported"
    )?.[0];
    const exportLog = recordOperation.mock.calls.find(
      ([input]) => input.action === "geo_prompt.question.exported"
    )?.[0];
    const serializedCalls = JSON.stringify(recordOperation.mock.calls);

    expect(actions).toEqual([
      "geo_prompt.question.bulk_imported",
      "geo_prompt.question.exported"
    ]);
    expect(bulkLog?.metadata).toMatchObject({
      importCount: 4,
      duplicateCount: 2,
      failedCount: 1,
      skippedCount: 3
    });
    expect(exportLog?.metadata).toMatchObject({
      exportCount: 1
    });
    expect(serializedCalls).not.toContain(importedPrompt);
    expect(serializedCalls).not.toContain("失败行原文13812345678");
    expect(serializedCalls).not.toContain("id,type,baseWord,promptText");
  });

  it("isolates GEO prompt list and export by current company, visibility, and owner", async () => {
    const prefix = uniquePrompt("隔离列表");
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);

    const companyPrompt = await prisma.geoPrompt.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        type: GeoPromptType.base,
        promptText: `${prefix} COMPANY`,
        userIntent: UserIntent.selection,
        createdById: companyAdmin.id
      }
    });
    const ownPrivatePrompt = await prisma.geoPrompt.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        type: GeoPromptType.scene,
        promptText: `${prefix} OWN PRIVATE`,
        userIntent: UserIntent.application_solution,
        createdById: operatorA.id
      }
    });
    await prisma.geoPrompt.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        type: GeoPromptType.brand,
        promptText: `${prefix} OTHER PRIVATE`,
        userIntent: UserIntent.brand_verification,
        createdById: operatorB.id
      }
    });
    await prisma.geoPrompt.create({
      data: {
        companyId: companyB.id,
        visibility: Visibility.COMPANY,
        type: GeoPromptType.base,
        promptText: `${prefix} COMPANY B`,
        userIntent: UserIntent.selection,
        createdById: operatorB.id
      }
    });
    const platformPrompt = await prisma.geoPrompt.create({
      data: {
        visibility: Visibility.PLATFORM,
        type: GeoPromptType.distilled,
        promptText: `${prefix} PLATFORM`,
        userIntent: UserIntent.comparison,
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
    const promptTexts = list.items.map((item) => item.promptText);

    expect(promptTexts).toEqual(
      expect.arrayContaining([
        companyPrompt.promptText,
        ownPrivatePrompt.promptText,
        platformPrompt.promptText
      ])
    );
    expect(promptTexts).not.toEqual(
      expect.arrayContaining([`${prefix} OTHER PRIVATE`, `${prefix} COMPANY B`])
    );

    const csv = await service.exportCsv(
      {
        search: prefix
      },
      operatorContext
    );
    expect(csv).toContain(companyPrompt.promptText);
    expect(csv).toContain(ownPrivatePrompt.promptText);
    expect(csv).toContain(platformPrompt.promptText);
    expect(csv).not.toContain(`${prefix} OTHER PRIVATE`);
    expect(csv).not.toContain(`${prefix} COMPANY B`);
  });

  it("enforces GEO prompt write permissions and IDOR protection", async () => {
    const prefix = uniquePrompt("隔离写入");
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const companyBAdminContext = contextFor(companyAdmin, companyB, MembershipRole.company_admin);

    const companyPrompt = await prisma.geoPrompt.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        type: GeoPromptType.base,
        promptText: `${prefix} COMPANY`,
        userIntent: UserIntent.selection,
        createdById: companyAdmin.id
      }
    });
    const privatePrompt = await prisma.geoPrompt.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        type: GeoPromptType.scene,
        promptText: `${prefix} PRIVATE`,
        userIntent: UserIntent.application_solution,
        createdById: operatorA.id
      }
    });

    await expect(
      service.update(companyPrompt.id, { priority: 5 }, operatorContext)
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.softDelete(companyPrompt.id, operatorContext)).rejects.toBeInstanceOf(
      ForbiddenException
    );

    const updatedPrivate = await service.update(
      privatePrompt.id,
      {
        priority: 4,
        latestCoverageStatus: "mentioned"
      },
      operatorContext
    );
    expect(updatedPrivate.priority).toBe(4);
    expect(updatedPrivate.latestCoverageStatus).toBe("mentioned");

    const adminUpdated = await service.update(
      companyPrompt.id,
      {
        priority: 2
      },
      companyAdminContext
    );
    expect(adminUpdated.priority).toBe(2);

    await expect(
      service.update(companyPrompt.id, { priority: 1 }, companyBAdminContext)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates and bulk imports GEO prompts from trusted auth context", async () => {
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const promptText = uniquePrompt("上下文创建");
    const crossCompanyDuplicate = uniquePrompt("跨公司重复");

    await prisma.geoPrompt.create({
      data: {
        companyId: companyB.id,
        visibility: Visibility.COMPANY,
        type: GeoPromptType.base,
        promptText: crossCompanyDuplicate,
        userIntent: UserIntent.selection,
        createdById: operatorB.id
      }
    });

    const created = await service.create(
      {
        type: GeoPromptType.base,
        promptText,
        userIntent: UserIntent.selection,
        createdBy: operatorB.id
      },
      operatorContext
    );
    const createdRecord = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: created.id
      }
    });
    expect(createdRecord.companyId).toBe(companyA.id);
    expect(createdRecord.createdById).toBe(operatorA.id);
    expect(createdRecord.visibility).toBe(Visibility.PRIVATE);

    const imported = await service.bulkImport(
      {
        rows: [
          {
            type: GeoPromptType.brand,
            promptText: crossCompanyDuplicate,
            userIntent: UserIntent.brand_verification
          }
        ],
        createdBy: operatorB.id
      },
      operatorContext
    );
    expect(imported.successCount).toBe(1);
    const importedRecord = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: imported.createdItems[0]?.id
      }
    });
    expect(importedRecord.companyId).toBe(companyA.id);
    expect(importedRecord.createdById).toBe(operatorA.id);
    expect(importedRecord.visibility).toBe(Visibility.PRIVATE);
  });
});
