import { Injectable } from "@nestjs/common";
import {
  MOCK_AI_PROVIDER,
  type AiTextProvider,
  type GenerateTextInput,
  type GenerateTextResult
} from "../ai-provider.interface";

@Injectable()
export class MockAiProvider implements AiTextProvider {
  readonly provider = MOCK_AI_PROVIDER;

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const text = [
      "这是 Mock AI Provider 生成结果，仅用于 GEO 流程验证。",
      input.systemPrompt ? `系统指令摘要：${summarize(input.systemPrompt)}` : undefined,
      `用户请求摘要：${summarize(input.userPrompt)}`
    ]
      .filter(Boolean)
      .join("\n");

    return {
      text,
      provider: this.provider,
      model: input.model?.trim() || "mock-text-v1",
      tokenInput: estimateTokenCount(`${input.systemPrompt ?? ""}\n${input.userPrompt}`),
      tokenOutput: estimateTokenCount(text),
      raw: {
        mock: true,
        purpose: input.purpose,
        relatedType: input.relatedType,
        relatedId: input.relatedId
      }
    };
  }
}

function summarize(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 160)}...`;
}

function estimateTokenCount(value: string): number {
  return Math.max(Math.ceil(value.length / 4), 1);
}
