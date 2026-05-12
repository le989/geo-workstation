import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { CreateContentTaskDto } from "./dto/create-content-task.dto";
import { QueryContentTasksDto } from "./dto/query-content-tasks.dto";
import { ContentTasksService } from "./content-tasks.service";

@Controller("api/content-tasks")
export class ContentTasksController {
  constructor(
    @Inject(ContentTasksService) private readonly contentTasksService: ContentTasksService
  ) {}

  @Get()
  findMany(@Query(createValidationPipe(QueryContentTasksDto)) query: QueryContentTasksDto) {
    return this.contentTasksService.findMany(query);
  }

  @Post()
  create(@Body(createValidationPipe(CreateContentTaskDto)) body: CreateContentTaskDto) {
    return this.contentTasksService.create(body);
  }

  @Get(":id")
  getDetail(@Param("id") id: string) {
    return this.contentTasksService.getDetail(id);
  }

  @Post(":id/retry")
  retry(@Param("id") id: string) {
    return this.contentTasksService.retry(id);
  }
}
