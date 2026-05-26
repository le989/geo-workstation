import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { AiProviderService } from "../src/modules/ai/ai-provider.service";
import {
  assertMockProviderAllowed,
  getDatabaseNameFromUrl,
  isMockProviderEnabled
} from "../src/modules/ai/ai-provider-policy";

const createConfigService = (values: Record<string, string | undefined>) =>
  ({
    get: <T = string>(key: string) => values[key] as T | undefined
  }) as ConfigService;

describe("production mode guard", () => {
  it("blocks mock provider in production app env", () => {
    const config = createConfigService({
      APP_ENV: "production",
      ENABLE_MOCK_PROVIDER: "false"
    });

    expect(isMockProviderEnabled(config)).toBe(false);
    expect(() => assertMockProviderAllowed(config, "mock", "GEO 内容生成")).toThrow(
      BadRequestException
    );
  });

  it("blocks AiProviderService from dispatching mock requests in production", async () => {
    const config = createConfigService({
      APP_ENV: "production",
      ENABLE_MOCK_PROVIDER: "false",
      AI_PROVIDER: "mock"
    });
    const mockAiProvider = { generateText: vi.fn() };
    const realAiProvider = { generateText: vi.fn() };
    const service = new AiProviderService(
      config,
      mockAiProvider as never,
      realAiProvider as never
    );

    await expect(
      service.generateText({
        provider: "mock",
        purpose: "content_generation",
        userPrompt: "生成一篇 GEO 文章"
      })
    ).rejects.toThrow("正式环境已禁用 Mock AI Provider");
    expect(mockAiProvider.generateText).not.toHaveBeenCalled();
    expect(realAiProvider.generateText).not.toHaveBeenCalled();
  });

  it("keeps mock provider available in smoke app env", () => {
    const config = createConfigService({
      APP_ENV: "smoke",
      ENABLE_MOCK_PROVIDER: "true"
    });

    expect(isMockProviderEnabled(config)).toBe(true);
    expect(() => assertMockProviderAllowed(config, "mock", "GEO 内容生成")).not.toThrow();
  });

  it("extracts the database name without exposing the connection string", () => {
    expect(
      getDatabaseNameFromUrl(
        "postgresql://geo_workstation:secret@localhost:5432/geo_workstation_official?schema=public"
      )
    ).toBe("geo_workstation_official");
    expect(getDatabaseNameFromUrl("not-a-url")).toBe("unknown");
  });
});
