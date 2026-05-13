import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ProjectProfileModule } from "../project-profile/project-profile.module";
import { ContentItemsController } from "./content-items.controller";
import { ContentItemsService } from "./content-items.service";
import { ContentTasksController } from "./content-tasks.controller";
import { ContentTasksService } from "./content-tasks.service";

@Module({
  imports: [AiModule, ProjectProfileModule],
  controllers: [ContentTasksController, ContentItemsController],
  providers: [ContentTasksService, ContentItemsService],
  exports: [ContentTasksService, ContentItemsService]
})
export class GeoContentModule {}
