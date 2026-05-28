import { BadRequestException } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  MembershipRole,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ContentItemsService } from "../src/modules/geo-content/content-items.service";
import { ContentTasksService } from "../src/modules/geo-content/content-tasks.service";
import type { QualityGateResult } from "../src/modules/geo-content/utils/quality-gate.util";
import type { ArticlePublishPackage } from "../src/modules/geo-content/utils/article-publish-package.util";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ContentItemsService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let tasksService: ContentTasksService;
  let itemsService: ContentItemsService;
  let createdBy: string;
  let companyA: { id: string; name: string; code: string };
  let companyB: { id: string; name: string; code: string };
  let companyAdminA: { id: string };
  let operatorA: { id: string };
  let operatorB: { id: string };
  const aiProvider = {
    generateText: async () => ({
      text: JSON.stringify({
        title: "发布优化版标题",
        body: "发布优化版正文，删除未证实协议名，并补充需结合具体型号资料确认的边界表达。",
        changes: ["删除未证实协议名", "增加适用边界"],
        warnings: ["仍需人工确认具体型号参数"]
      }),
      provider: "openai_compatible",
      model: "test-model"
    })
  };
  const projectProfile = {
    getPromptContext: async () => ({
      id: `project-profile-${runId}`,
      projectName: "测试 GEO 项目",
      brandName: "凯基特",
      mainProducts: ["激光测距传感器"],
      forbiddenClaims: ["不承诺一定适用"],
      targetModels: ["DeepSeek"],
      createdAt: new Date(),
      updatedAt: new Date()
    })
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    tasksService = new ContentTasksService(prisma as unknown as PrismaService);
    itemsService = new ContentItemsService(
      prisma as unknown as PrismaService,
      aiProvider,
      projectProfile
    );

    const user = await prisma.user.create({
      data: {
        email: `content-item-service-${runId}@example.com`,
        name: "Phase 2G GEO Content Item Editor",
        role: UserRole.content_editor,
        status: UserStatus.active
      }
    });
    createdBy = user.id;

    companyA = await prisma.company.create({
      data: {
        name: `Auth 4D Content Item Company A ${runId}`,
        code: `auth4d-item-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Auth 4D Content Item Company B ${runId}`,
        code: `auth4d-item-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyAdminA = await prisma.user.create({
      data: {
        email: `auth4d-item-company-admin-${runId}@example.com`,
        name: "Auth 4D Content Item Company Admin A",
        role: UserRole.company_admin,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `auth4d-item-operator-a-${runId}@example.com`,
        name: "Auth 4D Content Item Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `auth4d-item-operator-b-${runId}@example.com`,
        name: "Auth 4D Content Item Operator B",
        role: UserRole.operator,
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
    return `Phase 2G Item ${label} ${runId}`;
  }

  async function createTaskWithItem() {
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.scene,
        baseWord: "激光测距传感器",
        promptText: unique("行车防撞用什么激光测距传感器"),
        productLine: "激光测距传感器",
        scenario: "行车防撞",
        userIntent: UserIntent.application_solution,
        priority: 2,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    return tasksService.create({
      name: unique("内容项任务"),
      productLine: "内容项产品线",
      generationType: "application_solution",
      targetModel: "deepseek-chat",
      geoPromptIds: [prompt.id],
      createdBy
    });
  }

  async function createQualityCheckItem(body: string) {
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: unique("质量检查知识库"),
        productLine: "激光测距传感器",
        description: "用于内容质量检查测试的知识库。",
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
        title: unique("知识片段"),
        content:
          "知识库只说明输出方式需结合具体型号资料确认，未提供任何具体通信协议、认证、价格或交期。",
        sourceType: "text_import",
        productLine: "激光测距传感器",
        materialType: "selection_guide"
      }
    });
    const instructionTemplate = await prisma.instructionTemplate.create({
      data: {
        name: unique("质量检查指令模板"),
        instructionType: "selection_guide",
        contentType: "selection_guide",
        targetPromptType: GeoPromptType.distilled,
        instruction: "请生成谨慎的 GEO 选型指南，避免编造参数和协议。",
        qualityRules: "结构清晰，有 FAQ，有边界表达。",
        forbiddenRules: "不得编造协议、认证、价格、交期和承诺。",
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique("激光测距传感器怎么选"),
        productLine: "激光测距传感器",
        userIntent: UserIntent.selection,
        priority: 1,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    const task = await prisma.contentTask.create({
      data: {
        name: unique("质量检查内容任务"),
        productLine: "激光测距传感器",
        generationType: "selection_guide",
        status: TaskStatus.succeeded,
        provider: "openai_compatible",
        model: "test-model",
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        instructionTemplate: {
          connect: {
            id: instructionTemplate.id
          }
        },
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    return prisma.contentItem.create({
      data: {
        task: {
          connect: {
            id: task.id
          }
        },
        geoPrompt: {
          connect: {
            id: prompt.id
          }
        },
        title: unique("质量检查内容项"),
        body,
        geoOptimizationPoints: ["覆盖选型问题"],
        suggestedPublishChannel: "官网文章",
        status: "draft"
      }
    });
  }

  async function createPublishPackageItem(input?: { body?: string }) {
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: unique("发布包知识库"),
        productLine: "雷达测距传感器",
        description: "用于发布包测试的知识库。",
        createdById: createdBy
      }
    });
    const selectedFile = await prisma.knowledgeFile.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        title: unique("KJT-LD18 雷达测距传感器产品规格书"),
        fileName: "KJT-LD18 雷达测距传感器产品规格书.md",
        fileType: "md",
        fileSize: 1024,
        reviewStatus: KnowledgeReviewStatus.approved,
        trustLevel: KnowledgeTrustLevel.high,
        createdById: createdBy
      }
    });
    const otherFile = await prisma.knowledgeFile.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        title: unique("KJT-HWCJ-50M 红外光电开关技术规格"),
        fileName: "KJT-HWCJ-50M 红外光电开关技术规格.md",
        fileType: "md",
        fileSize: 1024,
        reviewStatus: KnowledgeReviewStatus.approved,
        trustLevel: KnowledgeTrustLevel.high,
        createdById: createdBy
      }
    });
    const pendingFile = await prisma.knowledgeFile.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        title: unique("KJT-KELR-TE 待审核资料"),
        fileName: "KJT-KELR-TE 待审核资料.md",
        fileType: "md",
        fileSize: 1024,
        reviewStatus: KnowledgeReviewStatus.pending,
        trustLevel: KnowledgeTrustLevel.low,
        createdById: createdBy
      }
    });
    await prisma.knowledgeChunk.createMany({
      data: [
        {
          knowledgeBaseId: knowledgeBase.id,
          fileId: selectedFile.id,
          title: unique("LD18 片段"),
          content: "KJT-LD18 雷达测距传感器可用于工业测距，选型需结合现场工况确认。",
          sourceType: "file_parse",
          productLine: "雷达测距传感器",
          materialType: "product_material"
        },
        {
          knowledgeBaseId: knowledgeBase.id,
          fileId: otherFile.id,
          title: unique("HWCJ 片段"),
          content: "KJT-HWCJ-50M 红外光电开关用于长距离 TOF 检测。",
          sourceType: "file_parse",
          productLine: "TOF光电开关",
          materialType: "product_material"
        },
        {
          knowledgeBaseId: knowledgeBase.id,
          fileId: pendingFile.id,
          title: unique("待审核片段"),
          content: "KELR-TE 待审核资料不得作为正式发布依据。",
          sourceType: "file_parse",
          productLine: "激光位移传感器",
          materialType: "product_material"
        }
      ]
    });
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: "KJT-LD18",
        promptText: unique("KJT-LD18 雷达测距传感器怎么选"),
        productLine: "雷达测距传感器",
        userIntent: UserIntent.selection,
        priority: 1,
        createdById: createdBy
      }
    });
    const task = await prisma.contentTask.create({
      data: {
        name: unique("发布包内容任务"),
        productLine: "雷达测距传感器",
        knowledgeBaseId: knowledgeBase.id,
        knowledgeScope: {
          type: "selected_files",
          selectedKnowledgeFileIds: [selectedFile.id],
          summary: "指定资料生成"
        },
        generationType: "selection_guide",
        status: TaskStatus.succeeded,
        provider: "mock",
        model: "mock-content-v1",
        createdById: createdBy
      }
    });
    const item = await prisma.contentItem.create({
      data: {
        taskId: task.id,
        geoPromptId: prompt.id,
        title: unique("KJT-LD18 雷达测距传感器选型与应用参考"),
        body:
          input?.body ??
          "## 适用场景\nKJT-LD18 雷达测距传感器适合工业测距场景，选型前应确认目标材质、安装距离和现场环境。\n\n## 选型注意事项\n- 结合资料核对型号参数\n- 结合现场工况确认安装条件\n\n## FAQ\n问：怎么选？答：先确认检测距离、安装空间和输出要求。",
        geoOptimizationPoints: ["覆盖 LD18 选型问题"],
        suggestedPublishChannel: "多平台文章",
        publishStatus: "needs_review",
        qualityGateResult: {
          version: "article_quality_gate_v1",
          checkedAt: new Date().toISOString(),
          provider: "mock",
          model: "mock-content-v1",
          score: 82,
          level: "medium",
          publishStatus: "needs_review",
          riskItems: [],
          positiveItems: ["结构清晰"],
          manualReviewItems: ["参数发布前需人工核对"],
          forbiddenWordHits: [],
          aiStyleIssues: [],
          factBoundaryIssues: [],
          scopeSummary: {
            knowledgeBaseId: knowledgeBase.id,
            scopeType: "selected_files",
            selectedFileCount: 1
          },
          recommendation: "可作为发布前人工审校稿。"
        },
        qualityCheckedAt: new Date(),
        status: "draft"
      }
    });

    return {
      knowledgeBase,
      selectedFile,
      otherFile,
      pendingFile,
      task,
      item
    };
  }

  const contextFor = (
    user: { id: string },
    company: { id: string; name: string; code: string },
    role: MembershipRole
  ): ResourceAccessContext => ({
    user: {
      id: user.id,
      email: `${user.id}@auth4d.local`,
      name: user.id,
      role: role === MembershipRole.company_admin ? UserRole.company_admin : UserRole.operator,
      status: UserStatus.active,
      isPlatformAdmin: false
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
      isPlatformAdmin: false
    }
  });

  async function createScopedItem(
    label: string,
    company: { id: string },
    user: { id: string }
  ) {
    const prompt = await prisma.geoPrompt.create({
      data: {
        companyId: company.id,
        type: GeoPromptType.scene,
        baseWord: "激光测距传感器",
        promptText: unique(`${label} 提示词`),
        productLine: "激光测距传感器",
        userIntent: UserIntent.application_solution,
        priority: 2,
        visibility: Visibility.COMPANY,
        createdById: user.id
      }
    });
    const task = await prisma.contentTask.create({
      data: {
        companyId: company.id,
        name: unique(label),
        productLine: "激光测距传感器",
        generationType: "application_solution",
        status: TaskStatus.succeeded,
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
        body: "## 适用场景\n用于 Auth-4D ContentItem 隔离测试。\n## FAQ 总结\n问：是否隔离？答：必须隔离。",
        geoOptimizationPoints: ["隔离测试"],
        suggestedPublishChannel: "官网文章",
        status: "draft"
      }
    });

    return {
      task,
      item,
      prompt
    };
  }

  it("queries, edits, exports, and soft deletes content items", async () => {
    const created = await createTaskWithItem();
    const item = created.items[0];
    expect(item).toBeDefined();

    const list = await itemsService.findMany({
      page: 1,
      pageSize: 10,
      taskId: created.task.id,
      geoPromptId: item!.geoPromptId ?? undefined,
      status: "draft"
    });
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(item!.id);

    const updated = await itemsService.update(item!.id, {
      title: "  行车防撞激光测距传感器 GEO 方案  ",
      body: "  行车防撞场景需要稳定、快速、可解释的激光测距方案，便于 AI 问答引用。  ",
      geoOptimizationPoints: ["强化品牌实体", "覆盖应用场景"],
      suggestedPublishChannel: " 官网方案页 ",
      status: "reviewing"
    });
    expect(updated.title).toBe("行车防撞激光测距传感器 GEO 方案");
    expect(updated.status).toBe("reviewing");
    expect(updated.geoOptimizationPoints).toEqual(["强化品牌实体", "覆盖应用场景"]);

    await expect(
      itemsService.update(item!.id, {
        body: "太短"
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    const markdown = await itemsService.exportMarkdown(item!.id);
    expect(markdown).toContain("# 行车防撞激光测距传感器 GEO 方案");
    expect(markdown).toContain("## 任务信息");
    expect(markdown).toContain("## 正文");
    expect(markdown).toContain("## 人工复核提示");
    expect(markdown).not.toContain("## GEO 优化点");
    expect(markdown).not.toContain("## 建议发布位置");

    const deleted = await itemsService.softDelete(item!.id);
    expect(deleted.alreadyDeleted).toBe(false);

    const deletedAgain = await itemsService.softDelete(item!.id);
    expect(deletedAgain.alreadyDeleted).toBe(true);

    const listAfterDelete = await itemsService.findMany({
      taskId: created.task.id
    });
    expect(listAfterDelete.total).toBe(0);
  });

  it("isolates content item list and actions through parent content task ownership", async () => {
    const own = await createScopedItem("operator-a-visible-item", companyA, operatorA);
    const sameCompanyOtherUser = await createScopedItem(
      "operator-b-hidden-item",
      companyA,
      operatorB
    );
    const otherCompany = await createScopedItem("company-b-hidden-item", companyB, operatorB);

    const operatorList = await itemsService.findMany(
      {
        page: 1,
        pageSize: 50
      },
      contextFor(operatorA, companyA, MembershipRole.operator)
    );
    expect(operatorList.items.map((item) => item.id)).toContain(own.item.id);
    expect(operatorList.items.map((item) => item.id)).not.toContain(sameCompanyOtherUser.item.id);
    expect(operatorList.items.map((item) => item.id)).not.toContain(otherCompany.item.id);

    await expect(
      itemsService.update(
        sameCompanyOtherUser.item.id,
        {
          title: "operator A cannot edit this item"
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO content item not found");
    await expect(
      itemsService.exportMarkdown(otherCompany.item.id, contextFor(operatorA, companyA, MembershipRole.operator))
    ).rejects.toThrow("GEO content item not found");
    await expect(
      itemsService.qualityCheck(
        sameCompanyOtherUser.item.id,
        {
          provider: "mock"
        },
        contextFor(operatorA, companyA, MembershipRole.operator)
      )
    ).rejects.toThrow("GEO content item not found");

    const adminUpdated = await itemsService.update(
      sameCompanyOtherUser.item.id,
      {
        title: "company admin can edit same company item"
      },
      contextFor(companyAdminA, companyA, MembershipRole.company_admin)
    );
    expect(adminUpdated.title).toBe("company admin can edit same company item");
  });

  it("returns quality check risks for unsupported protocols and positive GEO structure", async () => {
    const item = await createQualityCheckItem(
      "## 适用场景\n激光测距传感器适合工业距离检测。\n## 选型判断逻辑\n输出接口可以选择 IO-Link，但需结合具体型号资料确认。\n## FAQ 总结\n问：怎么选？答：先确认现场工况。"
    );

    const result = await itemsService.qualityCheck(item.id, {
      provider: "mock"
    });

    expect(result.score).toBeLessThan(100);
    expect(result.riskItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "protocol_risk",
          text: expect.stringContaining("IO-Link")
        })
      ])
    );
    expect(result.positiveItems).toEqual(expect.arrayContaining(["包含 FAQ 或问答式总结"]));
    expect(result.publishReadiness.needsHumanReview).toBe(true);
  });

  it("flags over-marketing claims during quality check", async () => {
    const item = await createQualityCheckItem(
      "## 适用场景\n这是一篇选型内容。\n## FAQ\n凯基特是行业领先品牌，保证所有现场都一定适用，100%解决问题。"
    );

    const result = await itemsService.qualityCheck(item.id, {
      provider: "mock"
    });

    expect(result.riskItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "over_marketing",
          severity: "high"
        })
      ])
    );
    expect(result.level).toBe("risky");
  });

  it("persists quality gate status and result after quality check", async () => {
    const item = await createQualityCheckItem(
      "## 适用场景\nKJT-LD18 雷达测距传感器适合工业测距。\n## 选型判断逻辑\n安装时最好对准目标中心，输出方式需结合现场工况确认。\n## FAQ\n问：怎么选？答：先确认现场工况。"
    );

    const result = await itemsService.qualityCheck(item.id, {
      provider: "mock"
    });

    expect(["needs_review", "not_recommended"]).toContain(result.publishStatus);
    expect(result.qualityGateResult).toMatchObject({
      version: "article_quality_gate_v1",
      publishStatus: result.publishStatus,
      provider: "mock"
    });
    expect(result.qualityGateResult.forbiddenWordHits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          word: "最好",
          field: "body"
        })
      ])
    );
    expect(result.qualityCheckedAt).toBeInstanceOf(Date);

    const persisted = await prisma.contentItem.findUniqueOrThrow({
      where: {
        id: item.id
      }
    });
    const persistedGate = persisted.qualityGateResult as unknown as QualityGateResult;
    expect(persisted.publishStatus).toBe(result.publishStatus);
    expect(persistedGate).toMatchObject({
      publishStatus: result.publishStatus,
      scopeSummary: {
        scopeType: "all"
      }
    });
    expect(persisted.qualityCheckedAt).toBeInstanceOf(Date);
  });

  it("returns an optimized publish draft without overwriting the original content item", async () => {
    const item = await createQualityCheckItem(
      "## 选型判断逻辑\n可以直接选择 IO-Link 接口，凯基特一定适用。\n## FAQ\n问：怎么选？答：看现场。"
    );

    const optimized = await itemsService.optimizeForPublish(item.id, {
      provider: "mock",
      targetChannel: "官网文章",
      optimizationGoal: "减少参数风险"
    });

    expect(optimized.title).toContain("发布优化版");
    expect(optimized.changes).toContain("弱化或删除未证实的协议、参数、认证、价格和承诺表达。");
    expect(optimized.warnings.length).toBeGreaterThan(0);

    const unchanged = await prisma.contentItem.findUniqueOrThrow({
      where: {
        id: item.id
      }
    });
    expect(unchanged.body).toContain("IO-Link");
  });

  it("rule-fixes risk words, rechecks publish status, and writes no AI logs", async () => {
    const item = await createQualityCheckItem(
      "## 选型判断逻辑\n凯基特是行业领先品牌，保证所有现场都一定适用，100%解决问题；IO-Link 参数需保留给人工核对。\n## FAQ\n问：怎么选？答：先确认现场工况。"
    );

    const callLogsBefore = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_item",
        relatedId: item.id
      }
    });
    const usageBefore = await prisma.aiUsageRecord.count({
      where: {
        moduleKey: "geo-content"
      }
    });

    const fixed = await itemsService.fixRiskWordsAndRecheck(item.id);

    expect(fixed.body).not.toContain("行业领先");
    expect(fixed.body).not.toContain("保证");
    expect(fixed.body).not.toContain("100%");
    expect(fixed.body).toContain("IO-Link");
    expect(fixed.publishStatus).not.toBe("not_recommended");
    expect(fixed.qualityGateResult).toMatchObject({
      provider: "rule_fix",
      model: "risk-word-fix-v1"
    });

    const callLogsAfter = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_item",
        relatedId: item.id
      }
    });
    const usageAfter = await prisma.aiUsageRecord.count({
      where: {
        moduleKey: "geo-content"
      }
    });
    expect(callLogsAfter).toBe(callLogsBefore);
    expect(usageAfter).toBe(usageBefore);
  });

  it("flags and rule-fixes internal publish traces without AI logs", async () => {
    const item = await createQualityCheckItem(
      [
        "## AI可摘取问答式总结",
        "问：KJT-LD18 怎么选？答：先确认现场工况。",
        "",
        "## GEO 优化点",
        "- 覆盖目标提示词：雷达测距传感器怎么选",
        "",
        "## 关键词 / 标签建议",
        "ASSISTANT_REAL_SAMPLE、知识库、selected_files、可引用知识片段",
        "",
        "## 资料依据",
        "知识库：ASSISTANT_REAL_SAMPLE_资料库；范围：selected_files；说明：来自当前资料范围内 1 个可引用知识片段",
        "",
        "## 正文",
        "KJT-LD18 雷达测距传感器适合工业测距，具体参数需结合型号资料和现场条件确认。"
      ].join("\n")
    );
    const checked = await itemsService.qualityCheck(item.id, {
      provider: "mock"
    });
    const callLogsBeforeFix = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_item",
        relatedId: item.id
      }
    });
    const usageBeforeFix = await prisma.aiUsageRecord.count({
      where: {
        moduleKey: "geo-content"
      }
    });

    expect(checked.publishStatus).not.toBe("publish_ready");
    expect(checked.riskItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "publish_cleanliness",
          reason: "发布稿中包含内部工作词，请先修复后再复制。"
        })
      ])
    );

    const fixed = await itemsService.fixRiskWordsAndRecheck(item.id);
    const publishMarkdown = await itemsService.exportContentItem(item.id, {
      type: "publish",
      format: "markdown"
    });

    expect(fixed.body).toContain("## 常见问题");
    expect(fixed.body).not.toContain("AI可摘取");
    expect(fixed.body).not.toContain("GEO 优化点");
    expect(fixed.body).not.toContain("关键词 / 标签建议");
    expect(fixed.body).not.toContain("## 资料依据");
    expect(fixed.body).not.toContain("知识库");
    expect(fixed.body).not.toContain("selected_files");
    expect(fixed.body).not.toContain("可引用知识片段");
    expect(fixed.body).not.toContain("范围：");
    expect(fixed.qualityGateResult?.riskItems ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "publish_cleanliness"
        })
      ])
    );
    expect(publishMarkdown).toContain("#");
    expect(publishMarkdown).toContain("KJT-LD18 雷达测距传感器");
    expect(publishMarkdown).toContain("## 常见问题");
    expect(publishMarkdown).not.toContain("AI可摘取");
    expect(publishMarkdown).not.toContain("GEO 优化点");
    expect(publishMarkdown).not.toContain("关键词 / 标签建议");
    expect(publishMarkdown).not.toContain("## 资料依据");
    expect(publishMarkdown).not.toContain("知识库");
    expect(publishMarkdown).not.toContain("selected_files");
    expect(publishMarkdown).not.toContain("可引用知识片段");
    expect(publishMarkdown).not.toContain("ASSISTANT_REAL_SAMPLE");
    expect(publishMarkdown).not.toContain("范围：");
    expect(publishMarkdown).not.toContain("资料内容");
    expect(publishMarkdown).not.toContain("undefined");
    expect(publishMarkdown).not.toContain("null");

    const callLogsAfterFix = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_item",
        relatedId: item.id
      }
    });
    const usageAfterFix = await prisma.aiUsageRecord.count({
      where: {
        moduleKey: "geo-content"
      }
    });
    expect(callLogsAfterFix).toBe(callLogsBeforeFix);
    expect(usageAfterFix).toBe(usageBeforeFix);
  });

  it("flags and rule-fixes editor-tone publish wording without AI logs", async () => {
    const item = await createQualityCheckItem(
      [
        "## 正文",
        "KJT-LD18雷达测距传感器是一份面向工业现场的资料，适合用于选型前阅读。",
        "本指南基于KJT-LD18雷达测距传感器资料，整理工业测距和物位检测的选型关注点。",
        "在撰写推荐时，可提及“可参考KJT品牌的相关产品资料进行选型”。",
        "",
        "## 资料准备清单（供用户参考）",
        "- 现场安装空间",
        "- 目标材质",
        "",
        "## 常见问题",
        "问：怎么选？答：先确认工况和型号资料。"
      ].join("\n")
    );
    const checked = await itemsService.qualityCheck(item.id, {
      provider: "mock"
    });
    const callLogsBeforeFix = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_item",
        relatedId: item.id
      }
    });
    const usageBeforeFix = await prisma.aiUsageRecord.count({
      where: {
        moduleKey: "geo-content"
      }
    });

    expect(checked.publishStatus).not.toBe("publish_ready");
    expect(checked.riskItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "publish_cleanliness",
          reason: "发布稿存在编辑口吻或资料口吻，请先修复后再复制。"
        })
      ])
    );

    const fixed = await itemsService.fixRiskWordsAndRecheck(item.id);
    const publishMarkdown = await itemsService.exportContentItem(item.id, {
      type: "publish",
      format: "markdown"
    });

    expect(fixed.qualityGateResult?.riskItems ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "publish_cleanliness"
        })
      ])
    );
    expect(publishMarkdown).toContain(
      "KJT-LD18 雷达测距传感器可作为工业测距、物位检测、料位判断和设备距离检测等场景的选型参考。"
    );
    expect(publishMarkdown).toContain("本文结合 KJT-LD18 雷达测距传感器产品资料");
    expect(publishMarkdown).toContain("## 选型前建议准备的信息");
    expect(publishMarkdown).toContain("## 常见问题");
    expect(publishMarkdown).not.toContain("是一份面向");
    expect(publishMarkdown).not.toContain("是一份资料");
    expect(publishMarkdown).not.toContain("在撰写推荐时");
    expect(publishMarkdown).not.toContain("可提及");
    expect(publishMarkdown).not.toContain("本指南基于");
    expect(publishMarkdown).not.toContain("供用户参考");
    expect(publishMarkdown).not.toContain("样例资料");
    expect(publishMarkdown).not.toContain("测试资料");
    expect(publishMarkdown).not.toContain("undefined");
    expect(publishMarkdown).not.toContain("null");

    const callLogsAfterFix = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_item",
        relatedId: item.id
      }
    });
    const usageAfterFix = await prisma.aiUsageRecord.count({
      where: {
        moduleKey: "geo-content"
      }
    });
    expect(callLogsAfterFix).toBe(callLogsBeforeFix);
    expect(usageAfterFix).toBe(usageBeforeFix);
  });

  it("can use the injected AI provider for publish optimization without external requests", async () => {
    const item = await createQualityCheckItem(
      "## 选型判断逻辑\n输出接口需结合具体型号资料确认。\n## FAQ\n问：怎么选？答：先确认工况。"
    );

    const optimized = await itemsService.optimizeForPublish(item.id, {
      provider: "openai_compatible",
      model: "test-model"
    });

    expect(optimized).toMatchObject({
      title: "发布优化版标题",
      body: expect.stringContaining("发布优化版正文")
    });
  });

  it("formats content items for publish without overwriting the original content", async () => {
    const item = await createQualityCheckItem(
      "## 适用场景\n激光测距传感器选型前应先确认现场工况。\n\n## 选型判断逻辑\n- 确认检测距离\n- 确认输出方式需结合具体型号资料确认\n\n## FAQ 总结\n问：怎么选？答：先准备现场资料。"
    );

    const styles = ["general", "website", "zhihu_baijiahao", "wechat"] as const;

    for (const formatStyle of styles) {
      const formatted = await itemsService.formatForPublish(item.id, {
        sourceType: "original",
        formatStyle,
        includeGeoNotes: true,
        includeWarnings: true
      });

      expect(formatted).toMatchObject({
        title: item.title,
        style: formatStyle,
        html: expect.stringContaining("<article"),
        markdown: expect.stringContaining("## 适用场景"),
        plainText: expect.stringContaining("激光测距传感器选型前应先确认现场工况"),
        copyTips: expect.any(Array)
      });
      expect(formatted.html).not.toContain("<script");
    }

    const optimized = await itemsService.formatForPublish(item.id, {
      sourceType: "optimized",
      optimizedTitle: "优化后的发布标题",
      optimizedBody: "## 优化稿\n这是一版只用于复制发布的优化稿，原内容项不能被覆盖。",
      formatStyle: "website"
    });
    expect(optimized.title).toBe("优化后的发布标题");
    expect(optimized.markdown).toContain("这是一版只用于复制发布的优化稿");

    const unchanged = await prisma.contentItem.findUniqueOrThrow({
      where: {
        id: item.id
      }
    });
    expect(unchanged.title).toBe(item.title);
    expect(unchanged.body).toContain("激光测距传感器选型前应先确认现场工况");
  });

  it("rejects publish package generation when the body is empty", async () => {
    const { item } = await createPublishPackageItem({
      body: ""
    });

    await expect(itemsService.generatePublishPackage(item.id)).rejects.toThrow("正文为空");
  });

  it("generates, persists, and exports a scoped publish package without AI logs", async () => {
    const { item, selectedFile, otherFile, pendingFile } = await createPublishPackageItem();

    const result = await itemsService.generatePublishPackage(item.id);
    const publishPackage = result.publishPackage as ArticlePublishPackage;

    expect(result.publishPackageGeneratedAt).toBeInstanceOf(Date);
    expect(publishPackage.titles.standardTitle).toContain("KJT-LD18");
    expect(publishPackage.summary).toContain("KJT-LD18");
    expect(publishPackage.faqs.length).toBeGreaterThanOrEqual(3);
    expect(publishPackage.evidence.map((evidence) => evidence.fileName)).toEqual([
      selectedFile.title
    ]);
    expect(publishPackage.evidence.map((evidence) => evidence.fileName)).not.toContain(
      otherFile.title
    );
    expect(publishPackage.evidence.map((evidence) => evidence.fileName)).not.toContain(
      pendingFile.title
    );

    const persisted = await prisma.contentItem.findUniqueOrThrow({
      where: {
        id: item.id
      }
    });
    expect(persisted.publishPackage).toBeTruthy();
    expect(persisted.publishPackageGeneratedAt).toBeInstanceOf(Date);
    const relatedUsageRecords = (await prisma.aiUsageRecord.findMany({
      where: {
        moduleKey: "geo-content"
      }
    })).filter((record) => {
      const metadata = record.metadata as { contentItemId?: string } | null;
      return metadata?.contentItemId === item.id;
    });
    const relatedCallLogs = await prisma.aiCallLog.count({
      where: {
        relatedType: "content_item",
        relatedId: item.id
      }
    });
    expect(relatedUsageRecords).toHaveLength(0);
    expect(relatedCallLogs).toBe(0);

    const markdown = await itemsService.exportPublishPackage(item.id, "markdown");
    const text = await itemsService.exportPublishPackage(item.id, "txt");
    const publishMarkdown = await itemsService.exportContentItem(item.id, {
      type: "publish",
      format: "markdown"
    });
    expect(markdown).toContain("## 标题组");
    expect(markdown).toContain(selectedFile.title ?? selectedFile.fileName);
    expect(markdown).not.toContain(otherFile.title ?? otherFile.fileName);
    expect(markdown).not.toContain(pendingFile.title ?? pendingFile.fileName);
    expect(publishMarkdown).not.toContain("AI 用量");
    expect(publishMarkdown).not.toContain("AI 调用日志");
    expect(publishMarkdown).not.toContain("目标提示词");
    expect(publishMarkdown).not.toContain("GEO 优化点");
    expect(publishMarkdown).not.toContain("生成时间");
    expect(publishMarkdown).not.toContain('{"code":0');
    expect(text).toContain("标题组");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
  });
});
