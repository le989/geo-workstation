import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateApiEnvironment } from "./config/api-environment";
import { HealthController } from "./health.controller";
import { GeoAnalysisModule } from "./modules/geo-analysis/geo-analysis.module";
import { GeoContentModule } from "./modules/geo-content/geo-content.module";
import { GeoExpansionModule } from "./modules/geo-expansion/geo-expansion.module";
import { GeoInstructionsModule } from "./modules/geo-instructions/geo-instructions.module";
import { GeoKnowledgeModule } from "./modules/geo-knowledge/geo-knowledge.module";
import { GeoPromptsModule } from "./modules/geo-prompts/geo-prompts.module";
import { GeoReportsModule } from "./modules/geo-reports/geo-reports.module";
import { ModelInclusionModule } from "./modules/model-inclusion/model-inclusion.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", "../../.env"],
      isGlobal: true,
      validate: validateApiEnvironment
    }),
    PrismaModule,
    GeoAnalysisModule,
    GeoPromptsModule,
    GeoExpansionModule,
    GeoKnowledgeModule,
    GeoInstructionsModule,
    GeoContentModule,
    ModelInclusionModule,
    GeoReportsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
