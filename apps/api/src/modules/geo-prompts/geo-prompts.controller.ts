import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { BulkImportGeoPromptsDto } from "./dto/bulk-import-geo-prompts.dto";
import { CreateGeoPromptDto } from "./dto/create-geo-prompt.dto";
import { QueryGeoPromptsDto } from "./dto/query-geo-prompts.dto";
import { UpdateGeoPromptDto } from "./dto/update-geo-prompt.dto";
import { GeoPromptsService } from "./geo-prompts.service";

@Controller("api/geo-prompts")
export class GeoPromptsController {
  constructor(@Inject(GeoPromptsService) private readonly geoPromptsService: GeoPromptsService) {}

  @Get()
  findMany(@Query() query: QueryGeoPromptsDto) {
    return this.geoPromptsService.findMany(query);
  }

  @Get("export")
  exportCsv(@Query() query: QueryGeoPromptsDto) {
    return this.geoPromptsService.exportCsv(query);
  }

  @Post()
  create(@Body() body: CreateGeoPromptDto) {
    return this.geoPromptsService.create(body);
  }

  @Post("bulk-import")
  bulkImport(@Body() body: BulkImportGeoPromptsDto) {
    return this.geoPromptsService.bulkImport(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateGeoPromptDto) {
    return this.geoPromptsService.update(id, body);
  }

  @Delete(":id")
  softDelete(@Param("id") id: string) {
    return this.geoPromptsService.softDelete(id);
  }
}
