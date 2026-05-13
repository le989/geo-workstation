import { BadRequestException, Injectable } from "@nestjs/common";
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
import { MockAiProvider } from "./providers/mock-ai.provider";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.provider";

@Injectable()
export class AiProviderService implements AiTextProvider {
  readonly provider = "ai_provider_service";

  constructor(
    private readonly configService: ConfigService,
    private readonly mockAiProvider: MockAiProvider,
    private readonly openAICompatibleProvider: OpenAICompatibleProvider
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const provider = normalizeAiProvider(
      input.provider ?? this.configService.get<string>("AI_PROVIDER")
    );

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
