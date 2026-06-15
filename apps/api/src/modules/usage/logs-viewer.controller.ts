import { Controller, Get, Inject, Param, Query, UnauthorizedException } from "@nestjs/common";
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
import {
  QueryLogsViewerAiCallLogsDto,
  QueryLogsViewerAiUsageRecordsDto,
  QueryLogsViewerOperationLogsDto
} from "./dto/query-logs-viewer.dto";
import { LogsViewerService } from "./logs-viewer.service";

@Controller("api/logs-viewer")
export class LogsViewerController {
  constructor(@Inject(LogsViewerService) private readonly logsViewerService: LogsViewerService) {}

  @Get("operation-logs")
  findOperationLogs(
    @Query(createValidationPipe(QueryLogsViewerOperationLogsDto))
    query: QueryLogsViewerOperationLogsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.logsViewerService.queryOperationLogs(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("operation-logs/:id")
  getOperationLog(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.logsViewerService.getOperationLogDetail(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("ai-usage-records")
  findAiUsageRecords(
    @Query(createValidationPipe(QueryLogsViewerAiUsageRecordsDto))
    query: QueryLogsViewerAiUsageRecordsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.logsViewerService.queryAiUsageRecords(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("ai-usage-records/:id")
  getAiUsageRecord(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.logsViewerService.getAiUsageRecordDetail(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("ai-call-logs")
  findAiCallLogs(
    @Query(createValidationPipe(QueryLogsViewerAiCallLogsDto))
    query: QueryLogsViewerAiCallLogsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.logsViewerService.queryAiCallLogs(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("ai-call-logs/:id")
  getAiCallLog(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.logsViewerService.getAiCallLogDetail(
      id,
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
