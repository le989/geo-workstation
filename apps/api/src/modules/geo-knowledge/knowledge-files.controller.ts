import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { QueryKnowledgeFilesDto } from "./dto/query-knowledge-files.dto";
import { ReparseKnowledgeFileDto } from "./dto/reparse-knowledge-file.dto";
import { UploadKnowledgeFileDto } from "./dto/upload-knowledge-file.dto";
import { KnowledgeFilesService } from "./knowledge-files.service";
import type { UploadedKnowledgeFile } from "./local-file-storage.service";

const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;

@Controller()
export class KnowledgeFilesController {
  constructor(
    @Inject(KnowledgeFilesService) private readonly knowledgeFilesService: KnowledgeFilesService
  ) {}

  @Post("api/knowledge-bases/:id/files")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: MAX_UPLOAD_FILE_SIZE
      }
    })
  )
  upload(
    @Param("id") id: string,
    @UploadedFile() file: UploadedKnowledgeFile | undefined,
    @Body(createValidationPipe(UploadKnowledgeFileDto)) body: UploadKnowledgeFileDto
  ) {
    return this.knowledgeFilesService.upload(id, file, body);
  }

  @Get("api/knowledge-bases/:id/files")
  findMany(
    @Param("id") id: string,
    @Query(createValidationPipe(QueryKnowledgeFilesDto)) query: QueryKnowledgeFilesDto
  ) {
    return this.knowledgeFilesService.findMany(id, query);
  }

  @Get("api/knowledge-files/:id")
  getDetail(@Param("id") id: string) {
    return this.knowledgeFilesService.getDetail(id);
  }

  @Post("api/knowledge-files/:id/reparse")
  reparse(
    @Param("id") id: string,
    @Body(createValidationPipe(ReparseKnowledgeFileDto)) body: ReparseKnowledgeFileDto
  ) {
    return this.knowledgeFilesService.reparse(id, body);
  }

  @Delete("api/knowledge-files/:id")
  softDelete(@Param("id") id: string) {
    return this.knowledgeFilesService.softDelete(id);
  }
}
