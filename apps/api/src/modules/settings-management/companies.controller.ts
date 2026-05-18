import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
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
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyStatusDto } from "./dto/update-company-status.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { SettingsManagementService } from "./settings-management.service";

@Controller("api/companies")
export class CompaniesController {
  constructor(
    @Inject(SettingsManagementService)
    private readonly settingsManagementService: SettingsManagementService
  ) {}

  @Get()
  listCompanies(
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.settingsManagementService.listCompanies(
      this.buildContext(user, currentCompany, currentMembership),
      user
    );
  }

  @Post()
  createCompany(
    @Body(createValidationPipe(CreateCompanyDto)) body: CreateCompanyDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.settingsManagementService.createCompany(body, user);
  }

  @Patch(":id")
  updateCompany(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateCompanyDto)) body: UpdateCompanyDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.settingsManagementService.updateCompany(id, body, user);
  }

  @Patch(":id/status")
  updateCompanyStatus(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateCompanyStatusDto)) body: UpdateCompanyStatusDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.settingsManagementService.updateCompanyStatus(id, body, user);
  }

  private buildContext(
    user?: AuthUser,
    currentCompany?: AuthCompanyOption,
    currentMembership?: CurrentMembershipContext
  ): ResourceAccessContext | undefined {
    return buildResourceAccessContext(user, currentCompany, currentMembership);
  }
}
