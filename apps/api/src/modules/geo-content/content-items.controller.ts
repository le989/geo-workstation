import { Body, Controller, Delete, Get, Inject, Param, Patch, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { ContentItemsService } from "./content-items.service";
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

  @Get(":id/export")
  exportMarkdown(@Param("id") id: string) {
    return this.contentItemsService.exportMarkdown(id);
  }
}
