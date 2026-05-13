import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { OpenAICompatibleProvider } from "../src/modules/ai/providers/openai-compatible.provider";

describe("OpenAICompatibleProvider", () => {
  it("returns a clear error when the backend API key is missing", async () => {
    const provider = new OpenAICompatibleProvider(
      new ConfigService({
        AI_OPENAI_COMPATIBLE_BASE_URL: "https://api.example.com/v1",
        AI_OPENAI_COMPATIBLE_MODEL: "deepseek-chat"
      })
    );

    await expect(
      provider.generateText({
        purpose: "content_generation",
        userPrompt: "生成一段 GEO 内容"
      })
    ).rejects.toThrow("AI Provider API Key 未配置");
  });

  it("sanitizes provider auth errors so API keys are not leaked", async () => {
    expect.assertions(3);
    const apiKey = "sk-test-secret-key";
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => `invalid api key ${apiKey}`
    }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAICompatibleProvider(
      new ConfigService({
        AI_OPENAI_COMPATIBLE_API_KEY: apiKey,
        AI_OPENAI_COMPATIBLE_BASE_URL: "https://api.example.com/v1",
        AI_OPENAI_COMPATIBLE_MODEL: "deepseek-chat"
      })
    );

    try {
      await provider.generateText({
        purpose: "content_generation",
        userPrompt: "生成一段 GEO 内容"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("AI Provider 鉴权失败");
      expect((error as Error).message).not.toContain(apiKey);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
