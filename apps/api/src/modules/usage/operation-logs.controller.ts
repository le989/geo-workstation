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
import { QueryOperationLogsDto } from "./dto/query-operation-logs.dto";
import { OperationLogsService } from "./operation-logs.service";

@Controller("api/operation-logs")
export class OperationLogsController {
  constructor(
    @Inject(OperationLogsService) private readonly operationLogsService: OperationLogsService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryOperationLogsDto)) query: QueryOperationLogsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.operationLogsService.queryLogs(
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
