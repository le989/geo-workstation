import { Body, Controller, Delete, Inject, Param, Patch } from "@nestjs/common";
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
import { UpdateKnowledgeChunkDto } from "./dto/update-knowledge-chunk.dto";
import { KnowledgeChunksService } from "./knowledge-chunks.service";

@Controller("api/knowledge-chunks")
export class KnowledgeChunksController {
  constructor(
    @Inject(KnowledgeChunksService) private readonly knowledgeChunksService: KnowledgeChunksService
  ) {}

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateKnowledgeChunkDto)) body: UpdateKnowledgeChunkDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeChunksService.update(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Delete(":id")
  softDelete(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeChunksService.softDelete(
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
