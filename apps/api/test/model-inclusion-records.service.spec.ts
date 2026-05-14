import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeoPromptType, RecordMethod, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ModelInclusionRecordsService } from "../src/modules/model-inclusion/model-inclusion-records.service";
import {
  classifyProviderError,
  KimiProviderError,
  KimiWebSearchProvider
} from "../src/modules/model-inclusion/providers/kimi-web-search.provider";
import { AliyunBailianWebSearchProvider } from "../src/modules/model-inclusion/providers/aliyun-bailian-web-search.provider";
import { VolcengineWebSearchProvider } from "../src/modules/model-inclusion/providers/volcengine-web-search.provider";
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
  let volcengineProvider: {
    search: ReturnType<typeof vi.fn>;
  };
  let aliyunProvider: {
    search: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    kimiProvider = {
      search: vi.fn()
    };
    volcengineProvider = {
      search: vi.fn()
    };
    aliyunProvider = {
      search: vi.fn()
    };
    service = new ModelInclusionRecordsService(
      prisma as unknown as PrismaService,
      kimiProvider as unknown as KimiWebSearchProvider,
      volcengineProvider as unknown as VolcengineWebSearchProvider,
      aliyunProvider as unknown as AliyunBailianWebSearchProvider
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
    volcengineProvider.search.mockReset();
    aliyunProvider.search.mockReset();
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
      promptText: "激光测距传感器怎么选？",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });

    const firstRequestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    const firstUserMessage = firstRequestBody.messages.find((item) => item.role === "user");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(firstUserMessage?.content).toContain("目标品牌：凯基特");
    expect(firstUserMessage?.content).toContain("企业名称：凯基特");
    expect(firstUserMessage?.content).toContain("官网域名：kjtchina.com");
    expect(firstUserMessage?.content).toContain("GEO 是系统检测任务名称，不是品牌名");
    expect(result.finalAnswer).toContain("海伯森");
    expect(result.searchResultId).toBe("search_123");
    expect(result.toolCalls[0]).toMatchObject({
      name: "$web_search",
      searchResultId: "search_123"
    });
    expect(result.searchResults).toEqual([{ searchId: "search_123" }]);
  });

  it("returns a clear Volcengine Web Search error when the API key is missing", async () => {
    const provider = new VolcengineWebSearchProvider(
      new ConfigService({
        VOLCENGINE_WEB_SEARCH_RESPONSES_URL: "https://ark.cn-beijing.volces.com/api/v3/responses",
        VOLCENGINE_WEB_SEARCH_MODEL: "doubao-test-model"
      })
    );

    await expect(
      provider.search({
        promptText: "激光测距传感器怎么选？"
      })
    ).rejects.toThrow("VOLCENGINE_WEB_SEARCH_API_KEY is not configured");
  });

  it("extracts a Volcengine Responses API answer from output_text and saves web_search_call evidence", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: "resp_ark_1",
          output_text: "联网搜索后，凯基特激光测距传感器适合工业现场测距。",
          output: [
            {
              id: "ws_1",
              type: "web_search_call",
              status: "completed"
            },
            {
              id: "msg_1",
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "联网搜索后，凯基特激光测距传感器适合工业现场测距。"
                }
              ]
            }
          ]
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new VolcengineWebSearchProvider(
      new ConfigService({
        VOLCENGINE_WEB_SEARCH_API_KEY: "test-key-not-real",
        VOLCENGINE_WEB_SEARCH_RESPONSES_URL: "https://ark.cn-beijing.volces.com/api/v3/responses",
        VOLCENGINE_WEB_SEARCH_MODEL: "doubao-test-model",
        VOLCENGINE_WEB_SEARCH_TIMEOUT_MS: "1000"
      })
    );

    const result = await provider.search({
      promptText: "激光测距传感器怎么选？"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.finalAnswer).toContain("凯基特");
    expect(result.searchResults).toEqual([
      expect.objectContaining({
        webSearchCallId: "ws_1",
        type: "web_search_call",
        status: "completed"
      })
    ]);
    expect(result.citations).toEqual([]);
    expect(result.retryCount).toBe(0);
  });

  it("extracts a Volcengine answer from output message content when output_text is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: "resp_ark_2",
          output: [
            {
              id: "msg_1",
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "凯基特在行车防撞场景中可作为激光测距方案候选。"
                }
              ]
            }
          ]
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new VolcengineWebSearchProvider(
      new ConfigService({
        VOLCENGINE_WEB_SEARCH_API_KEY: "test-key-not-real",
        VOLCENGINE_WEB_SEARCH_RESPONSES_URL: "https://ark.cn-beijing.volces.com/api/v3/responses",
        VOLCENGINE_WEB_SEARCH_MODEL: "doubao-test-model",
        VOLCENGINE_WEB_SEARCH_TIMEOUT_MS: "1000"
      })
    );

    const result = await provider.search({
      promptText: "行车防撞用什么激光测距传感器？"
    });

    expect(result.finalAnswer).toContain("凯基特");
    expect(result.searchResults).toEqual([]);
  });

  it("keeps partial Volcengine answers when the response is incomplete because of length", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: "resp_ark_incomplete",
          status: "incomplete",
          incomplete_details: {
            reason: "length"
          },
          output_text: "凯基特激光测距传感器可用于工业现场，但回答被截断。"
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new VolcengineWebSearchProvider(
      new ConfigService({
        VOLCENGINE_WEB_SEARCH_API_KEY: "test-key-not-real",
        VOLCENGINE_WEB_SEARCH_RESPONSES_URL: "https://ark.cn-beijing.volces.com/api/v3/responses",
        VOLCENGINE_WEB_SEARCH_MODEL: "doubao-test-model",
        VOLCENGINE_WEB_SEARCH_TIMEOUT_MS: "1000"
      })
    );

    const result = await provider.search({
      promptText: "工业现场激光测距传感器厂家推荐"
    });

    expect(result.finalAnswer).toContain("凯基特");
    expect(result.rawAnswer).toMatch(/^\[Volcengine response incomplete:length\]/);
    expect(result.retryCount).toBe(0);
  });

  it("uses Volcengine defaults for timeout, max output tokens, and short-answer prompts", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: "resp_ark_defaults",
          output_text: "ok"
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    try {
      const provider = new VolcengineWebSearchProvider(
        new ConfigService({
          VOLCENGINE_WEB_SEARCH_API_KEY: "test-key-not-real",
          VOLCENGINE_WEB_SEARCH_RESPONSES_URL: "https://ark.cn-beijing.volces.com/api/v3/responses",
          VOLCENGINE_WEB_SEARCH_MODEL: "doubao-test-model"
        })
      );

      await provider.search({
        promptText: "激光测距传感器怎么选？",
        brandName: "凯基特",
        companyName: "凯基特",
        websiteUrl: "https://www.kjtchina.com"
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
        input: string;
        max_output_tokens: number;
      };
      expect(requestBody.max_output_tokens).toBe(1200);
      expect(requestBody.input).toContain("激光测距传感器怎么选？");
      expect(requestBody.input).toContain("300 字以内");
      expect(requestBody.input).toContain("不要生成长篇");
      expect(requestBody.input).toContain("不要输出复杂表格");
      expect(requestBody.input).toContain("如果没有找到品牌或官网");
      expect(requestBody.input).toContain("目标品牌：凯基特");
      expect(requestBody.input).toContain("企业名称：凯基特");
      expect(requestBody.input).toContain("官网域名：kjtchina.com");
      expect(requestBody.input).toContain("GEO 是系统检测任务名称，不是品牌名");
      expect(requestBody.input).toContain("请判断联网搜索结果中是否提到目标品牌");
      expect(requestBody.input).toContain("请判断是否引用目标官网");
      expect(requestBody.input).toContain("请判断是否推荐目标品牌");
      expect(requestBody.input).toContain("请判断是否出现竞品");
      expect(requestBody.input).toContain("未提及目标品牌");
      expect(requestBody.input).toContain("不要把“GEO”写成品牌");
      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 180000);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it("classifies Volcengine web_search_call-only responses as incomplete output", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: "resp_ark_search_only",
          status: "incomplete",
          incomplete_details: {
            reason: "length"
          },
          output: [
            {
              id: "ws_only",
              type: "web_search_call",
              status: "completed"
            }
          ]
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new VolcengineWebSearchProvider(
      new ConfigService({
        VOLCENGINE_WEB_SEARCH_API_KEY: "test-key-not-real",
        VOLCENGINE_WEB_SEARCH_RESPONSES_URL: "https://ark.cn-beijing.volces.com/api/v3/responses",
        VOLCENGINE_WEB_SEARCH_MODEL: "doubao-test-model",
        VOLCENGINE_WEB_SEARCH_TIMEOUT_MS: "1000"
      })
    );

    await expect(
      provider.search({
        promptText: "激光测距传感器怎么选？"
      })
    ).rejects.toMatchObject({
      category: "provider_incomplete_output",
      retryCount: 0,
      searchResults: [
        expect.objectContaining({
          webSearchCallId: "ws_only",
          type: "web_search_call",
          status: "completed"
        })
      ]
    });
  });

  it("returns a clear Aliyun Bailian Web Search error when the API key is missing", async () => {
    const provider = new AliyunBailianWebSearchProvider(
      new ConfigService({
        ALIYUN_BAILIAN_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        ALIYUN_BAILIAN_MODEL: "qwen3-max",
        ALIYUN_BAILIAN_WEB_SEARCH_ENABLED: "true",
        ALIYUN_BAILIAN_FORCE_SEARCH: "true"
      })
    );

    await expect(
      provider.search({
        promptText: "激光测距传感器怎么选？"
      })
    ).rejects.toThrow("ALIYUN_BAILIAN_API_KEY is not configured");
  });

  it("extracts an Aliyun Bailian answer and sends forced web-search parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "联网搜索后，凯基特激光测距传感器被提及，但未返回结构化引用来源。"
              }
            }
          ]
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    try {
      const provider = new AliyunBailianWebSearchProvider(
        new ConfigService({
          ALIYUN_BAILIAN_API_KEY: "test-key-not-real",
          ALIYUN_BAILIAN_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          ALIYUN_BAILIAN_MODEL: "qwen3-max",
          ALIYUN_BAILIAN_WEB_SEARCH_ENABLED: "true",
          ALIYUN_BAILIAN_FORCE_SEARCH: "true"
        })
      );

      const result = await provider.search({
        promptText: "激光测距传感器怎么选？",
        brandName: "凯基特",
        companyName: "凯基特",
        websiteUrl: "https://www.kjtchina.com"
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
        enable_search: boolean;
        search_options?: {
          forced_search?: boolean;
        };
        messages: Array<{ role: string; content: string }>;
      };
      const userMessage = requestBody.messages.find((item) => item.role === "user");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(requestBody.enable_search).toBe(true);
      expect(requestBody.search_options?.forced_search).toBe(true);
      expect(userMessage?.content).toContain("目标品牌：凯基特");
      expect(userMessage?.content).toContain("企业名称：凯基特");
      expect(userMessage?.content).toContain("官网域名：kjtchina.com");
      expect(userMessage?.content).toContain("GEO 是系统检测概念，不是品牌名");
      expect(result.finalAnswer).toContain("凯基特");
      expect(result.citations).toEqual([]);
      expect(result.searchResults).toEqual([]);
      expect(result.retryCount).toBe(0);
      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 120000);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it("uses 120000ms as the default Kimi Web Search timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: "ok"
              }
            }
          ]
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    try {
      const provider = new KimiWebSearchProvider(
        new ConfigService({
          KIMI_API_KEY: "test-key-not-real",
          KIMI_BASE_URL: "https://api.moonshot.cn/v1",
          KIMI_MODEL: "kimi-k2.6",
          KIMI_WEB_SEARCH_ENABLED: "true",
          KIMI_WEB_SEARCH_TOOL_NAME: "$web_search"
        })
      );

      await provider.search({
        promptText: "激光测距传感器怎么选？"
      });

      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 120000);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it("classifies provider errors for retry and user-facing messages", () => {
    expect(classifyProviderError(new Error("Kimi Web Search request timed out."))).toBe(
      "network_timeout"
    );
    expect(classifyProviderError(new TypeError("fetch failed"))).toBe("network_fetch_failed");
    expect(
      classifyProviderError(Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }))
    ).toBe("network_connection_reset");
    expect(classifyProviderError(new Error("invalid api key"))).toBe("provider_auth_error");
    expect(classifyProviderError(new Error("insufficient balance"))).toBe(
      "provider_insufficient_balance"
    );
    expect(classifyProviderError(new Error("model not found"))).toBe("provider_model_error");
    expect(classifyProviderError(new Error("web_search tool unavailable"))).toBe(
      "provider_tool_error"
    );
  });

  it("retries fetch failed once and returns retry metadata when the retry succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
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
                      id: "call_search_retry_1",
                      type: "function",
                      function: {
                        name: "$web_search",
                        arguments:
                          '{"search_result":{"search_id":"retry_search_1"},"usage":{"total_tokens":32}}'
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
                  content: "重试后联网搜索成功，提到了海伯森。"
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
        KIMI_TIMEOUT_MS: "1000",
        KIMI_RETRY_DELAY_MS: "1"
      })
    );

    const result = await provider.search({
      promptText: "激光测距传感器怎么选？"
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.retryCount).toBe(1);
    expect(result.finalAnswer).toContain("重试后联网搜索成功");
  });

  it("retries timeout-like errors once", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }))
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "timeout retry ok"
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
        KIMI_TIMEOUT_MS: "1000",
        KIMI_RETRY_DELAY_MS: "1"
      })
    );

    const result = await provider.search({
      promptText: "激光测距传感器怎么选？"
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.retryCount).toBe(1);
  });

  it("does not retry provider auth or bad request errors", async () => {
    const authFetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: {
            type: "invalid_auth",
            message: "invalid api key"
          }
        })
    });
    vi.stubGlobal("fetch", authFetchMock);
    const provider = new KimiWebSearchProvider(
      new ConfigService({
        KIMI_API_KEY: "test-key-not-real",
        KIMI_BASE_URL: "https://api.moonshot.cn/v1",
        KIMI_MODEL: "kimi-k2.6",
        KIMI_WEB_SEARCH_ENABLED: "true",
        KIMI_WEB_SEARCH_TOOL_NAME: "$web_search",
        KIMI_TIMEOUT_MS: "1000",
        KIMI_RETRY_DELAY_MS: "1"
      })
    );

    await expect(
      provider.search({
        promptText: "激光测距传感器怎么选？"
      })
    ).rejects.toMatchObject({
      category: "provider_auth_error",
      retryCount: 0
    });
    expect(authFetchMock).toHaveBeenCalledTimes(1);

    const badRequestFetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: {
            type: "invalid_request_error",
            message: "invalid temperature"
          }
        })
    });
    vi.stubGlobal("fetch", badRequestFetchMock);

    await expect(
      provider.search({
        promptText: "激光测距传感器怎么选？"
      })
    ).rejects.toMatchObject({
      category: "provider_bad_request",
      retryCount: 0
    });
    expect(badRequestFetchMock).toHaveBeenCalledTimes(1);
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

  it("does not treat GEO as the target brand during GEO hit analysis", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "激光测距传感器怎么选？",
      answer: "联网搜索结果提到了 GEO 检测任务，但未出现凯基特或其官网。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });

    expect(result).toMatchObject({
      brandMentioned: false,
      brandRecommended: false,
      citedOfficialSite: false,
      hitLevel: "not_mentioned"
    });
  });

  it("treats official site mentions in the raw answer as citation hits", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "激光测距传感器怎么选？",
      answer: "回答引用目标官网资料：https://www.kjtchina.com/show-1020.html 。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });

    expect(result).toMatchObject({
      citedOfficialSite: true,
      hitLevel: "cited"
    });
  });

  it("treats explicit citation URLs as official site citation hits", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "行车防撞用什么激光测距传感器",
      answer: "回答引用了目标官网来源，但没有推荐目标品牌。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com",
      citations: [
        {
          title: "智能激光行车防撞系统",
          url: "https://www.kjtchina.com/show-1020.html"
        }
      ]
    });

    expect(result).toMatchObject({
      citedOfficialSite: true,
      hitLevel: "cited"
    });
  });

  it("does not treat search results alone as official site citations", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "行车防撞用什么激光测距传感器",
      answer: "未提及目标品牌。未推荐目标品牌。出现竞品。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com",
      searchResults: [
        {
          title: "凯基特官网候选",
          url: "https://www.kjtchina.com/show-1020.html"
        }
      ]
    });

    expect(result).toMatchObject({
      citedOfficialSite: false,
      hitLevel: "not_mentioned"
    });
  });

  it("does not treat search query echoes as official site citations", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "行车防撞用什么激光测距传感器",
      answer: "未提及目标品牌。未引用目标官网。未推荐目标品牌。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com",
      searchResults: [
        {
          type: "web_search_call",
          rawOutputSummary: '{"action":{"query":"kjtchina.com 激光测距传感器 行车防撞 品牌 推荐"}}'
        }
      ]
    });

    expect(result).toMatchObject({
      citedOfficialSite: false,
      hitLevel: "not_mentioned"
    });
  });

  it("lets explicit official-site denial override citation candidates", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "行车防撞用什么激光测距传感器",
      answer: "未提及目标品牌。未引用目标官网。未推荐目标品牌。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com",
      citations: [
        {
          title: "智能激光行车防撞系统",
          url: "https://www.kjtchina.com/show-1020.html"
        }
      ]
    });

    expect(result).toMatchObject({
      citedOfficialSite: false,
      hitLevel: "not_mentioned"
    });
  });

  it("does not count negated official-site text as a citation hit", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "行车防撞用什么激光测距传感器",
      answer: "未引用目标官网 kjtchina.com，未提及目标品牌。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });

    expect(result).toMatchObject({
      citedOfficialSite: false,
      hitLevel: "not_mentioned"
    });
  });

  it("re-derives competitor-only hit level when official-site citation is negated", () => {
    const result = analyzeGeoHitFromAnswer({
      promptText: "行车防撞用什么激光测距传感器",
      answer: "未引用目标官网。西克被提及为行车防撞方案。",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com",
      knownCompetitors: ["西克"],
      citations: [
        {
          title: "智能激光行车防撞系统",
          url: "https://www.kjtchina.com/show-1020.html"
        }
      ]
    });

    expect(result).toMatchObject({
      citedOfficialSite: false,
      competitorMentioned: true,
      hitLevel: "competitor_only"
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
      searchResults: [{ searchId: "search_record_1" }],
      retryCount: 0
    });
  });

  it("runs Volcengine web-search checks and stores Doubao/Volcengine GEO hit fields", async () => {
    const prompt = await createGeoPrompt("火山方舟联网检测提示词");
    volcengineProvider.search.mockResolvedValue({
      finalAnswer:
        "联网搜索后，凯基特激光测距传感器适合工业现场检测，可参考官网 https://www.kjtchina.com 。",
      rawAnswer:
        "联网搜索后，凯基特激光测距传感器适合工业现场检测，可参考官网 https://www.kjtchina.com 。",
      citations: [],
      searchResults: [
        {
          webSearchCallId: "ws_volc_1",
          status: "completed",
          type: "web_search_call"
        }
      ],
      retryCount: 0
    });

    const result = await service.webSearchCheck({
      geoPromptIds: [prompt.id],
      provider: "volcengine_web_search",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });

    expect(result).toMatchObject({
      provider: "volcengine_web_search",
      successCount: 1,
      failedCount: 0
    });
    expect(result.createdItems[0]).toMatchObject({
      geoPromptId: prompt.id,
      model: "doubao-seed-1-6-250615",
      platform: "豆包 / 火山方舟",
      entryPoint: "web_search_api",
      detectionMethod: "web_search",
      deviceType: "api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      recordMethod: RecordMethod.api,
      brandMentioned: true,
      citedOfficialSite: true,
      hitLevel: "mentioned",
      searchResults: [
        {
          webSearchCallId: "ws_volc_1",
          status: "completed",
          type: "web_search_call"
        }
      ],
      retryCount: 0
    });
    expect(volcengineProvider.search).toHaveBeenCalledWith({
      promptText: prompt.promptText,
      model: "doubao-seed-1-6-250615",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });
  });

  it("runs Aliyun Bailian web-search checks and stores Tongyi GEO hit fields", async () => {
    const prompt = await createGeoPrompt("百炼联网检测提示词");
    aliyunProvider.search.mockResolvedValue({
      finalAnswer:
        "通义联网搜索后，凯基特激光测距传感器被提及，官网正文包含 https://www.kjtchina.com 。",
      rawAnswer:
        "通义联网搜索后，凯基特激光测距传感器被提及，官网正文包含 https://www.kjtchina.com 。",
      citations: [],
      searchResults: [],
      retryCount: 0
    });

    const result = await service.webSearchCheck({
      geoPromptIds: [prompt.id],
      provider: "aliyun_bailian_web_search",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });

    expect(result).toMatchObject({
      provider: "aliyun_bailian_web_search",
      successCount: 1,
      failedCount: 0
    });
    expect(result.createdItems[0]).toMatchObject({
      geoPromptId: prompt.id,
      model: "qwen3-max",
      platform: "通义千问 / 阿里云百炼",
      entryPoint: "web_search_api",
      detectionMethod: "web_search",
      deviceType: "api",
      isWebSearchEnabled: true,
      isLoggedIn: false,
      recordMethod: RecordMethod.api,
      brandMentioned: true,
      brandRecommended: false,
      citedOfficialSite: true,
      hitLevel: "mentioned",
      citations: [],
      searchResults: [],
      retryCount: 0
    });
    expect(aliyunProvider.search).toHaveBeenCalledWith({
      promptText: prompt.promptText,
      model: "qwen3-max",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });
  });

  it("keeps Aliyun Bailian negative target-brand answers as not mentioned", async () => {
    const prompt = await createGeoPrompt("百炼未提及目标品牌提示词");
    aliyunProvider.search.mockResolvedValue({
      finalAnswer: "联网搜索后，未提及目标品牌。未引用目标官网。主要出现其他厂家。",
      rawAnswer: "联网搜索后，未提及目标品牌。未引用目标官网。主要出现其他厂家。",
      citations: [],
      searchResults: [],
      retryCount: 0
    });

    const result = await service.webSearchCheck({
      geoPromptIds: [prompt.id],
      provider: "aliyun_bailian_web_search",
      brandName: "凯基特",
      companyName: "凯基特",
      websiteUrl: "https://www.kjtchina.com"
    });

    expect(result.createdItems[0]).toMatchObject({
      brandMentioned: false,
      brandRecommended: false,
      citedOfficialSite: false,
      hitLevel: "not_mentioned"
    });
  });

  it("stores Volcengine web_search_call evidence when incomplete output fails the check", async () => {
    const prompt = await createGeoPrompt("火山方舟只返回搜索调用提示词");
    const searchResults = [
      {
        webSearchCallId: "ws_volc_incomplete",
        status: "completed",
        type: "web_search_call"
      }
    ];
    const providerError = Object.assign(
      new KimiProviderError(
        "火山 Web Search 已触发搜索，但未返回最终回答，建议提高 max_output_tokens 或缩短输出要求。",
        "provider_incomplete_output",
        0
      ),
      {
        searchResults
      }
    );
    volcengineProvider.search.mockRejectedValueOnce(providerError);

    const result = await service.webSearchCheck({
      geoPromptIds: [prompt.id],
      provider: "volcengine_web_search",
      brandName: "凯基特"
    });

    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.failedItems[0]).toMatchObject({
      geoPromptId: prompt.id,
      errorCategory: "provider_incomplete_output",
      retryCount: 0,
      errorMessage:
        "[provider_incomplete_output] 火山 Web Search 已触发搜索，但未返回最终回答，建议提高 max_output_tokens 或缩短输出要求。"
    });
    expect(result.failedItems[0]?.record).toMatchObject({
      hitLevel: "unclear",
      errorCategory: "provider_incomplete_output",
      retryCount: 0,
      searchResults
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
      errorCategory: "network_timeout",
      retryCount: 0,
      errorMessage: "[network_timeout] Kimi Web Search timeout"
    });
    expect(result.failedItems[0]?.record).toMatchObject({
      hitLevel: "unclear",
      errorCategory: "network_timeout",
      retryCount: 0
    });
  });

  it("stores retry metadata when a retried provider failure still fails", async () => {
    const prompt = await createGeoPrompt("Kimi 重试失败记录提示词");
    kimiProvider.search.mockRejectedValueOnce(
      new KimiProviderError("Kimi Web Search request timed out.", "network_timeout", 1)
    );

    const result = await service.webSearchCheck({
      geoPromptIds: [prompt.id],
      provider: "kimi_web_search",
      brandName: "海伯森"
    });

    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.failedItems[0]).toMatchObject({
      geoPromptId: prompt.id,
      retryCount: 1,
      errorCategory: "network_timeout",
      errorMessage: "[network_timeout] Kimi Web Search request timed out."
    });
    expect(result.failedItems[0]?.record).toMatchObject({
      geoPromptId: prompt.id,
      hitLevel: "unclear",
      retryCount: 1,
      errorCategory: "network_timeout",
      errorMessage: "[network_timeout] Kimi Web Search request timed out."
    });
  });
});
