import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  classifyProviderError,
  formatProviderError,
  isRetryableProviderError,
  KimiProviderError,
  type ProviderErrorCategory
} from "./kimi-web-search.provider";

export type AliyunBailianWebSearchInput = {
  promptText: string;
  model?: string;
  brandName?: string;
  companyName?: string;
  websiteUrl?: string;
};

export type AliyunBailianWebSearchResult = {
  finalAnswer: string;
  rawAnswer: string;
  citations: unknown[];
  searchResults: unknown[];
  retryCount: number;
};

type AliyunBailianChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
    };
  }>;
};

class AliyunBailianProviderError extends KimiProviderError {
  constructor(
    message: string,
    category: ProviderErrorCategory = "provider_unknown",
    retryCount = 0,
    status?: number
  ) {
    super(message, category, retryCount, status);
    this.name = "AliyunBailianProviderError";
  }
}

@Injectable()
export class AliyunBailianWebSearchProvider {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async search(input: AliyunBailianWebSearchInput): Promise<AliyunBailianWebSearchResult> {
    const config = this.resolveConfig(input.model);
    let retryCount = 0;

    for (let attempt = 0; attempt <= 1; attempt += 1) {
      try {
        const result = await this.searchOnce(input, config);
        return {
          ...result,
          retryCount
        };
      } catch (error) {
        if (attempt < 1 && isRetryableProviderError(error)) {
          retryCount += 1;
          await this.sleep(config.retryDelayMs);
          continue;
        }

        throw this.toProviderError(error, retryCount);
      }
    }

    throw new AliyunBailianProviderError(
      "Aliyun Bailian Web Search retry loop ended unexpectedly.",
      "provider_unknown",
      retryCount
    );
  }

  private async searchOnce(
    input: AliyunBailianWebSearchInput,
    config: ReturnType<AliyunBailianWebSearchProvider["resolveConfig"]>
  ): Promise<Omit<AliyunBailianWebSearchResult, "retryCount">> {
    const response = await this.postChatCompletion(config, input);
    const finalAnswer = this.extractFinalAnswer(response);

    if (!finalAnswer) {
      throw new AliyunBailianProviderError(
        "Aliyun Bailian Web Search response could not be parsed.",
        "provider_response_parse_error"
      );
    }

    return {
      finalAnswer,
      rawAnswer: finalAnswer,
      citations: [],
      searchResults: []
    };
  }

  private resolveConfig(modelOverride?: string) {
    if (this.configService.get<string>("ALIYUN_BAILIAN_WEB_SEARCH_ENABLED") === "false") {
      throw new BadRequestException(
        "Aliyun Bailian Web Search is disabled by ALIYUN_BAILIAN_WEB_SEARCH_ENABLED."
      );
    }

    const apiKey = this.configService.get<string>("ALIYUN_BAILIAN_API_KEY")?.trim();
    if (!apiKey) {
      throw new BadRequestException("ALIYUN_BAILIAN_API_KEY is not configured.");
    }

    const baseUrl =
      this.configService.get<string>("ALIYUN_BAILIAN_BASE_URL")?.trim() ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    const model =
      modelOverride?.trim() || this.configService.get<string>("ALIYUN_BAILIAN_MODEL")?.trim();

    if (!model) {
      throw new BadRequestException("ALIYUN_BAILIAN_MODEL is not configured.");
    }

    return {
      apiKey,
      chatCompletionsUrl: this.resolveChatCompletionsUrl(baseUrl),
      model,
      forceSearch: this.resolveForceSearch(),
      timeoutMs: this.resolveTimeout(),
      retryDelayMs: this.resolveRetryDelay()
    };
  }

  private resolveChatCompletionsUrl(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/+$/, "");
    return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
  }

  private resolveForceSearch(): boolean {
    const value = this.configService.get<string>("ALIYUN_BAILIAN_FORCE_SEARCH");
    return value === undefined ? true : value.toLowerCase() !== "false";
  }

  private resolveTimeout(): number {
    const configured = Number(
      this.configService.get<string>("ALIYUN_BAILIAN_TIMEOUT_MS") ?? 120000
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 120000;
  }

  private resolveRetryDelay(): number {
    const configured = Number(
      this.configService.get<string>("ALIYUN_BAILIAN_RETRY_DELAY_MS") ?? 1000
    );
    return Number.isFinite(configured) && configured >= 0 ? configured : 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async postChatCompletion(
    config: ReturnType<AliyunBailianWebSearchProvider["resolveConfig"]>,
    input: AliyunBailianWebSearchInput
  ): Promise<AliyunBailianChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await globalThis.fetch(config.chatCompletionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "user",
              content: this.buildSearchPrompt(input)
            }
          ],
          temperature: 0.2,
          max_tokens: 800,
          enable_search: true,
          search_options: {
            forced_search: config.forceSearch,
            enable_source: true,
            enable_citation: true
          }
        }),
        signal: controller.signal
      });
      const text = await response.text();
      const json = this.parseJson(text);

      if (!response.ok) {
        const message = this.toReadableError(response.status, json, text);
        throw new AliyunBailianProviderError(
          message,
          classifyProviderError({
            status: response.status,
            message
          }),
          0,
          response.status
        );
      }

      return json as AliyunBailianChatResponse;
    } catch (error) {
      if (error instanceof AliyunBailianProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AliyunBailianProviderError(
          "Aliyun Bailian Web Search request timed out.",
          "network_timeout"
        );
      }

      const message = `Aliyun Bailian Web Search network error: ${
        error instanceof Error ? error.message : "unknown"
      }`;
      throw new AliyunBailianProviderError(
        message,
        classifyProviderError({
          ...(error && typeof error === "object" ? (error as Record<string, unknown>) : {}),
          message
        })
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private toProviderError(error: unknown, retryCount: number): AliyunBailianProviderError {
    if (error instanceof KimiProviderError) {
      return new AliyunBailianProviderError(
        error.message,
        error.category,
        retryCount,
        error.status
      );
    }

    const message = error instanceof Error ? error.message : formatProviderError(error);
    return new AliyunBailianProviderError(message, classifyProviderError(error), retryCount);
  }

  private buildSearchPrompt(input: AliyunBailianWebSearchInput): string {
    const brandName = input.brandName?.trim() || "未提供";
    const companyName = input.companyName?.trim() || brandName;
    const websiteDomain = this.extractDomain(input.websiteUrl) || "未提供";

    return [
      `请联网搜索后回答以下 GEO 命中检测问题：${input.promptText}`,
      `目标品牌：${brandName}`,
      `企业名称：${companyName}`,
      `官网域名：${websiteDomain}`,
      "这是 GEO 命中检测，不是内容创作。",
      "GEO 是系统检测概念，不是品牌名，不要把 GEO 当作被检测品牌。",
      "请判断是否提到目标品牌。",
      "请判断是否推荐目标品牌。",
      "请判断是否引用目标官网。",
      "请判断是否出现竞品。",
      "如果没有提到目标品牌，请明确说明“未提及目标品牌”。",
      "回答控制在 300 字以内。",
      "不要生成长篇选型指南。",
      "不要输出复杂表格。"
    ].join("\n");
  }

  private extractDomain(url: string | undefined): string | undefined {
    const trimmed = url?.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      return new URL(trimmed).hostname.replace(/^www\./, "");
    } catch {
      return trimmed
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        ?.trim();
    }
  }

  private parseJson(text: string): unknown {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return {
        rawText: text
      };
    }
  }

  private toReadableError(status: number, json: unknown, text: string): string {
    const message = this.extractErrorMessage(json) ?? text.slice(0, 500);

    if (status === 401 || status === 403) {
      return "Aliyun Bailian API Key is invalid or does not have Web Search permission.";
    }

    if (/insufficient balance|quota|余额|欠费|balance/i.test(message)) {
      return `Aliyun Bailian account balance or quota is insufficient: ${message}`;
    }

    if (/model/i.test(message)) {
      return `Aliyun Bailian model is unavailable: ${message}`;
    }

    if (/forced_search|enable_search|web.?search|search_options/i.test(message)) {
      return `Aliyun Bailian Web Search is not enabled or forced_search is misconfigured: ${message}`;
    }

    return `Aliyun Bailian Web Search request failed: ${message}`;
  }

  private extractErrorMessage(json: unknown): string | undefined {
    if (!json || typeof json !== "object") {
      return undefined;
    }

    const record = json as Record<string, unknown>;
    const error = record.error;

    if (error && typeof error === "object") {
      const errorRecord = error as Record<string, unknown>;
      if (typeof errorRecord.message === "string") {
        return errorRecord.message;
      }
    }

    return typeof record.message === "string" ? record.message : undefined;
  }

  private extractFinalAnswer(response: AliyunBailianChatResponse): string {
    return response.choices?.[0]?.message?.content?.trim() ?? "";
  }
}
