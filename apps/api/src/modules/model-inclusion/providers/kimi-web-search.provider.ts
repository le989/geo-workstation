import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { sanitizeProviderErrorMessage } from "../../usage/usage-sanitizer";

export type ProviderErrorCategory =
  | "network_timeout"
  | "network_fetch_failed"
  | "network_connection_reset"
  | "provider_auth_error"
  | "provider_rate_limit"
  | "provider_insufficient_balance"
  | "provider_model_error"
  | "provider_tool_error"
  | "provider_incomplete_output"
  | "provider_response_parse_error"
  | "provider_bad_request"
  | "provider_unknown";

const RETRYABLE_PROVIDER_ERROR_CATEGORIES = new Set<ProviderErrorCategory>([
  "network_timeout",
  "network_fetch_failed",
  "network_connection_reset"
]);

export class KimiProviderError extends Error {
  constructor(
    message: string,
    readonly category: ProviderErrorCategory = "provider_unknown",
    readonly retryCount = 0,
    readonly status?: number
  ) {
    super(sanitizeProviderErrorMessage(message));
    this.name = "KimiProviderError";
  }
}

export type KimiWebSearchToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  searchResultId?: string;
};

export type KimiWebSearchResult = {
  finalAnswer: string;
  rawAnswer: string;
  toolCalls: KimiWebSearchToolCall[];
  searchResultId?: string;
  citations: unknown[];
  searchResults: unknown[];
  retryCount: number;
};

export type KimiWebSearchInput = {
  promptText: string;
  model?: string;
  brandName?: string;
  companyName?: string;
  websiteUrl?: string;
};

type KimiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown[];
  reasoning_content?: string;
};

type KimiChoice = {
  finish_reason?: string;
  message?: {
    role?: string;
    content?: string;
    reasoning_content?: string;
    tool_calls?: Array<{
      id?: string;
      type?: string;
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
};

type KimiChatResponse = {
  choices?: KimiChoice[];
};

const getErrorStatus = (error: unknown): number | undefined => {
  const value = (error as { status?: unknown; statusCode?: unknown })?.status;
  if (typeof value === "number") {
    return value;
  }

  const statusCode = (error as { statusCode?: unknown })?.statusCode;
  return typeof statusCode === "number" ? statusCode : undefined;
};

const getErrorCode = (error: unknown): string => {
  const record = error as { code?: unknown; cause?: { code?: unknown } };
  if (typeof record?.code === "string") {
    return record.code;
  }

  return typeof record?.cause?.code === "string" ? record.cause.code : "";
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as { message?: unknown; cause?: { message?: unknown } };
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.cause?.message === "string") {
      return record.cause.message;
    }
  }

  return String(error || "Kimi provider error");
};

export const classifyProviderError = (error: unknown): ProviderErrorCategory => {
  if (error instanceof KimiProviderError) {
    return error.category;
  }

  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const text = `${code} ${message}`.toLowerCase();

  if (status === 401 || status === 403 || /api key|unauthorized|forbidden|auth/.test(text)) {
    return "provider_auth_error";
  }
  if (status === 429 || /rate limit|too many requests/.test(text)) {
    return "provider_rate_limit";
  }
  if (/insufficient balance|quota|余额|欠费|balance/.test(text)) {
    return "provider_insufficient_balance";
  }
  if (/und_err_connect_timeout|etimedout|timed out|timeout|aborterror/.test(text)) {
    return "network_timeout";
  }
  if (/econnreset|socket hang up|connection reset/.test(text)) {
    return "network_connection_reset";
  }
  if (/fetch failed|network error|enotfound|eai_again/.test(text)) {
    return "network_fetch_failed";
  }
  if (/model/.test(text)) {
    return "provider_model_error";
  }
  if (/incomplete output|未返回最终回答|incomplete:length/.test(text)) {
    return "provider_incomplete_output";
  }
  if (/response parse|parse error|could not be parsed|响应结构/.test(text)) {
    return "provider_response_parse_error";
  }
  if (/web_search|tool|tool_calls|reasoning_content/.test(text)) {
    return "provider_tool_error";
  }
  if (
    status === 400 ||
    /bad request|invalid_request|invalid request|invalid temperature/.test(text)
  ) {
    return "provider_bad_request";
  }

  return "provider_unknown";
};

export const isRetryableProviderError = (error: unknown): boolean =>
  RETRYABLE_PROVIDER_ERROR_CATEGORIES.has(classifyProviderError(error));

export const getProviderRetryCount = (error: unknown): number =>
  error instanceof KimiProviderError ? error.retryCount : 0;

export const formatProviderError = (error: unknown): string => {
  const category = classifyProviderError(error);
  const message = sanitizeProviderErrorMessage(getErrorMessage(error));
  return `[${category}] ${message}`;
};

@Injectable()
export class KimiWebSearchProvider {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async search(input: KimiWebSearchInput): Promise<KimiWebSearchResult> {
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

    throw new KimiProviderError(
      "Kimi Web Search retry loop ended unexpectedly.",
      "provider_unknown",
      retryCount
    );
  }

  private async searchOnce(
    input: KimiWebSearchInput,
    config: ReturnType<KimiWebSearchProvider["resolveConfig"]>
  ): Promise<Omit<KimiWebSearchResult, "retryCount">> {
    const messages: KimiMessage[] = [
      {
        role: "system",
        content:
          "请使用联网搜索工具回答用户问题，并尽量在回答中说明来源。GEO 是系统检测任务名称，不是品牌名，不要把 GEO 当作被检测品牌。"
      },
      {
        role: "user",
        content: this.buildSearchPrompt(input)
      }
    ];
    const observedToolCalls: KimiWebSearchToolCall[] = [];
    let finalResponse: KimiChatResponse | null = null;

    for (let step = 0; step < 5; step += 1) {
      const response = await this.postChatCompletion(config, messages);
      finalResponse = response;
      const choice = response.choices?.[0];
      const message = choice?.message;
      const toolCalls = message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const finalAnswer = this.extractFinalAnswer(response);

        if (!finalAnswer) {
          throw new BadRequestException("Kimi Web Search returned no final answer.");
        }

        const searchResults = this.buildSearchResults(observedToolCalls);
        return {
          finalAnswer,
          rawAnswer: finalAnswer,
          toolCalls: observedToolCalls,
          searchResultId: observedToolCalls.find((item) => item.searchResultId)?.searchResultId,
          citations: [],
          searchResults
        };
      }

      messages.push({
        role: "assistant",
        content: message?.content ?? "",
        reasoning_content: message?.reasoning_content ?? "需要调用联网搜索工具。",
        tool_calls: toolCalls
      });

      for (const toolCall of toolCalls) {
        const parsedArguments = this.parseToolArguments(toolCall.function?.arguments);
        const normalizedToolCall: KimiWebSearchToolCall = {
          id: toolCall.id ?? `kimi_tool_call_${observedToolCalls.length + 1}`,
          name: toolCall.function?.name ?? config.toolName,
          arguments: parsedArguments,
          searchResultId: this.extractSearchResultId(parsedArguments)
        };
        observedToolCalls.push(normalizedToolCall);
        messages.push({
          role: "tool",
          tool_call_id: normalizedToolCall.id,
          name: normalizedToolCall.name,
          content: JSON.stringify(parsedArguments)
        });
      }
    }

    const fallbackAnswer = finalResponse ? this.extractFinalAnswer(finalResponse) : "";
    if (fallbackAnswer) {
      return {
        finalAnswer: fallbackAnswer,
        rawAnswer: fallbackAnswer,
        toolCalls: observedToolCalls,
        searchResultId: observedToolCalls.find((item) => item.searchResultId)?.searchResultId,
        citations: [],
        searchResults: this.buildSearchResults(observedToolCalls)
      };
    }

    throw new BadRequestException("Kimi Web Search tool-call loop did not finish.");
  }

  private resolveConfig(modelOverride?: string) {
    if (this.configService.get<string>("KIMI_WEB_SEARCH_ENABLED") === "false") {
      throw new BadRequestException("Kimi Web Search is disabled by KIMI_WEB_SEARCH_ENABLED.");
    }

    const apiKey = this.configService.get<string>("KIMI_API_KEY")?.trim();
    if (!apiKey) {
      throw new BadRequestException("KIMI_API_KEY is not configured.");
    }

    const baseUrl = this.configService.get<string>("KIMI_BASE_URL")?.trim();
    if (!baseUrl) {
      throw new BadRequestException("KIMI_BASE_URL is not configured.");
    }

    const model = modelOverride?.trim() || this.configService.get<string>("KIMI_MODEL")?.trim();
    if (!model) {
      throw new BadRequestException("KIMI_MODEL is not configured.");
    }

    return {
      apiKey,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      model,
      toolName:
        this.configService.get<string>("KIMI_WEB_SEARCH_TOOL_NAME")?.trim() || "$web_search",
      timeoutMs: this.resolveTimeout(),
      retryDelayMs: this.resolveRetryDelay()
    };
  }

  private resolveTimeout(): number {
    const configured = Number(this.configService.get<string>("KIMI_TIMEOUT_MS") ?? 120000);
    return Number.isFinite(configured) && configured > 0 ? configured : 120000;
  }

  private resolveRetryDelay(): number {
    const configured = Number(this.configService.get<string>("KIMI_RETRY_DELAY_MS") ?? 1000);
    return Number.isFinite(configured) && configured >= 0 ? configured : 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async postChatCompletion(
    config: ReturnType<KimiWebSearchProvider["resolveConfig"]>,
    messages: KimiMessage[]
  ): Promise<KimiChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await globalThis.fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.6,
          max_tokens: 1800,
          thinking: {
            type: "disabled"
          },
          tools: [
            {
              type: "builtin_function",
              function: {
                name: config.toolName
              }
            }
          ]
        }),
        signal: controller.signal
      });
      const text = await response.text();
      const json = this.parseJson(text);

      if (!response.ok) {
        const message = this.toReadableError(response.status, json, text);
        throw new KimiProviderError(
          message,
          classifyProviderError({
            status: response.status,
            message
          }),
          0,
          response.status
        );
      }

      return json as KimiChatResponse;
    } catch (error) {
      if (error instanceof KimiProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new KimiProviderError("Kimi Web Search request timed out.", "network_timeout");
      }

      const message = `Kimi Web Search network error: ${
        error instanceof Error ? error.message : "unknown"
      }`;
      throw new KimiProviderError(
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

  private buildSearchPrompt(input: KimiWebSearchInput): string {
    const brandName = input.brandName?.trim() || "未提供";
    const companyName = input.companyName?.trim() || brandName;
    const websiteDomain = this.extractDomain(input.websiteUrl) || "未提供";

    return [
      `检测问题：${input.promptText}`,
      `目标品牌：${brandName}`,
      `企业名称：${companyName}`,
      `官网域名：${websiteDomain}`,
      "GEO 是系统检测任务名称，不是品牌名，不要把 GEO 当作被检测品牌，不要把“GEO”写成品牌。",
      "请判断联网搜索结果中是否提到目标品牌、是否引用目标官网、是否推荐目标品牌、是否出现竞品。",
      "如果没有提到目标品牌，请明确说明“未提及目标品牌”。"
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

  private toProviderError(error: unknown, retryCount: number): KimiProviderError {
    if (error instanceof KimiProviderError) {
      return new KimiProviderError(error.message, error.category, retryCount, error.status);
    }

    return new KimiProviderError(getErrorMessage(error), classifyProviderError(error), retryCount);
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
      return "Kimi API Key is invalid or does not have Web Search permission.";
    }

    if (/model/i.test(message)) {
      return `Kimi model is unavailable: ${message}`;
    }

    if (/web_search|tool/i.test(message)) {
      return `Kimi Web Search tool is unavailable or misconfigured: ${message}`;
    }

    return `Kimi Web Search request failed: ${message}`;
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

  private extractFinalAnswer(response: KimiChatResponse): string {
    return response.choices?.[0]?.message?.content?.trim() ?? "";
  }

  private parseToolArguments(value: string | undefined): Record<string, unknown> {
    if (!value) {
      return {};
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {
        raw: value
      };
    }
  }

  private extractSearchResultId(argumentsRecord: Record<string, unknown>): string | undefined {
    const searchResult = argumentsRecord.search_result;

    if (searchResult && typeof searchResult === "object" && !Array.isArray(searchResult)) {
      const searchId = (searchResult as Record<string, unknown>).search_id;
      return typeof searchId === "string" ? searchId : undefined;
    }

    return undefined;
  }

  private buildSearchResults(toolCalls: KimiWebSearchToolCall[]): unknown[] {
    return toolCalls
      .map((toolCall) => toolCall.searchResultId)
      .filter((searchId): searchId is string => Boolean(searchId))
      .map((searchId) => ({
        searchId
      }));
  }
}
