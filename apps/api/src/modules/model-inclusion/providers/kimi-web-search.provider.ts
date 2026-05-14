import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
};

export type KimiWebSearchInput = {
  promptText: string;
  model?: string;
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

@Injectable()
export class KimiWebSearchProvider {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async search(input: KimiWebSearchInput): Promise<KimiWebSearchResult> {
    const config = this.resolveConfig(input.model);
    const messages: KimiMessage[] = [
      {
        role: "system",
        content: "请使用联网搜索工具回答用户问题，并尽量在回答中说明来源。"
      },
      {
        role: "user",
        content: input.promptText
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
      timeoutMs: this.resolveTimeout()
    };
  }

  private resolveTimeout(): number {
    const configured = Number(this.configService.get<string>("KIMI_TIMEOUT_MS") ?? 90000);
    return Number.isFinite(configured) && configured > 0 ? configured : 90000;
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
        throw new BadRequestException(this.toReadableError(response.status, json, text));
      }

      return json as KimiChatResponse;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new BadRequestException("Kimi Web Search request timed out.");
      }

      throw new BadRequestException(
        `Kimi Web Search network error: ${error instanceof Error ? error.message : "unknown"}`
      );
    } finally {
      clearTimeout(timer);
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
