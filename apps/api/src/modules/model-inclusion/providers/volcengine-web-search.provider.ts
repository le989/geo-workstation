import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  classifyProviderError,
  formatProviderError,
  isRetryableProviderError,
  KimiProviderError,
  type ProviderErrorCategory
} from "./kimi-web-search.provider";

export type VolcengineWebSearchInput = {
  promptText: string;
  model?: string;
  brandName?: string;
  companyName?: string;
  websiteUrl?: string;
};

export type VolcengineWebSearchResult = {
  finalAnswer: string;
  rawAnswer: string;
  citations: unknown[];
  searchResults: unknown[];
  retryCount: number;
};

type VolcengineResponseOutput = {
  id?: string;
  type?: string;
  status?: string;
  content?: unknown;
};

type VolcengineResponsesApiResponse = {
  id?: string;
  status?: string;
  incomplete_details?: {
    reason?: string;
  };
  output_text?: string;
  output?: VolcengineResponseOutput[];
  message?: {
    content?: unknown;
  };
};

class VolcengineProviderError extends KimiProviderError {
  constructor(
    message: string,
    category: ProviderErrorCategory = "provider_unknown",
    retryCount = 0,
    status?: number,
    readonly searchResults: unknown[] = []
  ) {
    super(message, category, retryCount, status);
    this.name = "VolcengineProviderError";
  }
}

@Injectable()
export class VolcengineWebSearchProvider {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async search(input: VolcengineWebSearchInput): Promise<VolcengineWebSearchResult> {
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

    throw new VolcengineProviderError(
      "Volcengine Web Search retry loop ended unexpectedly.",
      "provider_unknown",
      retryCount
    );
  }

  private async searchOnce(
    input: VolcengineWebSearchInput,
    config: ReturnType<VolcengineWebSearchProvider["resolveConfig"]>
  ): Promise<Omit<VolcengineWebSearchResult, "retryCount">> {
    const response = await this.postResponses(config, input);
    const finalAnswer = this.extractFinalAnswer(response);
    const citations = this.extractCitations(response);
    const searchResults = this.extractSearchResults(response);

    if (!finalAnswer) {
      if (searchResults.length > 0) {
        throw new VolcengineProviderError(
          "火山 Web Search 已触发搜索，但未返回最终回答，建议提高 max_output_tokens 或缩短输出要求。",
          "provider_incomplete_output",
          0,
          undefined,
          searchResults
        );
      }

      throw new VolcengineProviderError(
        "Volcengine Web Search response could not be parsed.",
        "provider_response_parse_error"
      );
    }

    const incompleteReason = response.incomplete_details?.reason;
    const rawAnswer =
      response.status === "incomplete" && incompleteReason
        ? `[Volcengine response incomplete:${incompleteReason}]\n\n${finalAnswer}`
        : finalAnswer;

    return {
      finalAnswer,
      rawAnswer,
      citations,
      searchResults
    };
  }

  private resolveConfig(modelOverride?: string) {
    const apiKey = this.configService.get<string>("VOLCENGINE_WEB_SEARCH_API_KEY")?.trim();
    if (!apiKey) {
      throw new BadRequestException("VOLCENGINE_WEB_SEARCH_API_KEY is not configured.");
    }

    const baseUrl =
      this.configService.get<string>("VOLCENGINE_WEB_SEARCH_BASE_URL")?.trim() ||
      "https://ark.cn-beijing.volces.com/api/v3";
    const responsesUrl =
      this.configService.get<string>("VOLCENGINE_WEB_SEARCH_RESPONSES_URL")?.trim() ||
      `${baseUrl.replace(/\/+$/, "")}/responses`;
    const model =
      modelOverride?.trim() ||
      this.configService.get<string>("VOLCENGINE_WEB_SEARCH_MODEL")?.trim();

    if (!model) {
      throw new BadRequestException("VOLCENGINE_WEB_SEARCH_MODEL is not configured.");
    }

    return {
      apiKey,
      responsesUrl,
      model,
      forceSearch: this.resolveForceSearch(),
      maxOutputTokens: this.resolveMaxOutputTokens(),
      timeoutMs: this.resolveTimeout(),
      retryDelayMs: this.resolveRetryDelay()
    };
  }

  private resolveForceSearch(): boolean {
    const value = this.configService.get<string>("VOLCENGINE_WEB_SEARCH_FORCE_SEARCH");
    return value === undefined ? true : value.toLowerCase() !== "false";
  }

  private resolveTimeout(): number {
    const configured = Number(
      this.configService.get<string>("VOLCENGINE_WEB_SEARCH_TIMEOUT_MS") ?? 180000
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 180000;
  }

  private resolveMaxOutputTokens(): number {
    const configured = Number(
      this.configService.get<string>("VOLCENGINE_WEB_SEARCH_MAX_OUTPUT_TOKENS") ?? 1200
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 1200;
  }

  private resolveRetryDelay(): number {
    const configured = Number(
      this.configService.get<string>("VOLCENGINE_WEB_SEARCH_RETRY_DELAY_MS") ?? 1000
    );
    return Number.isFinite(configured) && configured >= 0 ? configured : 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async postResponses(
    config: ReturnType<VolcengineWebSearchProvider["resolveConfig"]>,
    input: VolcengineWebSearchInput
  ): Promise<VolcengineResponsesApiResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await globalThis.fetch(config.responsesUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: config.model,
          input: this.buildSearchPrompt(input),
          tools: [
            {
              type: "web_search"
            }
          ],
          max_output_tokens: config.maxOutputTokens,
          ...(config.forceSearch ? { tool_choice: "required" } : {})
        }),
        signal: controller.signal
      });
      const text = await response.text();
      const json = this.parseJson(text);

      if (!response.ok) {
        const message = this.toReadableError(response.status, json, text);
        throw new VolcengineProviderError(
          message,
          classifyProviderError({
            status: response.status,
            message
          }),
          0,
          response.status
        );
      }

      return json as VolcengineResponsesApiResponse;
    } catch (error) {
      if (error instanceof VolcengineProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new VolcengineProviderError(
          "Volcengine Web Search request timed out.",
          "network_timeout"
        );
      }

      const message = `Volcengine Web Search network error: ${
        error instanceof Error ? error.message : "unknown"
      }`;
      throw new VolcengineProviderError(
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

  private toProviderError(error: unknown, retryCount: number): VolcengineProviderError {
    if (error instanceof KimiProviderError) {
      return new VolcengineProviderError(
        error.message,
        error.category,
        retryCount,
        error.status,
        this.extractErrorSearchResults(error)
      );
    }

    const message = error instanceof Error ? error.message : formatProviderError(error);
    return new VolcengineProviderError(message, classifyProviderError(error), retryCount);
  }

  private buildSearchPrompt(input: VolcengineWebSearchInput): string {
    const brandName = input.brandName?.trim() || "未提供";
    const companyName = input.companyName?.trim() || brandName;
    const websiteDomain = this.extractDomain(input.websiteUrl) || "未提供";

    return [
      `请联网搜索后回答以下检测问题：${input.promptText}`,
      `目标品牌：${brandName}`,
      `企业名称：${companyName}`,
      `官网域名：${websiteDomain}`,
      "GEO 是系统检测任务名称，不是品牌名，不要把 GEO 当作被检测品牌，不要把“GEO”写成品牌。",
      "回答控制在 300 字以内。",
      "优先说明是否出现目标品牌、官网、相关厂家或竞品。",
      "请判断联网搜索结果中是否提到目标品牌。",
      "请判断是否引用目标官网。",
      "请判断是否推荐目标品牌。",
      "请判断是否出现竞品。",
      "不要生成长篇选型指南。",
      "不要输出复杂表格。",
      "如果没有提到目标品牌，请明确说明“未提及目标品牌”。",
      "如果没有找到品牌或官网，也请明确说明。"
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

  private extractErrorSearchResults(error: unknown): unknown[] {
    const value = (error as { searchResults?: unknown })?.searchResults;
    return Array.isArray(value) ? value : [];
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
      return "Volcengine API Key is invalid or does not have Web Search permission.";
    }

    if (/model/i.test(message)) {
      return `Volcengine model is unavailable: ${message}`;
    }

    if (/web_search|tool/i.test(message)) {
      return `Volcengine Web Search tool is unavailable or misconfigured: ${message}`;
    }

    return `Volcengine Web Search request failed: ${message}`;
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

  private extractFinalAnswer(response: VolcengineResponsesApiResponse): string {
    const outputText = response.output_text?.trim();
    if (outputText) {
      return outputText;
    }

    const outputMessage = response.output?.find((item) => item.type === "message");
    const outputMessageText = this.extractContentText(outputMessage?.content);
    if (outputMessageText) {
      return outputMessageText;
    }

    return this.extractContentText(response.message?.content);
  }

  private extractContentText(content: unknown): string {
    if (typeof content === "string") {
      return content.trim();
    }

    if (!Array.isArray(content)) {
      return "";
    }

    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return typeof record.text === "string" ? record.text : "";
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  private extractSearchResults(response: VolcengineResponsesApiResponse): unknown[] {
    return (response.output ?? [])
      .filter((item) => item.type === "web_search_call")
      .map((item) => ({
        webSearchCallId: item.id,
        type: item.type,
        status: item.status,
        rawOutputSummary: JSON.stringify(item).slice(0, 1000)
      }));
  }

  private extractCitations(response: VolcengineResponsesApiResponse): unknown[] {
    const citations: Array<Record<string, unknown>> = [];
    this.collectCitationLikeValues(response, citations);
    return citations;
  }

  private collectCitationLikeValues(value: unknown, citations: Array<Record<string, unknown>>) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => this.collectCitationLikeValues(item, citations));
      return;
    }

    const record = value as Record<string, unknown>;
    const url = record.url ?? record.uri ?? record.link;

    if (typeof url === "string") {
      citations.push({
        title: typeof record.title === "string" ? record.title : undefined,
        url,
        source: record
      });
    }

    Object.values(record).forEach((item) => this.collectCitationLikeValues(item, citations));
  }
}
