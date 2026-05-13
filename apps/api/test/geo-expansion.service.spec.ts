import { BadRequestException } from "@nestjs/common";
import {
  ExpansionMode,
  GeoPromptType,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { GeoExpansionService } from "../src/modules/geo-expansion/geo-expansion.service";
import { generateExpansionCombinations } from "../src/modules/geo-expansion/utils/expansion-combination.util";
import { MockAiExpansionProvider } from "../src/modules/geo-expansion/utils/mock-ai-expansion-provider";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoExpansionService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: GeoExpansionService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new GeoExpansionService(
      prisma as unknown as PrismaService,
      new MockAiExpansionProvider()
    );

    const user = await prisma.user.create({
      data: {
        email: `geo-expansion-service-${runId}@example.com`,
        name: "Phase 2C GEO Expansion Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function uniqueBase(label: string): string {
    return `激光测距传感器${label}${runId}`;
  }

  it("generates all seven GEO rule-expansion combination categories", () => {
    const combinations = generateExpansionCombinations({
      baseWord: "激光测距传感器",
      prefixes: ["国产"],
      serviceSuffixes: ["厂家推荐"],
      applicationSuffixes: ["怎么选"]
    });

    expect(combinations.map((candidate) => candidate.ruleType)).toEqual([
      "prefix_base",
      "base_application",
      "prefix_base_application",
      "base_service",
      "prefix_base_service",
      "base_service_application",
      "prefix_base_service_application"
    ]);
    expect(combinations.map((candidate) => candidate.promptText)).toEqual([
      "国产激光测距传感器",
      "激光测距传感器怎么选",
      "国产激光测距传感器怎么选",
      "激光测距传感器厂家推荐",
      "国产激光测距传感器厂家推荐",
      "激光测距传感器厂家推荐怎么选",
      "国产激光测距传感器厂家推荐怎么选"
    ]);
  });

  it("rule-generate creates a rule expansion job and marks batch and database duplicates", async () => {
    const baseWord = uniqueBase("规则");
    const databaseDuplicatePrompt = `${baseWord}怎么选`;
    await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord,
        promptText: databaseDuplicatePrompt,
        userIntent: UserIntent.selection,
        priority: 3,
        targetModels: [],
        source: "test",
        trackEnabled: false,
        createdById: createdBy
      }
    });

    const result = await service.ruleGenerate({
      baseWord,
      prefixes: ["国产", "国产"],
      serviceSuffixes: ["厂家推荐"],
      applicationSuffixes: ["怎么选"],
      promptType: GeoPromptType.distilled,
      productLine: "激光测距传感器",
      scenario: "选型",
      userIntent: UserIntent.selection,
      createdBy
    });

    expect(result.job.mode).toBe(ExpansionMode.rule);
    expect(result.job.status).toBe(TaskStatus.succeeded);
    expect(result.candidates.length).toBeGreaterThanOrEqual(8);
    expect(result.candidates.some((candidate) => candidate.duplicateInBatch)).toBe(true);
    expect(
      result.candidates.some(
        (candidate) =>
          candidate.promptText === databaseDuplicatePrompt &&
          candidate.duplicateInDatabase &&
          candidate.duplicateReason === "duplicate_in_database"
      )
    ).toBe(true);
  });

  it("ai-generate uses the Mock AI Provider, creates a job, candidates, and ai_call_logs", async () => {
    const baseWord = uniqueBase("AI");
    const result = await service.aiGenerate({
      baseWord,
      promptType: GeoPromptType.scene,
      userIntent: UserIntent.application_solution,
      productLine: "激光测距传感器",
      scenario: "行车防撞",
      count: 4,
      targetModels: ["deepseek-chat"],
      constraints: "聚焦工业场景",
      createdBy
    });

    expect(result.job.mode).toBe(ExpansionMode.ai);
    expect(result.job.provider).toBe("mock");
    expect(result.job.model).toBe("mock-expansion-v1");
    expect(result.candidates).toHaveLength(4);
    expect(result.candidates[0]?.promptText).toContain(baseWord);
    expect(result.candidates.some((candidate) => candidate.promptText.includes("行车防撞"))).toBe(
      true
    );

    const aiLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "expansion_job",
        relatedId: result.job.id,
        provider: "mock",
        model: "mock-expansion-v1"
      }
    });
    expect(aiLog?.status).toBe("succeeded");
  });

  it("mock AI expansion generates user decision questions with generic content directions", async () => {
    const baseWord = uniqueBase("自然问题");
    const result = await service.aiGenerate({
      baseWord,
      promptType: GeoPromptType.distilled,
      count: 6,
      createdBy
    });

    expect(result.candidates).toHaveLength(6);
    expect(result.candidates.every((candidate) => candidate.promptText !== baseWord)).toBe(true);
    expect(
      result.candidates.some((candidate) =>
        /怎么选|应该先|是否适合|要准备|怎么判断/.test(candidate.promptText)
      )
    ).toBe(true);
    expect(result.candidates.map((candidate) => candidate.recommendedContentType)).toEqual(
      expect.arrayContaining(["需求决策指南", "问题诊断与改善建议", "场景解决方案"])
    );
    expect(result.candidates.map((candidate) => candidate.promptText)).not.toContain(
      `${baseWord}厂家推荐`
    );
  });

  it("ai-generate can use an openai_compatible provider without saving candidates directly", async () => {
    const baseWord = uniqueBase("真实Provider");
    const generateText = vi.fn(async () => ({
      text: JSON.stringify({
        candidates: [
          {
            baseWord,
            promptText: `${baseWord}怎么选真实AI建议`,
            userIntent: UserIntent.selection,
            priority: 2,
            recommendedContentType: "selection_guide"
          }
        ]
      }),
      provider: "openai_compatible",
      model: "deepseek-chat",
      tokenInput: 12,
      tokenOutput: 18,
      raw: { id: "chatcmpl-expansion-test" }
    }));
    const providerAwareService = new (GeoExpansionService as unknown as new (
      prisma: PrismaService,
      mockAiProvider: MockAiExpansionProvider,
      aiProviderService: { generateText: typeof generateText },
      projectProfileService: {
        getPromptContext: () => Promise<{
          projectName: string;
          brandName: string;
          industry: string;
          mainProducts: string[];
          targetCustomers: string;
          positioning: string;
          forbiddenClaims: string[];
          targetModels: string[];
          createdAt: Date;
          updatedAt: Date;
          id: string;
        }>;
      }
    ) => GeoExpansionService)(
      prisma as unknown as PrismaService,
      new MockAiExpansionProvider(),
      {
        generateText
      },
      {
        getPromptContext: async () => ({
          id: "project-profile-expansion-test",
          projectName: "通用 GEO 拓词项目",
          brandName: "通用品牌",
          industry: "用户自由填写行业",
          mainProducts: ["产品", "服务", "课程", "门店"],
          targetCustomers: "正在向 AI 提问的潜在用户",
          positioning: "跨行业 GEO 工作台",
          forbiddenClaims: ["不要承诺效果", "不要编造认证"],
          targetModels: ["deepseek", "kimi"],
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    );

    const result = await providerAwareService.aiGenerate({
      baseWord,
      promptType: GeoPromptType.distilled,
      userIntent: UserIntent.selection,
      productLine: "激光测距传感器",
      count: 1,
      provider: "openai_compatible",
      model: "deepseek-chat",
      createdBy
    } as never);

    expect(generateText).toHaveBeenCalledOnce();
    const generateInput = generateText.mock.calls[0]?.[0];
    expect(generateInput?.systemPrompt).toContain("候选词等待人工选择");
    expect(generateInput?.userPrompt).toContain("项目档案 / 品牌上下文");
    expect(generateInput?.userPrompt).toContain("通用 GEO 拓词项目");
    expect(generateInput?.userPrompt).toContain("主营产品 / 服务 / 课程 / 门店 / 个人品牌方向");
    expect(generateInput?.userPrompt).toContain("用户决策场景");
    expect(generateInput?.userPrompt).toContain("需求决策");
    expect(generateInput?.userPrompt).toContain("问题诊断");
    expect(generateInput?.userPrompt).toContain("行动前准备");
    expect(generateInput?.userPrompt).toContain("用户可能会问 AI 的问题");
    expect(generateInput?.userPrompt).toContain("不要生成虚假型号、虚假参数、虚假认证");
    expect(generateInput?.userPrompt).toContain("不得把未提供的型号、参数、价格、认证、案例");
    expect(generateInput?.userPrompt).toContain("recommendedContentType 只能使用");
    expect(generateInput?.userPrompt).toContain("不会直接写入 GEO 提示词库");
    expect(result.job.provider).toBe("openai_compatible");
    expect(result.job.model).toBe("deepseek-chat");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      promptText: `${baseWord}怎么选真实AI建议`,
      selected: false,
      savedPromptId: null
    });

    const savedPrompt = await prisma.geoPrompt.findFirst({
      where: {
        promptText: `${baseWord}怎么选真实AI建议`,
        deletedAt: null
      }
    });
    expect(savedPrompt).toBeNull();

    const aiLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "expansion_job",
        relatedId: result.job.id,
        provider: "openai_compatible",
        model: "deepseek-chat"
      }
    });
    expect(aiLog).toMatchObject({
      status: "succeeded",
      tokenInput: 12,
      tokenOutput: 18
    });
  });

  it("filters low-quality real AI candidates while keeping high-quality user questions", async () => {
    const baseWord = uniqueBase("质量过滤");
    const qualityPrompt = `${baseWord}怎么选才适合当前项目`;
    const preparationPrompt = `使用${baseWord}前需要准备哪些现场信息`;
    const generateText = vi.fn(async () => ({
      text: JSON.stringify({
        candidates: [
          {
            baseWord,
            promptText: baseWord,
            userIntent: UserIntent.selection,
            priority: 1,
            recommendedContentType: "需求决策指南"
          },
          {
            baseWord,
            promptText: "厂家",
            userIntent: UserIntent.manufacturer_recommendation,
            priority: 4,
            recommendedContentType: "信任建立与品牌证明"
          },
          {
            baseWord,
            promptText: `${baseWord}价格`,
            userIntent: UserIntent.purchase,
            priority: 5,
            recommendedContentType: "行动前准备清单"
          },
          {
            baseWord,
            promptText: `${baseWord}一定保证100%有效吗`,
            userIntent: UserIntent.brand_verification,
            priority: 2,
            recommendedContentType: "信任建立与品牌证明"
          },
          {
            baseWord,
            promptText: qualityPrompt,
            userIntent: UserIntent.selection,
            priority: 1,
            recommendedContentType: "需求决策指南"
          },
          {
            baseWord,
            promptText: qualityPrompt,
            userIntent: UserIntent.selection,
            priority: 1,
            recommendedContentType: "需求决策指南"
          },
          {
            baseWord,
            promptText: preparationPrompt,
            userIntent: UserIntent.purchase,
            priority: 2,
            recommendedContentType: "行动前准备清单"
          }
        ]
      }),
      provider: "openai_compatible",
      model: "deepseek-chat",
      tokenInput: 20,
      tokenOutput: 30,
      raw: { id: "chatcmpl-expansion-quality-test" }
    }));
    const providerAwareService = new (GeoExpansionService as unknown as new (
      prisma: PrismaService,
      mockAiProvider: MockAiExpansionProvider,
      aiProviderService: { generateText: typeof generateText }
    ) => GeoExpansionService)(prisma as unknown as PrismaService, new MockAiExpansionProvider(), {
      generateText
    });

    const result = await providerAwareService.aiGenerate({
      baseWord,
      promptType: GeoPromptType.distilled,
      provider: "openai_compatible",
      model: "deepseek-chat",
      count: 7,
      createdBy
    } as never);

    expect(result.candidates.map((candidate) => candidate.promptText)).toEqual([
      qualityPrompt,
      preparationPrompt
    ]);
    expect(result.candidates.map((candidate) => candidate.recommendedContentType)).toEqual([
      "需求决策指南",
      "行动前准备清单"
    ]);

    const autoSavedPrompts = await prisma.geoPrompt.findMany({
      where: {
        promptText: {
          in: [qualityPrompt, preparationPrompt]
        },
        deletedAt: null
      }
    });
    expect(autoSavedPrompts).toHaveLength(0);
  });

  it("rejects real AI expansion when all returned candidates are low quality", async () => {
    const baseWord = uniqueBase("低质全部过滤");
    const generateText = vi.fn(async () => ({
      text: JSON.stringify({
        candidates: [
          {
            baseWord,
            promptText: baseWord,
            userIntent: UserIntent.selection,
            priority: 1,
            recommendedContentType: "需求决策指南"
          },
          {
            baseWord,
            promptText: `${baseWord}价格`,
            userIntent: UserIntent.purchase,
            priority: 5,
            recommendedContentType: "行动前准备清单"
          }
        ]
      }),
      provider: "openai_compatible",
      model: "deepseek-chat"
    }));
    const providerAwareService = new (GeoExpansionService as unknown as new (
      prisma: PrismaService,
      mockAiProvider: MockAiExpansionProvider,
      aiProviderService: { generateText: typeof generateText }
    ) => GeoExpansionService)(prisma as unknown as PrismaService, new MockAiExpansionProvider(), {
      generateText
    });

    await expect(
      providerAwareService.aiGenerate({
        baseWord,
        promptType: GeoPromptType.distilled,
        provider: "openai_compatible",
        model: "deepseek-chat",
        count: 2,
        createdBy
      } as never)
    ).rejects.toThrow("AI 返回内容质量过低，请调整输入或约束后重试");
  });

  it("ai-generate records failed openai_compatible calls without leaking API keys", async () => {
    const generateText = vi.fn(async () => {
      throw new Error("AI Provider 鉴权失败，请检查后端环境变量。");
    });
    const providerAwareService = new (GeoExpansionService as unknown as new (
      prisma: PrismaService,
      mockAiProvider: MockAiExpansionProvider,
      aiProviderService: { generateText: typeof generateText }
    ) => GeoExpansionService)(prisma as unknown as PrismaService, new MockAiExpansionProvider(), {
      generateText
    });

    await expect(
      providerAwareService.aiGenerate({
        baseWord: uniqueBase("真实Provider失败"),
        promptType: GeoPromptType.distilled,
        provider: "openai_compatible",
        model: "deepseek-chat",
        createdBy
      } as never)
    ).rejects.toThrow("AI Provider 鉴权失败");

    const failedLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "expansion_job",
        provider: "openai_compatible",
        model: "deepseek-chat",
        status: "failed"
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    expect(failedLog).toBeTruthy();
    expect(JSON.stringify(failedLog)).not.toContain("sk-test");
  });

  it("rejects base prompt type for AI expansion output", async () => {
    await expect(
      service.aiGenerate({
        baseWord: uniqueBase("base禁止"),
        promptType: GeoPromptType.base,
        count: 3,
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("gets job details with candidates and save status", async () => {
    const generated = await service.ruleGenerate({
      baseWord: uniqueBase("详情"),
      prefixes: ["国产"],
      applicationSuffixes: ["怎么选"],
      promptType: GeoPromptType.distilled,
      createdBy
    });

    const detail = await service.getJob(generated.job.id);

    expect(detail.job.id).toBe(generated.job.id);
    expect(detail.candidates.length).toBe(generated.candidates.length);
    expect(detail.candidates[0]?.saveStatus).toBe("pending");
  });

  it("save-candidates stores selected candidates into geo_prompts and skips duplicates or invalid selections", async () => {
    const generated = await service.ruleGenerate({
      baseWord: uniqueBase("保存"),
      prefixes: ["国产"],
      serviceSuffixes: ["厂家推荐"],
      applicationSuffixes: ["怎么选"],
      promptType: GeoPromptType.distilled,
      productLine: "激光测距传感器",
      userIntent: UserIntent.selection,
      priority: 2,
      createdBy
    });
    const otherJob = await service.ruleGenerate({
      baseWord: uniqueBase("其他任务"),
      prefixes: ["国产"],
      promptType: GeoPromptType.distilled,
      createdBy
    });
    const firstCandidate = generated.candidates[0];
    const secondCandidate = generated.candidates[1];

    if (!firstCandidate || !secondCandidate || !otherJob.candidates[0]) {
      throw new Error("Expected expansion candidates to be generated.");
    }

    await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: generated.job.baseWord,
        promptText: secondCandidate.promptText,
        userIntent: UserIntent.selection,
        priority: 3,
        targetModels: [],
        source: "test",
        trackEnabled: false,
        createdById: createdBy
      }
    });

    const result = await service.saveCandidates(generated.job.id, {
      candidateIds: [
        firstCandidate.id,
        secondCandidate.id,
        otherJob.candidates[0].id,
        "missing-id"
      ],
      defaultProductLine: "默认产品线",
      defaultPriority: 5,
      defaultTrackEnabled: true,
      createdBy
    });

    expect(result.totalSelected).toBe(4);
    expect(result.savedCount).toBe(1);
    expect(result.skippedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateId: secondCandidate.id,
          reason: "duplicate_in_database"
        })
      ])
    );
    expect(result.failedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateId: otherJob.candidates[0].id,
          reason: "candidate_not_in_job"
        }),
        expect.objectContaining({
          candidateId: "missing-id",
          reason: "candidate_not_found"
        })
      ])
    );

    const savedPrompt = await prisma.geoPrompt.findUnique({
      where: {
        id: result.savedItems[0]?.geoPromptId
      }
    });
    expect(savedPrompt?.promptText).toBe(firstCandidate.promptText);
    expect(savedPrompt?.productLine).toBe("默认产品线");
    expect(savedPrompt?.priority).toBe(5);
    expect(savedPrompt?.trackEnabled).toBe(true);

    const idempotent = await service.saveCandidates(generated.job.id, {
      candidateIds: [firstCandidate.id],
      createdBy
    });
    expect(idempotent.savedCount).toBe(0);
    expect(idempotent.skippedItems[0]?.reason).toBe("already_saved");
  });
});
