import { Module } from "@nestjs/common";
import { ModelInclusionRecordsController } from "./model-inclusion-records.controller";
import { ModelInclusionRecordsService } from "./model-inclusion-records.service";
import { AliyunBailianWebSearchProvider } from "./providers/aliyun-bailian-web-search.provider";
import { KimiWebSearchProvider } from "./providers/kimi-web-search.provider";
import { VolcengineWebSearchProvider } from "./providers/volcengine-web-search.provider";

@Module({
  controllers: [ModelInclusionRecordsController],
  providers: [
    ModelInclusionRecordsService,
    KimiWebSearchProvider,
    VolcengineWebSearchProvider,
    AliyunBailianWebSearchProvider
  ],
  exports: [ModelInclusionRecordsService]
})
export class ModelInclusionModule {}
