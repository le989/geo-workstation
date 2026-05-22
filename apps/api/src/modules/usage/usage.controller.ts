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
import { AiUsageService } from "./ai-usage.service";
import { QueryUsageDto, QueryUsageTrendDto } from "./dto/query-usage.dto";

@Controller("api/usage")
export class UsageController {
  constructor(@Inject(AiUsageService) private readonly aiUsageService: AiUsageService) {}

  @Get("summary")
  getSummary(
    @Query(createValidationPipe(QueryUsageDto)) query: QueryUsageDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.aiUsageService.querySummary(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("ai-summary")
  getAiSummary(
    @Query(createValidationPipe(QueryUsageDto)) query: QueryUsageDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.aiUsageService.queryAiSummary(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("trends")
  getTrends(
    @Query(createValidationPipe(QueryUsageTrendDto)) query: QueryUsageTrendDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.aiUsageService.queryTrend(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("by-user")
  getByUser(
    @Query(createValidationPipe(QueryUsageDto)) query: QueryUsageDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.aiUsageService.queryByUser(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("by-department")
  getByDepartment(
    @Query(createValidationPipe(QueryUsageDto)) query: QueryUsageDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.aiUsageService.queryByDepartment(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("by-module")
  getByModule(
    @Query(createValidationPipe(QueryUsageDto)) query: QueryUsageDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.aiUsageService.queryByModule(
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
