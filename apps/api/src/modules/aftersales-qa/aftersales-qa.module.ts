import { Module } from "@nestjs/common";
import { GeoKnowledgeModule } from "../geo-knowledge/geo-knowledge.module";
import { AftersalesQaController } from "./aftersales-qa.controller";
import { AftersalesQaService } from "./aftersales-qa.service";

@Module({
  imports: [GeoKnowledgeModule],
  controllers: [AftersalesQaController],
  providers: [AftersalesQaService],
  exports: [AftersalesQaService]
})
export class AftersalesQaModule {}
