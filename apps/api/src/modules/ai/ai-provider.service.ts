import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MOCK_AI_PROVIDER,
  OPENAI_COMPATIBLE_PROVIDER,
  isMockAiProvider,
  isOpenAICompatibleProvider,
  normalizeAiProvider,
  type AiTextProvider,
  type GenerateTextInput,
  type GenerateTextResult
} from "./ai-provider.interface";
import { assertMockProviderAllowed } from "./ai-provider-policy";
import { MockAiProvider } from "./providers/mock-ai.provider";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.provider";

@Injectable()
export class AiProviderService implements AiTextProvider {
  readonly provider = "ai_provider_service";

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(MockAiProvider)
    private readonly mockAiProvider: MockAiProvider,
    @Inject(OpenAICompatibleProvider)
    private readonly openAICompatibleProvider: OpenAICompatibleProvider
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const provider = normalizeAiProvider(
      input.provider ?? this.configService.get<string>("AI_PROVIDER")
    );
    assertMockProviderAllowed(this.configService, provider, "AI Provider");

    if (isMockAiProvider(provider)) {
      return this.mockAiProvider.generateText({
        ...input,
        provider: MOCK_AI_PROVIDER
      });
    }

    if (isOpenAICompatibleProvider(provider)) {
      return this.openAICompatibleProvider.generateText({
        ...input,
        provider: OPENAI_COMPATIBLE_PROVIDER
      });
    }

    throw new BadRequestException(`Unsupported AI provider: ${input.provider}`);
  }
}
