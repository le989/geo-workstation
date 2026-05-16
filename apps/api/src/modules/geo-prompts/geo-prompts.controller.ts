import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentCompany } from "../auth/current-company.decorator";
import { CurrentMembership } from "../auth/current-membership.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  buildResourceAccessContext,
  type ResourceAccessContext
} from "../auth/auth-policy";
import type {
  AuthCompanyOption,
  AuthUser,
  CurrentMembershipContext
} from "../auth/auth.types";
import { BulkImportGeoPromptsDto } from "./dto/bulk-import-geo-prompts.dto";
import { CreateGeoPromptDto } from "./dto/create-geo-prompt.dto";
import { QueryGeoPromptsDto } from "./dto/query-geo-prompts.dto";
import { UpdateGeoPromptDto } from "./dto/update-geo-prompt.dto";
import { GeoPromptsService } from "./geo-prompts.service";

@Controller("api/geo-prompts")
export class GeoPromptsController {
  constructor(@Inject(GeoPromptsService) private readonly geoPromptsService: GeoPromptsService) {}

  @Get()
  findMany(
    @Query() query: QueryGeoPromptsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoPromptsService.findMany(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("export")
  exportCsv(
    @Query() query: QueryGeoPromptsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoPromptsService.exportCsv(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  create(
    @Body() body: CreateGeoPromptDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoPromptsService.create(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("bulk-import")
  bulkImport(
    @Body() body: BulkImportGeoPromptsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoPromptsService.bulkImport(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: UpdateGeoPromptDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoPromptsService.update(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Delete(":id")
  softDelete(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoPromptsService.softDelete(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  private buildContext(
    user?: AuthUser,
    currentCompany?: AuthCompanyOption,
    currentMembership?: CurrentMembershipContext
  ): ResourceAccessContext | undefined {
    return buildResourceAccessContext(user, currentCompany, currentMembership);
  }
}
