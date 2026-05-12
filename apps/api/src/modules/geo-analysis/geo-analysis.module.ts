import { Module } from "@nestjs/common";
import { GeoContentModule } from "../geo-content/geo-content.module";
import { GeoAnalysisTasksController } from "./geo-analysis-tasks.controller";
import { GeoAnalysisTasksService } from "./geo-analysis-tasks.service";

@Module({
  imports: [GeoContentModule],
  controllers: [GeoAnalysisTasksController],
  providers: [GeoAnalysisTasksService],
  exports: [GeoAnalysisTasksService]
})
export class GeoAnalysisModule {}
