import { Body, Controller, Get, Inject, Param, Patch, Post, Put } from "@nestjs/common";
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
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { SaveDepartmentModulePermissionsDto } from "./dto/save-department-module-permissions.dto";
import { UpdateDepartmentStatusDto } from "./dto/update-department-status.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { DepartmentsService } from "./departments.service";

@Controller("api/departments")
export class DepartmentsController {
  constructor(@Inject(DepartmentsService) private readonly departmentsService: DepartmentsService) {}

  @Get()
  listDepartments(
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.departmentsService.listDepartments(
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  createDepartment(
    @Body(createValidationPipe(CreateDepartmentDto)) body: CreateDepartmentDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.departmentsService.createDepartment(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  updateDepartment(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateDepartmentDto)) body: UpdateDepartmentDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.departmentsService.updateDepartment(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id/status")
  updateDepartmentStatus(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateDepartmentStatusDto)) body: UpdateDepartmentStatusDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.departmentsService.updateDepartmentStatus(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get(":id/module-permissions")
  getModulePermissions(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.departmentsService.getModulePermissions(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Put(":id/module-permissions")
  saveModulePermissions(
    @Param("id") id: string,
    @Body(createValidationPipe(SaveDepartmentModulePermissionsDto))
    body: SaveDepartmentModulePermissionsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.departmentsService.saveModulePermissions(
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
