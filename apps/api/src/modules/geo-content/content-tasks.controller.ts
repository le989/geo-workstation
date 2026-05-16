import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
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
import { CreateContentTaskDto } from "./dto/create-content-task.dto";
import { QueryContentTasksDto } from "./dto/query-content-tasks.dto";
import { ContentTasksService } from "./content-tasks.service";

@Controller("api/content-tasks")
export class ContentTasksController {
  constructor(
    @Inject(ContentTasksService) private readonly contentTasksService: ContentTasksService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryContentTasksDto)) query: QueryContentTasksDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentTasksService.findMany(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateContentTaskDto)) body: CreateContentTaskDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentTasksService.create(
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
    return this.contentTasksService.getDetail(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/retry")
  retry(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentTasksService.retry(
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
