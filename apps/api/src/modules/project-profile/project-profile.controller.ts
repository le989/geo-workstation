import { Body, Controller, Get, Inject, Patch, Post } from "@nestjs/common";
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
import { CreateProjectProfileDto } from "./dto/create-project-profile.dto";
import { UpdateProjectProfileDto } from "./dto/update-project-profile.dto";
import { ProjectProfileService } from "./project-profile.service";

@Controller("api/project-profile")
export class ProjectProfileController {
  constructor(
    @Inject(ProjectProfileService) private readonly projectProfileService: ProjectProfileService
  ) {}

  @Get()
  getCurrent(
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.projectProfileService.getCurrent(
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  create(
    @Body() body: CreateProjectProfileDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.projectProfileService.create(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch()
  update(
    @Body() body: UpdateProjectProfileDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.projectProfileService.update(
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
