import { Body, Controller, Delete, Inject, Param, Patch } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { UpdateKnowledgeChunkDto } from "./dto/update-knowledge-chunk.dto";
import { KnowledgeChunksService } from "./knowledge-chunks.service";

@Controller("api/knowledge-chunks")
export class KnowledgeChunksController {
  constructor(
    @Inject(KnowledgeChunksService) private readonly knowledgeChunksService: KnowledgeChunksService
  ) {}

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateKnowledgeChunkDto)) body: UpdateKnowledgeChunkDto
  ) {
    return this.knowledgeChunksService.update(id, body);
  }

  @Delete(":id")
  softDelete(@Param("id") id: string) {
    return this.knowledgeChunksService.softDelete(id);
  }
}
