import { Module } from "@nestjs/common";
import { KnowledgeBasesController } from "./knowledge-bases.controller";
import { KnowledgeBasesService } from "./knowledge-bases.service";
import { KnowledgeChunksController } from "./knowledge-chunks.controller";
import { KnowledgeChunksService } from "./knowledge-chunks.service";

@Module({
  controllers: [KnowledgeBasesController, KnowledgeChunksController],
  providers: [KnowledgeBasesService, KnowledgeChunksService]
})
export class GeoKnowledgeModule {}
