import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ProjectProfileModule } from "../project-profile/project-profile.module";
import { GeoExpansionController } from "./geo-expansion.controller";
import { GeoExpansionService } from "./geo-expansion.service";
import { MockAiExpansionProvider } from "./utils/mock-ai-expansion-provider";

@Module({
  imports: [AiModule, ProjectProfileModule],
  controllers: [GeoExpansionController],
  providers: [GeoExpansionService, MockAiExpansionProvider]
})
export class GeoExpansionModule {}
