import { Controller, Get, Inject, Query, UnauthorizedException } from "@nestjs/common";
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
import { ExportReportDto } from "./dto/export-report.dto";
import { QueryContentCoverageReportDto } from "./dto/query-content-coverage-report.dto";
import { QueryGeoHitSummaryReportDto } from "./dto/query-geo-hit-summary-report.dto";
import { QueryGeoOverviewReportDto } from "./dto/query-geo-overview-report.dto";
import { QueryKnowledgeCoverageReportDto } from "./dto/query-knowledge-coverage-report.dto";
import { QueryModelCoverageReportDto } from "./dto/query-model-coverage-report.dto";
import { QueryOptimizationSuggestionsDto } from "./dto/query-optimization-suggestions.dto";
import { QueryPromptCoverageReportDto } from "./dto/query-prompt-coverage-report.dto";
import { ReportsService } from "./reports.service";

@Controller("api/reports")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get("geo-overview")
  getGeoOverview(
    @Query(createValidationPipe(QueryGeoOverviewReportDto))
    query: QueryGeoOverviewReportDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.getGeoOverview(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("prompt-coverage")
  getPromptCoverage(
    @Query(createValidationPipe(QueryPromptCoverageReportDto))
    query: QueryPromptCoverageReportDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.getPromptCoverage(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("model-coverage")
  getModelCoverage(
    @Query(createValidationPipe(QueryModelCoverageReportDto))
    query: QueryModelCoverageReportDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.getModelCoverage(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("geo-hit-summary")
  getGeoHitSummary(
    @Query(createValidationPipe(QueryGeoHitSummaryReportDto))
    query: QueryGeoHitSummaryReportDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.getGeoHitSummary(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("content-coverage")
  getContentCoverage(
    @Query(createValidationPipe(QueryContentCoverageReportDto))
    query: QueryContentCoverageReportDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.getContentCoverage(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("knowledge-coverage")
  getKnowledgeCoverage(
    @Query(createValidationPipe(QueryKnowledgeCoverageReportDto))
    query: QueryKnowledgeCoverageReportDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.getKnowledgeCoverage(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("optimization-suggestions")
  getOptimizationSuggestions(
    @Query(createValidationPipe(QueryOptimizationSuggestionsDto))
    query: QueryOptimizationSuggestionsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.getOptimizationSuggestions(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("export")
  exportReport(
    @Query(createValidationPipe(ExportReportDto)) query: ExportReportDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.reportsService.exportReport(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  private buildContext(
    user?: AuthUser,
    currentCompany?: AuthCompanyOption,
    currentMembership?: CurrentMembershipContext
  ): ResourceAccessContext {
    const context = buildResourceAccessContext(user, currentCompany, currentMembership);

    if (!context) {
      throw new UnauthorizedException("请先登录");
    }

    return context;
  }
}
