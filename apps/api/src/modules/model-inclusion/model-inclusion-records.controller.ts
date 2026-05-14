import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { CreateModelInclusionRecordDto } from "./dto/create-model-inclusion-record.dto";
import { ImportModelInclusionRecordsDto } from "./dto/import-model-inclusion-records.dto";
import { QueryModelInclusionRecordsDto } from "./dto/query-model-inclusion-records.dto";
import { QueryModelInclusionSummaryDto } from "./dto/query-model-inclusion-summary.dto";
import { QueryUncoveredPromptsDto } from "./dto/query-uncovered-prompts.dto";
import { WebSearchCheckDto } from "./dto/web-search-check.dto";
import { ModelInclusionRecordsService } from "./model-inclusion-records.service";

@Controller("api/model-inclusion-records")
export class ModelInclusionRecordsController {
  constructor(
    @Inject(ModelInclusionRecordsService)
    private readonly modelInclusionRecordsService: ModelInclusionRecordsService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryModelInclusionRecordsDto))
    query: QueryModelInclusionRecordsDto
  ) {
    return this.modelInclusionRecordsService.findMany(query);
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateModelInclusionRecordDto))
    body: CreateModelInclusionRecordDto
  ) {
    return this.modelInclusionRecordsService.create(body);
  }

  @Post("import")
  importRecords(
    @Body(createValidationPipe(ImportModelInclusionRecordsDto))
    body: ImportModelInclusionRecordsDto
  ) {
    return this.modelInclusionRecordsService.importRecords(body);
  }

  @Post("web-search-check")
  webSearchCheck(
    @Body(createValidationPipe(WebSearchCheckDto))
    body: WebSearchCheckDto
  ) {
    return this.modelInclusionRecordsService.webSearchCheck(body);
  }

  @Get("export")
  exportCsv(
    @Query(createValidationPipe(QueryModelInclusionRecordsDto))
    query: QueryModelInclusionRecordsDto
  ) {
    return this.modelInclusionRecordsService.exportCsv(query);
  }

  @Get("uncovered-prompts")
  findUncoveredPrompts(
    @Query(createValidationPipe(QueryUncoveredPromptsDto))
    query: QueryUncoveredPromptsDto
  ) {
    return this.modelInclusionRecordsService.findUncoveredPrompts(query);
  }

  @Get("summary")
  getSummary(
    @Query(createValidationPipe(QueryModelInclusionSummaryDto))
    query: QueryModelInclusionSummaryDto
  ) {
    return this.modelInclusionRecordsService.getSummary(query);
  }
}
