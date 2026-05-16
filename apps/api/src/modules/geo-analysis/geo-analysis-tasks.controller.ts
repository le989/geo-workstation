import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import {
  buildResourceAccessContext,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { CurrentCompany } from "../auth/current-company.decorator";
import { CurrentMembership } from "../auth/current-membership.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type {
  AuthCompanyOption,
  AuthUser,
  CurrentMembershipContext
} from "../auth/auth.types";
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
    query: QueryGeoAnalysisTasksDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoAnalysisTasksService.findMany(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateGeoAnalysisTaskDto))
    body: CreateGeoAnalysisTaskDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoAnalysisTasksService.create(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get(":id")
  getDetail(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoAnalysisTasksService.getDetail(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateGeoAnalysisTaskDto))
    body: UpdateGeoAnalysisTaskDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoAnalysisTasksService.update(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/run")
  run(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoAnalysisTasksService.run(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/convert-prompts")
  convertPrompts(
    @Param("id") id: string,
    @Body(createValidationPipe(ConvertAnalysisPromptsDto))
    body: ConvertAnalysisPromptsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoAnalysisTasksService.convertPrompts(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/create-content-task")
  createContentTask(
    @Param("id") id: string,
    @Body(createValidationPipe(CreateAnalysisContentTaskDto))
    body: CreateAnalysisContentTaskDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoAnalysisTasksService.createContentTask(
      id,
      body,
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
