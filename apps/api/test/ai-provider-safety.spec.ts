import { ForbiddenException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModelInclusionRecordsService } from "../src/modules/model-inclusion/model-inclusion-records.service";
import {
  formatProviderError,
  KimiProviderError,
  KimiWebSearchProvider
} from "../src/modules/model-inclusion/providers/kimi-web-search.provider";
import { AliyunBailianWebSearchProvider } from "../src/modules/model-inclusion/providers/aliyun-bailian-web-search.provider";
import { VolcengineWebSearchProvider } from "../src/modules/model-inclusion/providers/volcengine-web-search.provider";
import { AiUsageService } from "../src/modules/usage/ai-usage.service";
import { sanitizeErrorMessage } from "../src/modules/usage/usage-sanitizer";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
import type { PrismaService } from "../src/prisma/prisma.service";
import { CompanyStatus, MembershipRole, UserRole, UserStatus } from "@prisma/client";

const SECRET_PAYLOAD =
  "Authorization: Bearer sk-test-secret-key DATABASE_URL=postgresql://user:pass@localhost:5432/app JWT_SECRET=jwt-secret password=hunter2";

const createConfigService = (values: Record<string, string | undefined>) =>
  ({
    get: <T = string>(key: string) => values[key] as T | undefined
  }) as ConfigService;

const buildOperatorContext = (): ResourceAccessContext => ({
  user: {
    id: "operator-user-id",
    name: "Operator",
    email: "operator@example.com",
    role: UserRole.operator,
    status: UserStatus.active,
    isPlatformAdmin: false
  },
  currentCompany: {
    id: "company-id",
    name: "测试公司",
    code: "test-company",
    role: MembershipRole.operator,
    isDefault: true,
    status: CompanyStatus.active
  },
  currentMembership: {
    companyId: "company-id",
    role: MembershipRole.operator,
    isDefault: true,
    isPlatformAdmin: false
  }
});

describe("AI provider safety", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("redacts provider errors consistently", () => {
    const sanitized = sanitizeErrorMessage(SECRET_PAYLOAD);
    const formatted = formatProviderError(new KimiProviderError(SECRET_PAYLOAD));

    for (const message of [sanitized, formatted]) {
      expect(message).toBeTruthy();
      expect(message).not.toContain("sk-test-secret-key");
      expect(message).not.toContain("postgresql://user:pass@localhost");
      expect(message).not.toContain("jwt-secret");
      expect(message).not.toContain("hunter2");
      expect(message).toContain("[REDACTED");
    }
  });

  it("redacts Kimi provider response errors before throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: { message: SECRET_PAYLOAD } })
      }))
    );

    const provider = new KimiWebSearchProvider(
      createConfigService({
        KIMI_API_KEY: "sk-test-secret-key",
        KIMI_BASE_URL: "https://api.moonshot.example/v1",
        KIMI_MODEL: "kimi-test",
        KIMI_RETRY_DELAY_MS: "0"
      })
    );

    await expect(provider.search({ promptText: "测试问题" })).rejects.toThrow("[REDACTED");
    await expect(provider.search({ promptText: "测试问题" })).rejects.not.toThrow(
      "sk-test-secret-key"
    );
  });

  it("redacts Volcengine provider response errors before throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: { message: SECRET_PAYLOAD } })
      }))
    );

    const provider = new VolcengineWebSearchProvider(
      createConfigService({
        VOLCENGINE_WEB_SEARCH_API_KEY: "sk-test-secret-key",
        VOLCENGINE_WEB_SEARCH_RESPONSES_URL: "https://ark.example/responses",
        VOLCENGINE_WEB_SEARCH_MODEL: "doubao-test",
        VOLCENGINE_WEB_SEARCH_RETRY_DELAY_MS: "0"
      })
    );

    await expect(provider.search({ promptText: "测试问题" })).rejects.toThrow("[REDACTED");
    await expect(provider.search({ promptText: "测试问题" })).rejects.not.toThrow(
      "sk-test-secret-key"
    );
  });

  it("redacts Aliyun Bailian provider response errors before throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: { message: SECRET_PAYLOAD } })
      }))
    );

    const provider = new AliyunBailianWebSearchProvider(
      createConfigService({
        ALIYUN_BAILIAN_API_KEY: "sk-test-secret-key",
        ALIYUN_BAILIAN_BASE_URL: "https://dashscope.example/compatible-mode/v1",
        ALIYUN_BAILIAN_MODEL: "qwen-test",
        ALIYUN_BAILIAN_RETRY_DELAY_MS: "0"
      })
    );

    await expect(provider.search({ promptText: "测试问题" })).rejects.toThrow("[REDACTED");
    await expect(provider.search({ promptText: "测试问题" })).rejects.not.toThrow(
      "sk-test-secret-key"
    );
  });

  it("does not leak sensitive values when usage recording itself fails", async () => {
    const warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const prisma = {
      aiUsageRecord: {
        create: vi.fn(async () => {
          throw new Error(SECRET_PAYLOAD);
        })
      }
    };
    const service = new AiUsageService(prisma as unknown as PrismaService);

    await service.recordUsage({
      moduleKey: "geo-content",
      action: "content_generate",
      provider: "openai_compatible",
      model: "deepseek-chat",
      isMock: false,
      success: false
    });

    const logged = warnSpy.mock.calls.flat().join(" ");
    expect(logged).toContain("[REDACTED");
    expect(logged).not.toContain("sk-test-secret-key");
    expect(logged).not.toContain("postgresql://user:pass@localhost");
    expect(logged).not.toContain("jwt-secret");
    expect(logged).not.toContain("hunter2");
  });

  it("marks real usage with unknown token usage when provider did not return usage", async () => {
    const create = vi.fn(async (args: { data: { metadata?: unknown } }) => args.data);
    const service = new AiUsageService({
      aiUsageRecord: { create }
    } as unknown as PrismaService);

    await service.recordUsage({
      moduleKey: "model-inclusion-records",
      action: "web_search_check",
      provider: "kimi_web_search",
      model: "kimi-test",
      isMock: false,
      success: true
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          metadata: expect.objectContaining({
            providerReturnedUsage: false,
            usageUnknown: true
          })
        })
      })
    );
  });

  it("blocks operator from triggering real model inclusion web search", async () => {
    const service = new ModelInclusionRecordsService(
      {} as PrismaService,
      {} as KimiWebSearchProvider,
      {} as VolcengineWebSearchProvider,
      {} as AliyunBailianWebSearchProvider
    );

    await expect(
      service.webSearchCheck(
        {
          geoPromptIds: ["geo-prompt-id"],
          provider: "kimi_web_search",
          limit: 1
        },
        buildOperatorContext()
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
