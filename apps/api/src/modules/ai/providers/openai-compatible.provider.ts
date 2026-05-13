import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OPENAI_COMPATIBLE_PROVIDER,
  type AiTextProvider,
  type GenerateTextInput,
  type GenerateTextResult
} from "../ai-provider.interface";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

@Injectable()
export class OpenAICompatibleProvider implements AiTextProvider {
  readonly provider = OPENAI_COMPATIBLE_PROVIDER;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const apiKey = this.getRequiredApiKey();
    const baseUrl = this.getBaseUrl();
    const model = input.model?.trim() || this.getDefaultModel();
    const controller = new AbortController();
    const timeoutMs = this.getTimeoutMs();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            input.systemPrompt
              ? {
                  role: "system",
                  content: input.systemPrompt
                }
              : undefined,
            {
              role: "user",
              content: input.userPrompt
            }
          ].filter(Boolean),
          temperature: input.temperature ?? this.getTemperature(),
          max_tokens: input.maxTokens ?? this.getMaxTokens()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw this.toReadableProviderError(response.status, errorText, apiKey);
      }

      const raw = (await response.json()) as ChatCompletionResponse;
      const text = raw.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new BadRequestException("AI Provider 返回空内容，请稍后重试或检查模型配置。");
      }

      return {
        text,
        provider: OPENAI_COMPATIBLE_PROVIDER,
        model,
        tokenInput: raw.usage?.prompt_tokens,
        tokenOutput: raw.usage?.completion_tokens,
        raw
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new BadRequestException(
          "AI Provider 请求超时，请稍后重试或调大 AI_REQUEST_TIMEOUT_MS。"
        );
      }
      throw new BadRequestException(
        error instanceof Error ? sanitizeError(error.message, apiKey) : "AI Provider 调用失败。"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getRequiredApiKey(): string {
    const apiKey = this.configService.get<string>("AI_OPENAI_COMPATIBLE_API_KEY")?.trim();

    if (!apiKey || apiKey === "change_me") {
      throw new BadRequestException(
        "AI Provider API Key 未配置，请在后端 .env 中设置 AI_OPENAI_COMPATIBLE_API_KEY。"
      );
    }

    return apiKey;
  }

  private getBaseUrl(): string {
    return (
      this.configService.get<string>("AI_OPENAI_COMPATIBLE_BASE_URL")?.trim() ||
      "https://api.deepseek.com/v1"
    );
  }

  private getDefaultModel(): string {
    return this.configService.get<string>("AI_OPENAI_COMPATIBLE_MODEL")?.trim() || "deepseek-chat";
  }

  private getTimeoutMs(): number {
    return toPositiveNumber(this.configService.get<string>("AI_REQUEST_TIMEOUT_MS"), 60000);
  }

  private getMaxTokens(): number {
    return toPositiveNumber(this.configService.get<string>("AI_MAX_TOKENS"), 3000);
  }

  private getTemperature(): number {
    return toPositiveNumber(this.configService.get<string>("AI_TEMPERATURE"), 0.7);
  }

  private toReadableProviderError(
    status: number,
    body: string,
    apiKey: string
  ): BadRequestException {
    if (status === 401 || status === 403) {
      return new BadRequestException("AI Provider 鉴权失败，请检查后端环境变量。");
    }
    if (status === 404 || status === 400) {
      return new BadRequestException(
        `模型不可用或名称错误，请检查后端 AI Provider 配置。${sanitizeError(body, apiKey)}`
      );
    }
    return new BadRequestException(
      `AI Provider 调用失败，状态码 ${status}。${sanitizeError(body, apiKey)}`
    );
  }
}

function toPositiveNumber(value: string | undefined, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
}

function sanitizeError(value: string, apiKey: string): string {
  const compact = value.replaceAll(apiKey, "[REDACTED]").replace(/\s+/g, " ").trim();
  return compact.length > 0 ? compact.slice(0, 500) : "";
}
