import { Module } from "@nestjs/common";
import { AftersalesQaController } from "./aftersales-qa.controller";
import { AftersalesQaService } from "./aftersales-qa.service";

@Module({
  controllers: [AftersalesQaController],
  providers: [AftersalesQaService],
  exports: [AftersalesQaService]
})
export class AftersalesQaModule {}
