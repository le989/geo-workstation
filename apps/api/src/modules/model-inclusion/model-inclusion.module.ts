import { Module } from "@nestjs/common";
import { ModelInclusionRecordsController } from "./model-inclusion-records.controller";
import { ModelInclusionRecordsService } from "./model-inclusion-records.service";

@Module({
  controllers: [ModelInclusionRecordsController],
  providers: [ModelInclusionRecordsService],
  exports: [ModelInclusionRecordsService]
})
export class ModelInclusionModule {}
