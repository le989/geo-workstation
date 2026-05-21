import { Module } from "@nestjs/common";
import { KnowledgeBasesController } from "./knowledge-bases.controller";
import { KnowledgeBasesService } from "./knowledge-bases.service";
import { KnowledgeChunksController } from "./knowledge-chunks.controller";
import { KnowledgeChunksService } from "./knowledge-chunks.service";
import { KnowledgeDirectoriesController } from "./knowledge-directories.controller";
import { KnowledgeDirectoriesService } from "./knowledge-directories.service";
import { KnowledgeFileParserService } from "./knowledge-file-parser.service";
import { KnowledgeFilesController } from "./knowledge-files.controller";
import { KnowledgeFilesService } from "./knowledge-files.service";
import { LocalFileStorageService } from "./local-file-storage.service";

@Module({
  controllers: [
    KnowledgeBasesController,
    KnowledgeChunksController,
    KnowledgeDirectoriesController,
    KnowledgeFilesController
  ],
  providers: [
    KnowledgeBasesService,
    KnowledgeChunksService,
    KnowledgeDirectoriesService,
    KnowledgeFilesService,
    KnowledgeFileParserService,
    LocalFileStorageService
  ],
  exports: [KnowledgeDirectoriesService, KnowledgeFilesService]
})
export class GeoKnowledgeModule {}
