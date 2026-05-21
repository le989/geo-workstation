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
import { CreateKnowledgeDirectoryDto } from "./dto/create-knowledge-directory.dto";
import { UpdateKnowledgeDirectoryDto } from "./dto/update-knowledge-directory.dto";
import { KnowledgeDirectoriesService } from "./knowledge-directories.service";

@Controller()
export class KnowledgeDirectoriesController {
  constructor(
    @Inject(KnowledgeDirectoriesService)
    private readonly knowledgeDirectoriesService: KnowledgeDirectoriesService
  ) {}

  @Get("api/knowledge-bases/:id/directories")
  findMany(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeDirectoriesService.findMany(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("api/knowledge-bases/:id/directories")
  create(
    @Param("id") id: string,
    @Body(createValidationPipe(CreateKnowledgeDirectoryDto)) body: CreateKnowledgeDirectoryDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeDirectoriesService.create(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch("api/knowledge-directories/:id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateKnowledgeDirectoryDto)) body: UpdateKnowledgeDirectoryDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeDirectoriesService.update(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch("api/knowledge-directories/:id/disable")
  disable(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeDirectoriesService.disable(
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
