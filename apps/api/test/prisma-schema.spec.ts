import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  MembershipStatus,
  ProductLineStatus,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const prisma = createPrismaClient();
const runId = `${Date.now()}`;

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `phase1-${runId}-${crypto.randomUUID()}@example.com`,
      name: "Phase 1 GEO Operator",
      role: UserRole.geo_operator,
      status: UserStatus.active,
      passwordHash: "scrypt$test-salt$test-hash"
    }
  });
}

describe("Phase 1 Prisma GEO schema", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a GEO analysis task with model results", async () => {
    const user = await createTestUser();

    const task = await prisma.geoAnalysisTask.create({
      data: {
        name: `凯基特品牌 GEO 诊断 ${runId}`,
        brandName: "凯基特",
        websiteUrl: "https://example.com",
        productLine: "激光测距传感器",
        targetModels: ["deepseek-chat"],
        status: TaskStatus.pending,
        contentGaps: ["选型指南"],
        knowledgeGaps: ["行车防撞案例"],
        promptSuggestions: ["激光测距传感器怎么选"],
        createdById: user.id,
        modelResults: {
          create: {
            promptText: "激光测距传感器怎么选",
            model: "deepseek-chat",
            brandMentioned: false,
            brandRecommended: false,
            citedOfficialSite: false,
            competitors: []
          }
        }
      },
      include: {
        modelResults: true
      }
    });

    expect(task.modelResults).toHaveLength(1);
    expect(task.modelResults[0]?.promptText).toBe("激光测距传感器怎么选");
  });

  it("links a GEO knowledge base to files and chunks while allowing chunks without files", async () => {
    const user = await createTestUser();

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: `激光测距传感器知识库 ${runId}`,
        productLine: "激光测距传感器",
        description: "用于验证 Phase 1 知识库关系模型",
        createdById: user.id,
        files: {
          create: {
            fileName: "laser-distance.md",
            fileType: "md",
            fileSize: 128,
            storagePath: "storage/laser-distance.md",
            createdById: user.id
          }
        },
        chunks: {
          create: {
            title: "行车防撞场景",
            content: "行车防撞可以使用激光测距传感器进行距离监测。",
            sourceType: "text",
            productLine: "激光测距传感器",
            materialType: "应用场景",
            tags: ["行车防撞", "GEO"]
          }
        }
      },
      include: {
        files: true,
        chunks: true
      }
    });

    expect(knowledgeBase.files).toHaveLength(1);
    expect(knowledgeBase.chunks).toHaveLength(1);
    expect(knowledgeBase.chunks[0]?.fileId).toBeNull();
  });

  it("links content tasks, content items, prompts, instructions, and model inclusion records", async () => {
    const user = await createTestUser();

    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: `激光测距传感器怎么选 ${runId}`,
        productLine: "激光测距传感器",
        scenario: "选型指南",
        userIntent: UserIntent.selection,
        priority: 1,
        targetModels: ["deepseek-chat"],
        source: "test",
        trackEnabled: true,
        createdById: user.id
      }
    });

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: `内容任务知识库 ${runId}`,
        productLine: "激光测距传感器",
        createdById: user.id
      }
    });

    const instructionTemplate = await prisma.instructionTemplate.create({
      data: {
        name: `选型指南 ${runId}`,
        instructionType: "选型指南",
        contentType: "选型指南",
        targetPromptType: GeoPromptType.distilled,
        targetModel: "deepseek-chat",
        instruction: "生成面向 GEO 的选型指南。",
        outputFormat: "Markdown",
        qualityRules: "必须引用知识库事实。",
        forbiddenRules: "不得编造资质。",
        createdById: user.id
      }
    });

    const contentTask = await prisma.contentTask.create({
      data: {
        name: `激光测距传感器 GEO 内容任务 ${runId}`,
        productLine: "激光测距传感器",
        knowledgeBaseId: knowledgeBase.id,
        instructionTemplateId: instructionTemplate.id,
        generationType: "选型指南",
        targetModel: "deepseek-chat",
        status: TaskStatus.pending,
        provider: "manual",
        model: "manual",
        createdById: user.id,
        contentItems: {
          create: {
            geoPromptId: prompt.id,
            title: "激光测距传感器怎么选",
            body: "围绕选型意图生成的 GEO 内容占位。",
            geoOptimizationPoints: ["品牌实体识别", "场景关联"],
            suggestedPublishChannel: "官网解决方案",
            status: "draft"
          }
        }
      },
      include: {
        knowledgeBase: true,
        instructionTemplate: true,
        contentItems: true
      }
    });

    const inclusionRecord = await prisma.modelInclusionRecord.create({
      data: {
        geoPromptId: prompt.id,
        model: "deepseek-chat",
        brandMentioned: false,
        brandRecommended: false,
        citedOfficialSite: false,
        answerSummary: "测试记录",
        competitors: [],
        createdById: user.id
      }
    });

    expect(contentTask.knowledgeBase?.id).toBe(knowledgeBase.id);
    expect(contentTask.instructionTemplate?.id).toBe(instructionTemplate.id);
    expect(contentTask.contentItems).toHaveLength(1);
    expect(inclusionRecord.geoPromptId).toBe(prompt.id);
  });

  it("supports soft-delete queries for active GEO prompts", async () => {
    const user = await createTestUser();

    const activePrompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.brand,
        baseWord: "激光测距传感器",
        promptText: `凯基特激光测距传感器怎么样 ${runId}`,
        productLine: "激光测距传感器",
        userIntent: UserIntent.brand_verification,
        targetModels: ["deepseek-chat"],
        source: "test",
        createdById: user.id
      }
    });

    await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.brand,
        baseWord: "激光测距传感器",
        promptText: `已删除的凯基特品牌词 ${runId}`,
        productLine: "激光测距传感器",
        userIntent: UserIntent.brand_verification,
        targetModels: ["deepseek-chat"],
        source: "test",
        deletedAt: new Date(),
        createdById: user.id
      }
    });

    const activePrompts = await prisma.geoPrompt.findMany({
      where: {
        createdById: user.id,
        deletedAt: null
      }
    });

    expect(activePrompts.map((prompt) => prompt.id)).toContain(activePrompt.id);
    expect(activePrompts).toHaveLength(1);
  });

  it("stores password hashes on users without storing plaintext passwords", async () => {
    const user = await createTestUser();

    expect(user.passwordHash).toContain("scrypt$");
    expect(user.passwordHash).not.toContain("change_me_admin_password");
  });

  it("links users to companies and product lines while defaulting shared resource visibility", async () => {
    const user = await createTestUser();
    const company = await prisma.company.create({
      data: {
        name: `Auth 2B 测试公司 ${runId}`,
        code: `auth2b-${runId}-${crypto.randomUUID()}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });

    const productLine = await prisma.productLine.create({
      data: {
        companyId: company.id,
        name: "Auth 2B 默认产品线",
        code: `line-${crypto.randomUUID()}`,
        status: ProductLineStatus.active
      }
    });

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: MembershipRole.operator,
        status: MembershipStatus.active,
        isDefault: true
      }
    });

    const prompt = await prisma.geoPrompt.create({
      data: {
        companyId: company.id,
        productLineId: productLine.id,
        type: GeoPromptType.scene,
        baseWord: "激光测距传感器",
        promptText: `Auth 2B 产品线提示词 ${runId}`,
        productLine: productLine.name,
        userIntent: UserIntent.application_solution,
        source: "test",
        createdById: user.id
      }
    });

    expect(membership.companyId).toBe(company.id);
    expect(membership.userId).toBe(user.id);
    expect(prompt.companyId).toBe(company.id);
    expect(prompt.productLineId).toBe(productLine.id);
    expect(prompt.visibility).toBe(Visibility.COMPANY);
  });
});
