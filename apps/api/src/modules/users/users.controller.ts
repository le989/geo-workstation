import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
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
    @CurrentUser() user?: AuthUser
  ) {
    return this.usersService.listUsers(query, user);
  }

  @Post()
  createUser(
    @Body(createValidationPipe(CreateUserDto)) body: CreateUserDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.usersService.createUser(body, user);
  }

  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body(createValidationPipe(ResetPasswordDto)) body: ResetPasswordDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.usersService.resetPassword(id, body, user);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateUserStatusDto)) body: UpdateUserStatusDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.usersService.updateStatus(id, body, user);
  }

  @Patch(":id/memberships")
  updateMembership(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateUserMembershipDto)) body: UpdateUserMembershipDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.usersService.updateMembership(id, body, user);
  }
}
