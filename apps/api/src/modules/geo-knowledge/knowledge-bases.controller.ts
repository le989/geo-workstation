import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { CreateKnowledgeBaseDto } from "./dto/create-knowledge-base.dto";
import { QueryKnowledgeBasesDto } from "./dto/query-knowledge-bases.dto";
import { QueryKnowledgeChunksDto } from "./dto/query-knowledge-chunks.dto";
import { TextImportKnowledgeDto } from "./dto/text-import-knowledge.dto";
import { UpdateKnowledgeBaseDto } from "./dto/update-knowledge-base.dto";
import { KnowledgeBasesService } from "./knowledge-bases.service";
import { KnowledgeChunksService } from "./knowledge-chunks.service";

@Controller("api/knowledge-bases")
export class KnowledgeBasesController {
  constructor(
    @Inject(KnowledgeBasesService) private readonly knowledgeBasesService: KnowledgeBasesService,
    @Inject(KnowledgeChunksService) private readonly knowledgeChunksService: KnowledgeChunksService
  ) {}

  @Get()
  findMany(@Query(createValidationPipe(QueryKnowledgeBasesDto)) query: QueryKnowledgeBasesDto) {
    return this.knowledgeBasesService.findMany(query);
  }

  @Post()
  create(@Body(createValidationPipe(CreateKnowledgeBaseDto)) body: CreateKnowledgeBaseDto) {
    return this.knowledgeBasesService.create(body);
  }

  @Get(":id")
  getDetail(@Param("id") id: string) {
    return this.knowledgeBasesService.getDetail(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateKnowledgeBaseDto)) body: UpdateKnowledgeBaseDto
  ) {
    return this.knowledgeBasesService.update(id, body);
  }

  @Delete(":id")
  softDelete(@Param("id") id: string) {
    return this.knowledgeBasesService.softDelete(id);
  }

  @Post(":id/text-import")
  textImport(
    @Param("id") id: string,
    @Body(createValidationPipe(TextImportKnowledgeDto)) body: TextImportKnowledgeDto
  ) {
    return this.knowledgeBasesService.textImport(id, body);
  }

  @Get(":id/chunks")
  findChunks(
    @Param("id") id: string,
    @Query(createValidationPipe(QueryKnowledgeChunksDto)) query: QueryKnowledgeChunksDto
  ) {
    return this.knowledgeChunksService.findMany(id, query);
  }
}
