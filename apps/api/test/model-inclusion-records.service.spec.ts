import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeoPromptType, RecordMethod, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ModelInclusionRecordsService } from "../src/modules/model-inclusion/model-inclusion-records.service";
import { KimiWebSearchProvider } from "../src/modules/model-inclusion/providers/kimi-web-search.provider";
import { analyzeGeoHitFromAnswer } from "../src/modules/model-inclusion/utils/analyze-geo-hit.util";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("ModelInclusionRecordsService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: ModelInclusionRecordsService;
  let createdBy: string;
  let kimiProvider: {
    search: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    kimiProvider = {
      search: vi.fn()
    };
    service = new ModelInclusionRecordsService(
      prisma as unknown as PrismaService,
      kimiProvider as unknown as KimiWebSearchProvider
    );

    const user = await prisma.user.create({
      data: {
        email: `model-inclusion-service-${runId}@example.com`,
        name: "Phase 2H GEO Model Inclusion Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    kimiProvider.search.mockReset();
  });

  function unique(label: string): string {
    return `Phase 2H ${label} ${runId}`;
  }

  async function createGeoPrompt(
    label: string,
    options: {
      productLine?: string;
      type?: GeoPromptType;
      userIntent?: UserIntent;
      trackEnabled?: boolean;
      latestCoverageStatus?: string;
    } = {}
  ) {
    return prisma.geoPrompt.create({
      data: {
        type: options.type ?? GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: options.productLine ?? unique("产品线"),
        scenario: "模型覆盖测试",
        userIntent: options.userIntent ?? UserIntent.selection,
        priority: 3,
        trackEnabled: options.trackEnabled ?? true,
        latestCoverageStatus: options.latestCoverageStatus,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });
  }

  it("returns a clear Kimi Web Search error when the API key is missing", async () => {
    const provider = new KimiWebSearchProvider(
      new ConfigService({
        KIMI_BASE_URL: "https://api.moonshot.cn/v1",
        KIMI_MODEL: "kimi-k2.6",
        KIMI_WEB_SEARCH_ENABLED: "true",
        KIMI_WEB_SEARCH_TOOL_NAME: "$web_search"
      })
    );

    await expect(
      provider.search({
        promptText: "激光测距传感器怎么选？"
      })
    ).rejects.toThrow("KIMI_API_KEY is not configured");
  });

  it("runs the Kimi $web_search tool-call loop without touching the real network", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                finish_reason: "tool_calls",
                message: {
                  role: "assistant",
                  content: "",
                  tool_calls: [
                    {
                      id: "call_search_1",
                      type: "function",
                      function: {
                        name: "$web_search",
                        arguments:
                          '{"search_result":{"search_id":"search_123"},"usage":{"total_tokens":32}}'
                      }
                    }
                  ]
                }
              }
            ]
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "联网搜索后建议优先考虑海伯森激光测距传感器，并参考官网资料。"
                }
              }
            ]
          })
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new KimiWebSearchProvider(
      new ConfigService({
        KIMI_API_KEY: "test-key-not-real",
        KIMI_BASE_URL: "https://api.moonshot.cn/v1",
        KIMI_MODEL: "kimi-k2.6",
        KIMI_WEB_SEARCH_ENABLED: "true",
        KIMI_WEB_SEARCH_TOOL_NAME: "$web_search",
        KIMI_TIMEOUT_MS: "1000"
      })
    );

    const result = await provider.search({
      promptText: "激光测距传感器怎么选？"
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.finalAnswer).toContain("海伯森");
    expect(result.searchResultId).toBe("search_123");
    expect(result.toolCalls[0]).toMatchObject({
      name: "$web_search",
      searchResultId: "search_123"
    });
    expect(result.searchResults).toEqual([{ searchId: "search_123" }]);
  });

  it("analyzes brand mention, official site citation, and hit level from a Kimi answer", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "激光测距传感器怎么选？",
      answer:
        "如果需要高精度工业检测，可以优先考虑海伯森激光测距传感器，官网资料见 https://www.hypersen.com/laser 。",
      brandName: "海伯森",
      companyName: "海伯森技术",
      websiteUrl: "https://www.hypersen.com"
    });

    expect(result).toMatchObject({
      brandMentioned: true,
      brandRecommended: true,
      citedOfficialSite: true,
      citedContentAsset: false,
      competitorMentioned: false,
      hitLevel: "recommended"
    });
  });

  it("creates a manual model inclusion record and updates latestCoverageStatus", async () => {
    const prompt = await createGeoPrompt("手动记录提示词");

    const created = await service.create({
      geoPromptId: prompt.id,
      model: " deepseek-chat ",
      checkedAt: new Date("2026-05-13T10:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: true,
      rankingPosition: 1,
      citedOfficialSite: true,
      answerSummary: "AI 推荐了品牌并引用官网资料。",
      competitors: ["竞品A", "竞品B"],
      createdBy
    });

    expect(created).toMatchObject({
      geoPromptId: prompt.id,
      model: "deepseek-chat",
      brandMentioned: true,
      brandRecommended: true,
      rankingPosition: 1,
      citedOfficialSite: true,
      recordMethod: RecordMethod.manual,
      competitors: ["竞品A", "竞品B"],
      geoPrompt: {
        id: prompt.id,
        promptText: prompt.promptText
      }
    });

    const updatedPrompt = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: prompt.id
      }
    });
    expect(updatedPrompt.latestCoverageStatus).toBe("recommended");
  });

  it("derives recommended hit level and preserves multi-entry GEO hit fields", async () => {
    const prompt = await createGeoPrompt("多入口推荐命中提示词");

    const created = await service.create({
      geoPromptId: prompt.id,
      model: "qwen-plus",
      platform: "通义",
      entryPoint: "web_search_api",
      detectionMethod: "web_search",
      deviceType: "api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      brandMentioned: true,
      brandRecommended: true,
      citedOfficialSite: true,
      citedContentAsset: true,
      competitorMentioned: true,
      rankingPosition: 1,
      answerSummary: "联网搜索回答推荐了品牌并引用官网与内容资产。",
      rawAnswer: "原始回答：推荐 A 品牌，并引用官网资料。",
      citations: [{ title: "官网方案", url: "https://example.com/solution" }],
      searchResults: [{ title: "选型指南", url: "https://example.com/guide" }],
      screenshotPath: "screenshots/tongyi-web-search.png",
      errorMessage: " ",
      createdBy
    });

    expect(created).toMatchObject({
      geoPromptId: prompt.id,
      platform: "通义",
      entryPoint: "web_search_api",
      detectionMethod: "web_search",
      deviceType: "api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      citedContentAsset: true,
      competitorMentioned: true,
      hitLevel: "recommended",
      rawAnswer: "原始回答：推荐 A 品牌，并引用官网资料。",
      citations: [{ title: "官网方案", url: "https://example.com/solution" }],
      searchResults: [{ title: "选型指南", url: "https://example.com/guide" }],
      screenshotPath: "screenshots/tongyi-web-search.png"
    });
    expect(created.errorMessage).toBeUndefined();
  });

  it("derives mentioned, cited, competitor_only, and not_mentioned hit levels", async () => {
    const mentionedPrompt = await createGeoPrompt("提及命中提示词");
    const citedPrompt = await createGeoPrompt("引用命中提示词");
    const competitorPrompt = await createGeoPrompt("竞品命中提示词");
    const notMentionedPrompt = await createGeoPrompt("未命中提示词");

    const mentioned = await service.create({
      geoPromptId: mentionedPrompt.id,
      model: "kimi-k2",
      brandMentioned: true,
      createdBy
    });
    const cited = await service.create({
      geoPromptId: citedPrompt.id,
      model: "perplexity-sonar",
      citedContentAsset: true,
      createdBy
    });
    const competitorOnly = await service.create({
      geoPromptId: competitorPrompt.id,
      model: "doubao",
      brandMentioned: false,
      competitorMentioned: true,
      competitors: ["竞品A"],
      createdBy
    });
    const notMentioned = await service.create({
      geoPromptId: notMentionedPrompt.id,
      model: "deepseek-chat",
      brandMentioned: false,
      brandRecommended: false,
      citedOfficialSite: false,
      citedContentAsset: false,
      competitorMentioned: false,
      createdBy
    });

    expect(mentioned.hitLevel).toBe("mentioned");
    expect(cited.hitLevel).toBe("cited");
    expect(competitorOnly.hitLevel).toBe("competitor_only");
    expect(notMentioned.hitLevel).toBe("not_mentioned");
  });

  it("rejects missing prompts, empty models, and invalid ranking positions", async () => {
    await expect(
      service.create({
        geoPromptId: "missing-geo-prompt",
        model: "deepseek-chat",
        createdBy
      })
    ).rejects.toThrow("GEO prompt not found or deleted");

    const prompt = await createGeoPrompt("校验提示词");
    await expect(
      service.create({
        geoPromptId: prompt.id,
        model: " ",
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({
        geoPromptId: prompt.id,
        model: "deepseek-chat",
        rankingPosition: 0,
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists records with filters and includes GEO prompt information", async () => {
    const productLine = unique("筛选产品线");
    const matchedPrompt = await createGeoPrompt("列表匹配", {
      productLine,
      type: GeoPromptType.brand,
      userIntent: UserIntent.brand_verification
    });
    const otherPrompt = await createGeoPrompt("列表不匹配", {
      productLine: unique("其他产品线"),
      type: GeoPromptType.scene,
      userIntent: UserIntent.application_solution
    });

    await service.create({
      geoPromptId: matchedPrompt.id,
      model: "kimi-k2",
      platform: "Kimi",
      entryPoint: "web_pc",
      detectionMethod: "browser_capture",
      deviceType: "desktop",
      isWebSearchEnabled: false,
      isLoggedIn: true,
      brandMentioned: true,
      brandRecommended: false,
      citedOfficialSite: true,
      citedContentAsset: true,
      competitorMentioned: true,
      hitLevel: "mentioned",
      recordMethod: RecordMethod.api,
      answerSummary: "Kimi 提及品牌但没有推荐。",
      createdBy
    });
    await service.create({
      geoPromptId: otherPrompt.id,
      model: "deepseek-chat",
      brandMentioned: false,
      brandRecommended: false,
      recordMethod: RecordMethod.manual,
      createdBy
    });

    const result = await service.findMany({
      page: 1,
      pageSize: 10,
      model: "kimi-k2",
      brandMentioned: true,
      brandRecommended: false,
      citedOfficialSite: true,
      recordMethod: RecordMethod.api,
      platform: "Kimi",
      entryPoint: "web_pc",
      detectionMethod: "browser_capture",
      deviceType: "desktop",
      isWebSearchEnabled: false,
      isLoggedIn: true,
      citedContentAsset: true,
      competitorMentioned: true,
      hitLevel: "mentioned",
      productLine,
      promptType: GeoPromptType.brand,
      userIntent: UserIntent.brand_verification
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.geoPrompt).toMatchObject({
      id: matchedPrompt.id,
      promptText: matchedPrompt.promptText,
      type: GeoPromptType.brand,
      productLine,
      userIntent: UserIntent.brand_verification
    });
  });

  it("imports rows independently, resolves prompts by promptText, parses booleans, and forces import method", async () => {
    const firstPrompt = await createGeoPrompt("导入提示词A");
    const secondPrompt = await createGeoPrompt("导入提示词B");

    const result = await service.importRecords({
      rows: [
        {
          promptText: firstPrompt.promptText,
          model: "deepseek-chat",
          checkedAt: "2026-05-13T12:00:00.000Z",
          brandMentioned: "是",
          brandRecommended: "yes",
          citedOfficialSite: "1",
          citedContentAsset: "是",
          competitorMentioned: "yes",
          platform: "通义",
          entryPoint: "web_search_api",
          detectionMethod: "web_search",
          deviceType: "api",
          isWebSearchEnabled: "true",
          isLoggedIn: "0",
          rawAnswer: "导入原始回答",
          citations: '[{"title":"官网","url":"https://example.com"}]',
          searchResults: [{ title: "结果", url: "https://example.com/result" }],
          screenshotPath: "screenshots/import.png",
          errorMessage: "",
          rankingPosition: "2",
          answerSummary: "导入行通过 promptText 匹配提示词。",
          competitors: "竞品A,竞品B",
          recordMethod: "manual",
          createdBy
        },
        {
          geoPromptId: secondPrompt.id,
          model: "kimi-k2",
          brandMentioned: "0",
          brandRecommended: "否",
          citedOfficialSite: false,
          competitors: ["竞品C"],
          createdBy
        },
        {
          promptText: unique("不存在提示词"),
          model: "deepseek-chat"
        },
        {
          promptText: firstPrompt.promptText,
          model: " "
        }
      ]
    });

    expect(result.totalRows).toBe(4);
    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(2);
    expect(result.createdItems[0]).toMatchObject({
      geoPromptId: firstPrompt.id,
      brandMentioned: true,
      brandRecommended: true,
      citedOfficialSite: true,
      citedContentAsset: true,
      competitorMentioned: true,
      hitLevel: "recommended",
      platform: "通义",
      entryPoint: "web_search_api",
      detectionMethod: "web_search",
      deviceType: "api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      rawAnswer: "导入原始回答",
      citations: [{ title: "官网", url: "https://example.com" }],
      searchResults: [{ title: "结果", url: "https://example.com/result" }],
      screenshotPath: "screenshots/import.png",
      rankingPosition: 2,
      competitors: ["竞品A", "竞品B"],
      recordMethod: RecordMethod.import
    });
    expect(result.createdItems[1]).toMatchObject({
      geoPromptId: secondPrompt.id,
      brandMentioned: false,
      brandRecommended: false,
      citedOfficialSite: false,
      competitors: ["竞品C"],
      recordMethod: RecordMethod.import
    });
    expect(result.failedRows).toHaveLength(2);
  });

  it("exports CSV, finds uncovered prompts, and calculates summary rates", async () => {
    const productLine = unique("统计产品线");
    const coveredPrompt = await createGeoPrompt("统计已覆盖", {
      productLine,
      trackEnabled: true
    });
    const mentionedPrompt = await createGeoPrompt("统计已提及", {
      productLine,
      trackEnabled: true
    });
    const uncoveredPrompt = await createGeoPrompt("统计未覆盖", {
      productLine,
      trackEnabled: true
    });
    await createGeoPrompt("统计未追踪", {
      productLine,
      trackEnabled: false
    });

    await service.create({
      geoPromptId: coveredPrompt.id,
      model: "summary-model",
      checkedAt: new Date("2026-05-13T08:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: true,
      citedOfficialSite: true,
      citedContentAsset: true,
      competitorMentioned: false,
      platform: "OpenAI",
      entryPoint: "web_search_api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      answerSummary: "品牌被推荐。",
      createdBy
    });
    await service.create({
      geoPromptId: mentionedPrompt.id,
      model: "summary-model",
      checkedAt: new Date("2026-05-13T09:00:00.000Z"),
      brandMentioned: true,
      brandRecommended: false,
      citedOfficialSite: false,
      citedContentAsset: false,
      competitorMentioned: true,
      platform: "Kimi",
      entryPoint: "web_pc",
      isWebSearchEnabled: false,
      isLoggedIn: true,
      answerSummary: "品牌被提及但未推荐。",
      createdBy
    });
    await service.create({
      geoPromptId: coveredPrompt.id,
      model: "summary-model",
      checkedAt: new Date("2026-05-13T10:00:00.000Z"),
      brandMentioned: false,
      brandRecommended: false,
      citedOfficialSite: false,
      citedContentAsset: false,
      competitorMentioned: true,
      platform: "OpenAI",
      entryPoint: "web_search_api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      answerSummary: "最新记录未提及品牌。",
      createdBy
    });

    const csv = await service.exportCsv({
      model: "summary-model",
      productLine
    });
    expect(csv).toContain("geoPromptId,promptText,promptType,productLine,model");
    expect(csv).toContain("platform,entryPoint,detectionMethod,deviceType");
    expect(csv).toContain("hitLevel,rawAnswer,citations,searchResults,screenshotPath,errorMessage");
    expect(csv).toContain(coveredPrompt.promptText);

    const uncovered = await service.findUncoveredPrompts({
      model: "summary-model",
      productLine,
      trackEnabled: true,
      page: 1,
      pageSize: 10
    });
    expect(uncovered.total).toBe(1);
    expect(uncovered.items[0]?.geoPromptId).toBe(uncoveredPrompt.id);

    const summary = await service.getSummary({
      model: "summary-model",
      productLine
    });
    expect(summary.totalRecords).toBe(3);
    expect(summary.mentionedCount).toBe(2);
    expect(summary.notMentionedCount).toBe(1);
    expect(summary.recommendedCount).toBe(1);
    expect(summary.brandMentionRate).toBeCloseTo(2 / 3, 5);
    expect(summary.brandRecommendRate).toBeCloseTo(1 / 3, 5);
    expect(summary.hitLevelDistribution).toMatchObject({
      recommended: 1,
      mentioned: 1,
      competitor_only: 1
    });
    expect(summary.platformDistribution).toMatchObject({
      OpenAI: 2,
      Kimi: 1
    });
    expect(summary.entryPointDistribution).toMatchObject({
      web_search_api: 2,
      web_pc: 1
    });
    expect(summary.webSearchEnabledCount).toBe(2);
    expect(summary.loggedInCount).toBe(1);
    expect(summary.citedContentAssetCount).toBe(1);
    expect(summary.competitorMentionedCount).toBe(2);
    expect(summary.competitorMentionRate).toBeCloseTo(2 / 3, 5);
    expect(summary.citedContentAssetRate).toBeCloseTo(1 / 3, 5);

    const refreshedPrompt = await prisma.geoPrompt.findUniqueOrThrow({
      where: {
        id: coveredPrompt.id
      }
    });
    expect(refreshedPrompt.latestCoverageStatus).toBe("not_mentioned");
  });

  it("runs Kimi web-search checks and stores Monitor-Record-1 fields", async () => {
    const prompt = await createGeoPrompt("Kimi 联网检测提示词");
    kimiProvider.search.mockResolvedValue({
      finalAnswer:
        "联网搜索后，推荐海伯森激光测距传感器用于工业高精度检测。官网参考：https://www.hypersen.com/laser",
      rawAnswer:
        "联网搜索后，推荐海伯森激光测距传感器用于工业高精度检测。官网参考：https://www.hypersen.com/laser",
      toolCalls: [
        {
          id: "call_search_1",
          name: "$web_search",
          arguments: {
            search_result: {
              search_id: "search_record_1"
            }
          },
          searchResultId: "search_record_1"
        }
      ],
      searchResultId: "search_record_1",
      citations: [],
      searchResults: [{ searchId: "search_record_1" }]
    });

    const result = await service.webSearchCheck({
      geoPromptIds: [prompt.id],
      provider: "kimi_web_search",
      brandName: "海伯森",
      companyName: "海伯森技术",
      websiteUrl: "https://www.hypersen.com"
    });

    expect(result).toMatchObject({
      successCount: 1,
      failedCount: 0
    });
    expect(result.createdItems[0]).toMatchObject({
      geoPromptId: prompt.id,
      model: "kimi-k2.6",
      platform: "Kimi",
      entryPoint: "web_search_api",
      detectionMethod: "web_search",
      deviceType: "api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      recordMethod: RecordMethod.api,
      brandMentioned: true,
      brandRecommended: true,
      citedOfficialSite: true,
      citedContentAsset: false,
      competitorMentioned: false,
      hitLevel: "recommended",
      searchResults: [{ searchId: "search_record_1" }]
    });
  });

  it("keeps Kimi web-search batch failures isolated per prompt", async () => {
    const failedPrompt = await createGeoPrompt("Kimi 联网检测失败提示词");
    const passedPrompt = await createGeoPrompt("Kimi 联网检测成功提示词");
    kimiProvider.search
      .mockRejectedValueOnce(new Error("Kimi Web Search timeout"))
      .mockResolvedValueOnce({
        finalAnswer: "海伯森被提及，但没有明确推荐。",
        rawAnswer: "海伯森被提及，但没有明确推荐。",
        toolCalls: [],
        citations: [],
        searchResults: []
      });

    const result = await service.webSearchCheck({
      geoPromptIds: [failedPrompt.id, passedPrompt.id],
      provider: "kimi_web_search",
      brandName: "海伯森"
    });

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.createdItems[0]?.geoPromptId).toBe(passedPrompt.id);
    expect(result.failedItems[0]).toMatchObject({
      geoPromptId: failedPrompt.id,
      promptText: failedPrompt.promptText,
      errorMessage: "Kimi Web Search timeout"
    });
  });
});
