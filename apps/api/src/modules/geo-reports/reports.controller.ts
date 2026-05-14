import { Controller, Get, Inject, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
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
    query: QueryGeoOverviewReportDto
  ) {
    return this.reportsService.getGeoOverview(query);
  }

  @Get("prompt-coverage")
  getPromptCoverage(
    @Query(createValidationPipe(QueryPromptCoverageReportDto))
    query: QueryPromptCoverageReportDto
  ) {
    return this.reportsService.getPromptCoverage(query);
  }

  @Get("model-coverage")
  getModelCoverage(
    @Query(createValidationPipe(QueryModelCoverageReportDto))
    query: QueryModelCoverageReportDto
  ) {
    return this.reportsService.getModelCoverage(query);
  }

  @Get("geo-hit-summary")
  getGeoHitSummary(
    @Query(createValidationPipe(QueryGeoHitSummaryReportDto))
    query: QueryGeoHitSummaryReportDto
  ) {
    return this.reportsService.getGeoHitSummary(query);
  }

  @Get("content-coverage")
  getContentCoverage(
    @Query(createValidationPipe(QueryContentCoverageReportDto))
    query: QueryContentCoverageReportDto
  ) {
    return this.reportsService.getContentCoverage(query);
  }

  @Get("knowledge-coverage")
  getKnowledgeCoverage(
    @Query(createValidationPipe(QueryKnowledgeCoverageReportDto))
    query: QueryKnowledgeCoverageReportDto
  ) {
    return this.reportsService.getKnowledgeCoverage(query);
  }

  @Get("optimization-suggestions")
  getOptimizationSuggestions(
    @Query(createValidationPipe(QueryOptimizationSuggestionsDto))
    query: QueryOptimizationSuggestionsDto
  ) {
    return this.reportsService.getOptimizationSuggestions(query);
  }

  @Get("export")
  exportReport(@Query(createValidationPipe(ExportReportDto)) query: ExportReportDto) {
    return this.reportsService.exportReport(query);
  }
}
