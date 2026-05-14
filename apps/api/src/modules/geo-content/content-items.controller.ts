import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { ContentItemsService } from "./content-items.service";
import { ContentQualityCheckDto } from "./dto/content-quality-check.dto";
import { FormatContentItemForPublishDto } from "./dto/format-content-item-for-publish.dto";
import { OptimizeContentItemForPublishDto } from "./dto/optimize-content-item-for-publish.dto";
import { QueryContentItemsDto } from "./dto/query-content-items.dto";
import { UpdateContentItemDto } from "./dto/update-content-item.dto";

@Controller("api/content-items")
export class ContentItemsController {
  constructor(
    @Inject(ContentItemsService) private readonly contentItemsService: ContentItemsService
  ) {}

  @Get()
  findMany(@Query(createValidationPipe(QueryContentItemsDto)) query: QueryContentItemsDto) {
    return this.contentItemsService.findMany(query);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateContentItemDto)) body: UpdateContentItemDto
  ) {
    return this.contentItemsService.update(id, body);
  }

  @Delete(":id")
  softDelete(@Param("id") id: string) {
    return this.contentItemsService.softDelete(id);
  }

  @Post(":id/quality-check")
  qualityCheck(
    @Param("id") id: string,
    @Body(createValidationPipe(ContentQualityCheckDto)) body: ContentQualityCheckDto
  ) {
    return this.contentItemsService.qualityCheck(id, body);
  }

  @Post(":id/optimize-for-publish")
  optimizeForPublish(
    @Param("id") id: string,
    @Body(createValidationPipe(OptimizeContentItemForPublishDto))
    body: OptimizeContentItemForPublishDto
  ) {
    return this.contentItemsService.optimizeForPublish(id, body);
  }

  @Post(":id/format-for-publish")
  formatForPublish(
    @Param("id") id: string,
    @Body(createValidationPipe(FormatContentItemForPublishDto)) body: FormatContentItemForPublishDto
  ) {
    return this.contentItemsService.formatForPublish(id, body);
  }

  @Get(":id/export")
  exportMarkdown(@Param("id") id: string) {
    return this.contentItemsService.exportMarkdown(id);
  }
}
