import { Module } from "@nestjs/common";
import { ModelInclusionRecordsController } from "./model-inclusion-records.controller";
import { ModelInclusionRecordsService } from "./model-inclusion-records.service";
import { KimiWebSearchProvider } from "./providers/kimi-web-search.provider";

@Module({
  controllers: [ModelInclusionRecordsController],
  providers: [ModelInclusionRecordsService, KimiWebSearchProvider],
  exports: [ModelInclusionRecordsService]
})
export class ModelInclusionModule {}
