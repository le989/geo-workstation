import { Module } from "@nestjs/common";
import { AiProviderService } from "./ai-provider.service";
import { MockAiProvider } from "./providers/mock-ai.provider";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.provider";

@Module({
  providers: [AiProviderService, MockAiProvider, OpenAICompatibleProvider],
  exports: [AiProviderService, MockAiProvider, OpenAICompatibleProvider]
})
export class AiModule {}
