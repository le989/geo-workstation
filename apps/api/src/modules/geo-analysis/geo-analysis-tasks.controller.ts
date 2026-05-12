import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { ConvertAnalysisPromptsDto } from "./dto/convert-analysis-prompts.dto";
import { CreateAnalysisContentTaskDto } from "./dto/create-analysis-content-task.dto";
import { CreateGeoAnalysisTaskDto } from "./dto/create-geo-analysis-task.dto";
import { QueryGeoAnalysisTasksDto } from "./dto/query-geo-analysis-tasks.dto";
import { UpdateGeoAnalysisTaskDto } from "./dto/update-geo-analysis-task.dto";
import { GeoAnalysisTasksService } from "./geo-analysis-tasks.service";

@Controller("api/geo-analysis-tasks")
export class GeoAnalysisTasksController {
  constructor(
    @Inject(GeoAnalysisTasksService)
    private readonly geoAnalysisTasksService: GeoAnalysisTasksService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryGeoAnalysisTasksDto))
    query: QueryGeoAnalysisTasksDto
  ) {
    return this.geoAnalysisTasksService.findMany(query);
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateGeoAnalysisTaskDto))
    body: CreateGeoAnalysisTaskDto
  ) {
    return this.geoAnalysisTasksService.create(body);
  }

  @Get(":id")
  getDetail(@Param("id") id: string) {
    return this.geoAnalysisTasksService.getDetail(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateGeoAnalysisTaskDto))
    body: UpdateGeoAnalysisTaskDto
  ) {
    return this.geoAnalysisTasksService.update(id, body);
  }

  @Post(":id/run")
  run(@Param("id") id: string) {
    return this.geoAnalysisTasksService.run(id);
  }

  @Post(":id/convert-prompts")
  convertPrompts(
    @Param("id") id: string,
    @Body(createValidationPipe(ConvertAnalysisPromptsDto))
    body: ConvertAnalysisPromptsDto
  ) {
    return this.geoAnalysisTasksService.convertPrompts(id, body);
  }

  @Post(":id/create-content-task")
  createContentTask(
    @Param("id") id: string,
    @Body(createValidationPipe(CreateAnalysisContentTaskDto))
    body: CreateAnalysisContentTaskDto
  ) {
    return this.geoAnalysisTasksService.createContentTask(id, body);
  }
}
