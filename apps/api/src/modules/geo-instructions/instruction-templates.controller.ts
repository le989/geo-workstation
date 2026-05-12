import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { CreateInstructionTemplateDto } from "./dto/create-instruction-template.dto";
import { DuplicateInstructionTemplateDto } from "./dto/duplicate-instruction-template.dto";
import { QueryInstructionTemplatesDto } from "./dto/query-instruction-templates.dto";
import { UpdateInstructionTemplateDto } from "./dto/update-instruction-template.dto";
import { InstructionTemplatesService } from "./instruction-templates.service";

@Controller("api/instruction-templates")
export class InstructionTemplatesController {
  constructor(
    @Inject(InstructionTemplatesService)
    private readonly instructionTemplatesService: InstructionTemplatesService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryInstructionTemplatesDto))
    query: QueryInstructionTemplatesDto
  ) {
    return this.instructionTemplatesService.findMany(query);
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateInstructionTemplateDto))
    body: CreateInstructionTemplateDto
  ) {
    return this.instructionTemplatesService.create(body);
  }

  @Get(":id")
  getDetail(@Param("id") id: string) {
    return this.instructionTemplatesService.getDetail(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateInstructionTemplateDto))
    body: UpdateInstructionTemplateDto
  ) {
    return this.instructionTemplatesService.update(id, body);
  }

  @Post(":id/duplicate")
  duplicate(
    @Param("id") id: string,
    @Body(createValidationPipe(DuplicateInstructionTemplateDto))
    body: DuplicateInstructionTemplateDto
  ) {
    return this.instructionTemplatesService.duplicate(id, body);
  }

  @Delete(":id")
  softDelete(@Param("id") id: string) {
    return this.instructionTemplatesService.softDelete(id);
  }
}
