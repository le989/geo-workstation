import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
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
import { CreateUserDto } from "./dto/create-user.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserMembershipDto } from "./dto/update-user-membership.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UsersService } from "./users.service";

@Controller("api/users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  listUsers(
    @Query(createValidationPipe(ListUsersDto)) query: ListUsersDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.usersService.listUsers(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  createUser(
    @Body(createValidationPipe(CreateUserDto)) body: CreateUserDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.usersService.createUser(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body(createValidationPipe(ResetPasswordDto)) body: ResetPasswordDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.usersService.resetPassword(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateUserStatusDto)) body: UpdateUserStatusDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.usersService.updateStatus(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id/memberships")
  updateMembership(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateUserMembershipDto)) body: UpdateUserMembershipDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.usersService.updateMembership(
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
