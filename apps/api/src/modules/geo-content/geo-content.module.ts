import { Module } from "@nestjs/common";
import { ContentItemsController } from "./content-items.controller";
import { ContentItemsService } from "./content-items.service";
import { ContentTasksController } from "./content-tasks.controller";
import { ContentTasksService } from "./content-tasks.service";

@Module({
  controllers: [ContentTasksController, ContentItemsController],
  providers: [ContentTasksService, ContentItemsService],
  exports: [ContentTasksService, ContentItemsService]
})
export class GeoContentModule {}
