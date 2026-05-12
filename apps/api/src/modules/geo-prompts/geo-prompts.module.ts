import { Module } from "@nestjs/common";
import { GeoPromptsController } from "./geo-prompts.controller";
import { GeoPromptsService } from "./geo-prompts.service";

@Module({
  controllers: [GeoPromptsController],
  providers: [GeoPromptsService]
})
export class GeoPromptsModule {}
