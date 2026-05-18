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
import { CreateProductLineDto } from "./dto/create-product-line.dto";
import { UpdateProductLineStatusDto } from "./dto/update-product-line-status.dto";
import { UpdateProductLineDto } from "./dto/update-product-line.dto";
import { SettingsManagementService } from "./settings-management.service";

@Controller("api/product-lines")
export class ProductLinesController {
  constructor(
    @Inject(SettingsManagementService)
    private readonly settingsManagementService: SettingsManagementService
  ) {}

  @Get()
  listProductLines(
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.settingsManagementService.listProductLines(
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  createProductLine(
    @Body(createValidationPipe(CreateProductLineDto)) body: CreateProductLineDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.settingsManagementService.createProductLine(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  updateProductLine(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateProductLineDto)) body: UpdateProductLineDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.settingsManagementService.updateProductLine(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id/status")
  updateProductLineStatus(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateProductLineStatusDto)) body: UpdateProductLineStatusDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.settingsManagementService.updateProductLineStatus(
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
