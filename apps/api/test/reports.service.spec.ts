import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  MembershipStatus,
  RecordMethod,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ReportsService } from "../src/modules/geo-reports/reports.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ReportsService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ReportsService;
  let createdBy: string;
  let otherCreatedBy: string;
  let reportContext: ResourceAccessContext;
  let productLine: string;
  let promptWithContentId: string;
  let promptWithoutRecordId: string;
  let promptNotMentionedId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new ReportsService(prisma as unknown as PrismaService);

    const company = await prisma.company.create({
      data: {
        name: `Reports Company A ${runId}`,
        code: `reports-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    const otherCompany = await prisma.company.create({
      data: {
        name: `Reports Company B ${runId}`,
        code: `reports-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `reports-service-${runId}@example.com`,
        name: "Phase 2I GEO Reports Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active,
        memberships: {
          create: {
            companyId: company.id,
            role: MembershipRole.operator,
            status: MembershipStatus.active,
            isDefault: true
          }
        }
      }
    });
    createdBy = user.id;
    const otherUser = await prisma.user.create({
      data: {
        email: `reports-service-other-${runId}@example.com`,
        name: "Phase 4F Other Company Operator",
        role: UserRole.operator,
        status: UserStatus.active,
        memberships: {
          create: {
            companyId: otherCompany.id,
            role: MembershipRole.operator,
            status: MembershipStatus.active,
            isDefault: true
          }
        }
      }
    });
    otherCreatedBy = otherUser.id;
    reportContext = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isPlatformAdmin: false
      },
      currentCompany: {
        id: company.id,
        name: company.name,
        code: company.code,
        role: MembershipRole.operator,
        isDefault: true,
        status: company.status
      },
      currentMembership: {
        companyId: company.id,
        role: MembershipRole.operator,
        isDefault: true,
        isPlatformAdmin: false
      }
    };
    productLine = `Phase 2I 激光测距传感器 ${runId}`;

    await seedReportData();
    await seedOtherCompanyNoise(otherCompany.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createPrompt(
    label: string,
    data: {
      type: GeoPromptType;
      userIntent: UserIntent;
      priority: number;
      trackEnabled: boolean;
      latestCoverageStatus?: string;
    }
  ) {
    return prisma.geoPrompt.create({
      data: {
        type: data.type,
        baseWord: "激光测距传感器",
        promptText: `Phase 2I ${label} ${runId}`,
        productLine,
        scenario: "GEO 报表测试",
        userIntent: data.userIntent,
        priority: data.priority,
        trackEnabled: data.trackEnabled,
        latestCoverageStatus: data.latestCoverageStatus,
        visibility: Visibility.COMPANY,
        company: {
          connect: {
            id: reportContext.currentCompany.id
          }
        },
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  async function seedReportData() {
    const basePrompt = await createPrompt("训练词", {
      type: GeoPromptType.base,
      userIntent: UserIntent.selection,
      priority: 5,
      trackEnabled: true,
      latestCoverageStatus: "recommended"
    });
    const distilledPrompt = await createPrompt("蒸馏词", {
      type: GeoPromptType.distilled,
      userIntent: UserIntent.selection,
      priority: 5,
      trackEnabled: true
    });
    const brandPrompt = await createPrompt("品牌词", {
      type: GeoPromptType.brand,
      userIntent: UserIntent.brand_verification,
      priority: 4,
      trackEnabled: true,
      latestCoverageStatus: "not_mentioned"
    });
    const scenePrompt = await createPrompt("场景词", {
      type: GeoPromptType.scene,
      userIntent: UserIntent.application_solution,
      priority: 2,
      trackEnabled: false
    });
    promptWithContentId = basePrompt.id;
    promptWithoutRecordId = distilledPrompt.id;
    promptNotMentionedId = brandPrompt.id;

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: `Phase 2I 知识库 ${runId}`,
        productLine,
        description: "报表测试知识库",
        visibility: Visibility.COMPANY,
        company: {
          connect: {
            id: reportContext.currentCompany.id
          }
        },
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    await prisma.knowledgeFile.create({
      data: {
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        fileName: "phase-2i.md",
        fileType: "md",
        fileSize: 128,
        parseStatus: "succeeded",
        company: {
          connect: {
            id: reportContext.currentCompany.id
          }
        },
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
        title: "选型资料",
        content: "激光测距传感器用于行车防撞，需要关注量程、响应速度和抗干扰能力。",
        sourceType: "pasted_text",
        productLine,
        materialType: "solution",
        tags: ["报表"],
        company: {
          connect: {
            id: reportContext.currentCompany.id
          }
        }
      }
    });

    const task = await prisma.contentTask.create({
      data: {
        name: `Phase 2I 内容任务 ${runId}`,
        productLine,
        generationType: "selection_guide",
        targetModel: "deepseek-chat",
        status: TaskStatus.succeeded,
        provider: "mock",
        model: "mock-content-v1",
        company: {
          connect: {
            id: reportContext.currentCompany.id
          }
        },
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
    await prisma.contentItem.create({
      data: {
        task: {
          connect: {
            id: task.id
          }
        },
        geoPrompt: {
          connect: {
            id: basePrompt.id
          }
        },
        title: "Phase 2I 选型指南",
        body: "围绕 GEO 提示词生成的选型指南内容。",
        geoOptimizationPoints: ["覆盖目标提示词"],
        suggestedPublishChannel: "官网知识库",
        status: "draft",
        company: {
          connect: {
            id: reportContext.currentCompany.id
          }
        }
      }
    });
    await prisma.contentTask.create({
      data: {
        name: `Phase 2I 失败内容任务 ${runId}`,
        productLine,
        generationType: "faq",
        targetModel: "deepseek-chat",
        status: TaskStatus.failed,
        provider: "mock",
        model: "mock-content-v1",
        company: {
          connect: {
            id: reportContext.currentCompany.id
          }
        },
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    await prisma.modelInclusionRecord.createMany({
      data: [
        {
          geoPromptId: basePrompt.id,
          model: "deepseek-chat",
          checkedAt: new Date("2026-05-13T02:00:00.000Z"),
          brandMentioned: true,
          brandRecommended: true,
          rankingPosition: 1,
          citedOfficialSite: true,
          citedContentAsset: true,
          competitorMentioned: false,
          hitLevel: "recommended",
          platform: "DeepSeek",
          entryPoint: "api_model",
          isWebSearchEnabled: false,
          isLoggedIn: false,
          answerSummary: "品牌被提及且推荐。",
          competitors: ["竞品A"],
          recordMethod: RecordMethod.manual,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        },
        {
          geoPromptId: brandPrompt.id,
          model: "deepseek-chat",
          checkedAt: new Date("2026-05-13T03:00:00.000Z"),
          brandMentioned: false,
          brandRecommended: false,
          citedOfficialSite: false,
          citedContentAsset: false,
          competitorMentioned: true,
          hitLevel: "competitor_only",
          platform: "Kimi",
          entryPoint: "web_pc",
          isWebSearchEnabled: false,
          isLoggedIn: true,
          answerSummary: "品牌未被提及。",
          competitors: ["竞品B"],
          recordMethod: RecordMethod.manual,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        },
        {
          geoPromptId: scenePrompt.id,
          model: "kimi-k2",
          checkedAt: new Date("2026-05-01T03:00:00.000Z"),
          brandMentioned: true,
          brandRecommended: false,
          citedOfficialSite: false,
          citedContentAsset: false,
          competitorMentioned: false,
          hitLevel: "mentioned",
          platform: "Kimi",
          entryPoint: "api_model",
          isWebSearchEnabled: false,
          isLoggedIn: false,
          answerSummary: "旧记录用于日期筛选。",
          competitors: [],
          recordMethod: RecordMethod.import,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        }
      ]
    });
  }

  async function seedOtherCompanyNoise(companyId: string) {
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.base,
        baseWord: "激光测距传感器",
        promptText: `Phase 4F 其他公司提示词 ${runId}`,
        productLine,
        scenario: "跨公司隔离噪声",
        userIntent: UserIntent.selection,
        priority: 5,
        trackEnabled: true,
        visibility: Visibility.COMPANY,
        company: {
          connect: {
            id: companyId
          }
        },
        createdBy: {
          connect: {
            id: otherCreatedBy
          }
        }
      }
    });

    await prisma.modelInclusionRecord.create({
      data: {
        geoPromptId: prompt.id,
        model: "deepseek-chat",
        checkedAt: new Date("2026-05-13T04:00:00.000Z"),
        brandMentioned: true,
        brandRecommended: true,
        rankingPosition: 1,
        citedOfficialSite: true,
        citedContentAsset: false,
        competitorMentioned: false,
        hitLevel: "recommended",
        platform: "DeepSeek",
        entryPoint: "api_model",
        isWebSearchEnabled: false,
        isLoggedIn: false,
        answerSummary: "其他公司记录，不应进入当前公司报表。",
        competitors: [],
        recordMethod: RecordMethod.manual,
        companyId,
        createdById: otherCreatedBy
      }
    });

    const task = await prisma.contentTask.create({
      data: {
        name: `Phase 4F 其他公司内容任务 ${runId}`,
        productLine,
        generationType: "faq",
        targetModel: "deepseek-chat",
        status: TaskStatus.failed,
        provider: "mock",
        model: "mock-content-v1",
        company: {
          connect: {
            id: companyId
          }
        },
        createdBy: {
          connect: {
            id: otherCreatedBy
          }
        }
      }
    });

    await prisma.contentItem.create({
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
        title: "其他公司内容项",
        body: "不应进入当前公司报表。",
        status: "draft",
        company: {
          connect: {
            id: companyId
          }
        }
      }
    });
  }

  it("returns GEO overview asset and effect metrics", async () => {
    const overview = await service.getGeoOverview({
      productLine,
      model: "deepseek-chat",
      from: new Date("2026-05-13T00:00:00.000Z"),
      to: new Date("2026-05-13T23:59:59.999Z")
    }, reportContext);

    expect(overview.promptTotal).toBe(4);
    expect(overview.basePromptCount).toBe(1);
    expect(overview.distilledPromptCount).toBe(1);
    expect(overview.brandPromptCount).toBe(1);
    expect(overview.scenePromptCount).toBe(1);
    expect(overview.trackedPromptCount).toBe(3);
    expect(overview.highPriorityPromptCount).toBe(3);
    expect(overview.knowledgeBaseCount).toBe(1);
    expect(overview.knowledgeChunkCount).toBe(1);
    expect(overview.contentTaskCount).toBe(2);
    expect(overview.contentItemCount).toBe(1);
    expect(overview.modelInclusionRecordCount).toBe(2);
    expect(overview.brandMentionedCount).toBe(1);
    expect(overview.brandRecommendedCount).toBe(1);
    expect(overview.brandMentionRate).toBeCloseTo(0.5, 5);
    expect(overview.brandRecommendRate).toBeCloseTo(0.5, 5);
    expect(overview.citedOfficialSiteCount).toBe(1);
    expect(overview.citedContentAssetCount).toBe(1);
    expect(overview.competitorMentionedCount).toBe(1);
    expect(overview.uncoveredTrackedPromptCount).toBe(1);
    expect(overview.failedContentTaskCount).toBe(1);
  });

  it("returns prompt coverage distributions and uncovered prompts", async () => {
    const report = await service.getPromptCoverage({
      productLine,
      model: "deepseek-chat",
      trackEnabled: true
    }, reportContext);

    expect(report.totalPrompts).toBe(3);
    expect(report.trackedPrompts).toBe(3);
    expect(report.promptsWithRecords).toBe(2);
    expect(report.promptsWithoutRecords).toBe(1);
    expect(report.coverageRate).toBeCloseTo(2 / 3, 5);
    expect(report.byType).toMatchObject({
      base: 1,
      distilled: 1,
      brand: 1
    });
    expect(report.byLatestCoverageStatus.not_mentioned).toBe(1);
    expect(report.highPriorityUncoveredPrompts[0]?.geoPromptId).toBe(promptWithoutRecordId);
  });

  it("returns model coverage rates and not-mentioned prompts", async () => {
    const report = await service.getModelCoverage({
      productLine,
      model: "deepseek-chat",
      from: new Date("2026-05-13T00:00:00.000Z")
    }, reportContext);

    expect(report.totalRecords).toBe(2);
    expect(report.modelDistribution).toMatchObject({
      "deepseek-chat": 2
    });
    expect(report.hitLevelDistribution).toMatchObject({
      recommended: 1,
      competitor_only: 1
    });
    expect(report.entryPointDistribution).toMatchObject({
      api_model: 1,
      web_pc: 1
    });
    expect(report.platformDistribution).toMatchObject({
      DeepSeek: 1,
      Kimi: 1
    });
    expect(report.citedContentAssetByModel["deepseek-chat"]).toBe(1);
    expect(report.competitorMentionedByModel["deepseek-chat"]).toBe(1);
    expect(report.mentionedByModel["deepseek-chat"]).toBe(1);
    expect(report.recommendedByModel["deepseek-chat"]).toBe(1);
    expect(report.brandMentionRateByModel["deepseek-chat"]).toBeCloseTo(0.5, 5);
    expect(report.brandRecommendRateByModel["deepseek-chat"]).toBeCloseTo(0.5, 5);
    expect(report.topRecommendedPrompts[0]?.geoPromptId).toBe(promptWithContentId);
    expect(report.notMentionedPrompts[0]?.geoPromptId).toBe(promptNotMentionedId);
  });

  it("returns GEO hit summary using the latest prompt/platform/entryPoint result", async () => {
    const summaryProductLine = `Phase Summary GEO 命中汇总 ${runId}`;
    const promptA = await createPrompt("汇总部分命中", {
      type: GeoPromptType.distilled,
      userIntent: UserIntent.selection,
      priority: 5,
      trackEnabled: true
    });
    const promptB = await createPrompt("汇总全未命中", {
      type: GeoPromptType.scene,
      userIntent: UserIntent.application_solution,
      priority: 5,
      trackEnabled: true
    });
    const promptC = await createPrompt("汇总未检测", {
      type: GeoPromptType.brand,
      userIntent: UserIntent.brand_verification,
      priority: 5,
      trackEnabled: true
    });
    await prisma.geoPrompt.updateMany({
      where: {
        id: {
          in: [promptA.id, promptB.id, promptC.id]
        }
      },
      data: {
        productLine: summaryProductLine
      }
    });

    await prisma.modelInclusionRecord.createMany({
      data: [
        {
          geoPromptId: promptA.id,
          model: "kimi-old",
          checkedAt: new Date("2026-05-14T01:00:00.000Z"),
          brandMentioned: false,
          brandRecommended: false,
          citedOfficialSite: false,
          citedContentAsset: false,
          competitorMentioned: false,
          hitLevel: "not_mentioned",
          platform: "Kimi",
          entryPoint: "web_search_api",
          isWebSearchEnabled: true,
          isLoggedIn: false,
          answerSummary: "旧记录未命中。",
          competitors: [],
          recordMethod: RecordMethod.api,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        },
        {
          geoPromptId: promptA.id,
          model: "kimi-new",
          checkedAt: new Date("2026-05-14T02:00:00.000Z"),
          brandMentioned: true,
          brandRecommended: true,
          citedOfficialSite: false,
          citedContentAsset: false,
          competitorMentioned: false,
          hitLevel: "recommended",
          platform: "Kimi",
          entryPoint: "web_search_api",
          isWebSearchEnabled: true,
          isLoggedIn: false,
          answerSummary: "最新记录推荐品牌。",
          competitors: [],
          recordMethod: RecordMethod.api,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        },
        {
          geoPromptId: promptA.id,
          model: "doubao",
          checkedAt: new Date("2026-05-14T02:30:00.000Z"),
          brandMentioned: false,
          brandRecommended: false,
          citedOfficialSite: false,
          citedContentAsset: false,
          competitorMentioned: false,
          hitLevel: "not_mentioned",
          platform: "豆包 / 火山方舟",
          entryPoint: "web_search_api",
          isWebSearchEnabled: true,
          isLoggedIn: false,
          answerSummary: "火山未命中。",
          competitors: [],
          recordMethod: RecordMethod.api,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        },
        {
          geoPromptId: promptB.id,
          model: "kimi",
          checkedAt: new Date("2026-05-14T03:00:00.000Z"),
          brandMentioned: false,
          brandRecommended: false,
          citedOfficialSite: false,
          citedContentAsset: false,
          competitorMentioned: false,
          hitLevel: "not_mentioned",
          platform: "Kimi",
          entryPoint: "web_search_api",
          isWebSearchEnabled: true,
          isLoggedIn: false,
          answerSummary: "Kimi 未命中。",
          competitors: [],
          recordMethod: RecordMethod.api,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        },
        {
          geoPromptId: promptB.id,
          model: "bailian",
          checkedAt: new Date("2026-05-14T03:30:00.000Z"),
          brandMentioned: false,
          brandRecommended: false,
          citedOfficialSite: false,
          citedContentAsset: false,
          competitorMentioned: false,
          hitLevel: "not_mentioned",
          platform: "通义千问 / 阿里云百炼",
          entryPoint: "web_search_api",
          isWebSearchEnabled: true,
          isLoggedIn: false,
          answerSummary: "百炼未命中。",
          competitors: [],
          recordMethod: RecordMethod.api,
          companyId: reportContext.currentCompany.id,
          createdById: createdBy
        }
      ]
    });

    const report = await service.getGeoHitSummary({
      productLine: summaryProductLine,
      latestOnly: true,
      trackEnabled: true
    }, reportContext);

    expect(report.overview).toMatchObject({
      promptCount: 3,
      checkedPromptCount: 2,
      recordCount: 5,
      latestRecordCount: 4,
      brandMentionedCount: 1,
      brandRecommendedCount: 1,
      notMentionedCount: 3
    });
    expect(report.overview.brandMentionRate).toBeCloseTo(1 / 4, 5);
    expect(report.platformComparison.find((item) => item.platform === "Kimi")).toMatchObject({
      recordCount: 2,
      brandMentionRate: 0.5,
      brandRecommendRate: 0.5
    });
    expect(report.promptMatrix.find((item) => item.geoPromptId === promptA.id)).toMatchObject({
      overallStatus: "partial_hit"
    });
    expect(report.promptMatrix.find((item) => item.geoPromptId === promptB.id)).toMatchObject({
      overallStatus: "not_mentioned"
    });
    expect(report.promptMatrix.find((item) => item.geoPromptId === promptC.id)).toMatchObject({
      overallStatus: "unchecked"
    });
    expect(
      report.optimizationSuggestions.some(
        (item) => item.type === "not_mentioned" && item.promptText === promptB.promptText
      )
    ).toBe(true);
  });

  it("returns content and knowledge coverage reports", async () => {
    const content = await service.getContentCoverage({
      productLine
    }, reportContext);
    expect(content.contentTaskCount).toBe(2);
    expect(content.contentItemCount).toBe(1);
    expect(content.succeededTaskCount).toBe(1);
    expect(content.failedTaskCount).toBe(1);
    expect(content.contentItemsByGenerationType.selection_guide).toBe(1);
    expect(content.promptsWithContent).toBe(1);
    expect(content.promptsWithoutContent).toBe(3);
    expect(content.highPriorityPromptsWithoutContent[0]?.geoPromptId).toBe(promptWithoutRecordId);

    const knowledge = await service.getKnowledgeCoverage({
      productLine,
      materialType: "solution"
    }, reportContext);
    expect(knowledge.knowledgeBaseCount).toBe(1);
    expect(knowledge.knowledgeFileCount).toBe(1);
    expect(knowledge.knowledgeChunkCount).toBe(1);
    expect(knowledge.chunksByMaterialType.solution).toBe(1);
    expect(knowledge.filesByParseStatus.succeeded).toBe(1);
  });

  it("returns optimization suggestions and CSV export", async () => {
    const suggestions = await service.getOptimizationSuggestions({
      productLine,
      model: "deepseek-chat",
      priority: 4,
      limit: 20
    }, reportContext);

    expect(suggestions.items.some((item) => item.type === "prompt_without_record")).toBe(true);
    expect(suggestions.items.some((item) => item.type === "prompt_not_mentioned")).toBe(true);
    expect(suggestions.items.some((item) => item.type === "prompt_without_content")).toBe(true);
    expect(suggestions.items.some((item) => item.type === "failed_content_task")).toBe(true);

    const csv = await service.exportReport({
      reportType: "prompt_coverage",
      productLine,
      model: "deepseek-chat"
    }, reportContext);
    expect(csv).toContain("metric,value");
    expect(csv).toContain("coverageRate");
  });
});
