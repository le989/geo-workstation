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
import { CreateModelInclusionRecordDto } from "./dto/create-model-inclusion-record.dto";
import { ImportModelInclusionRecordsDto } from "./dto/import-model-inclusion-records.dto";
import { QueryModelInclusionRecordsDto } from "./dto/query-model-inclusion-records.dto";
import { QueryModelInclusionSummaryDto } from "./dto/query-model-inclusion-summary.dto";
import { QueryUncoveredPromptsDto } from "./dto/query-uncovered-prompts.dto";
import { UpdateModelInclusionRecordDto } from "./dto/update-model-inclusion-record.dto";
import { VoidModelInclusionRecordDto } from "./dto/void-model-inclusion-record.dto";
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
    query: QueryModelInclusionRecordsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.findMany(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateModelInclusionRecordDto))
    body: CreateModelInclusionRecordDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.create(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  updateRecord(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateModelInclusionRecordDto))
    body: UpdateModelInclusionRecordDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.updateRecord(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id/void")
  voidRecord(
    @Param("id") id: string,
    @Body(createValidationPipe(VoidModelInclusionRecordDto))
    body: VoidModelInclusionRecordDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.voidRecord(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id/restore")
  restoreRecord(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.restoreRecord(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("import")
  importRecords(
    @Body(createValidationPipe(ImportModelInclusionRecordsDto))
    body: ImportModelInclusionRecordsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.importRecords(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("web-search-check")
  webSearchCheck(
    @Body(createValidationPipe(WebSearchCheckDto))
    body: WebSearchCheckDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.webSearchCheck(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("export")
  exportCsv(
    @Query(createValidationPipe(QueryModelInclusionRecordsDto))
    query: QueryModelInclusionRecordsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.exportCsv(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("uncovered-prompts")
  findUncoveredPrompts(
    @Query(createValidationPipe(QueryUncoveredPromptsDto))
    query: QueryUncoveredPromptsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.findUncoveredPrompts(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("summary")
  getSummary(
    @Query(createValidationPipe(QueryModelInclusionSummaryDto))
    query: QueryModelInclusionSummaryDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.modelInclusionRecordsService.getSummary(
      query,
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
