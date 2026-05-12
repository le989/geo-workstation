import { Module } from "@nestjs/common";
import { GeoExpansionController } from "./geo-expansion.controller";
import { GeoExpansionService } from "./geo-expansion.service";
import { MockAiExpansionProvider } from "./utils/mock-ai-expansion-provider";

@Module({
  controllers: [GeoExpansionController],
  providers: [GeoExpansionService, MockAiExpansionProvider]
})
export class GeoExpansionModule {}
