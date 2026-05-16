import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
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
import { CreateKnowledgeBaseDto } from "./dto/create-knowledge-base.dto";
import { QueryKnowledgeBasesDto } from "./dto/query-knowledge-bases.dto";
import { QueryKnowledgeChunksDto } from "./dto/query-knowledge-chunks.dto";
import { TextImportKnowledgeDto } from "./dto/text-import-knowledge.dto";
import { UpdateKnowledgeBaseDto } from "./dto/update-knowledge-base.dto";
import { KnowledgeBasesService } from "./knowledge-bases.service";
import { KnowledgeChunksService } from "./knowledge-chunks.service";

@Controller("api/knowledge-bases")
export class KnowledgeBasesController {
  constructor(
    @Inject(KnowledgeBasesService) private readonly knowledgeBasesService: KnowledgeBasesService,
    @Inject(KnowledgeChunksService) private readonly knowledgeChunksService: KnowledgeChunksService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryKnowledgeBasesDto)) query: QueryKnowledgeBasesDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeBasesService.findMany(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateKnowledgeBaseDto)) body: CreateKnowledgeBaseDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeBasesService.create(
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
    return this.knowledgeBasesService.getDetail(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateKnowledgeBaseDto)) body: UpdateKnowledgeBaseDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeBasesService.update(
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
    return this.knowledgeBasesService.softDelete(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/text-import")
  textImport(
    @Param("id") id: string,
    @Body(createValidationPipe(TextImportKnowledgeDto)) body: TextImportKnowledgeDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeBasesService.textImport(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get(":id/chunks")
  findChunks(
    @Param("id") id: string,
    @Query(createValidationPipe(QueryKnowledgeChunksDto)) query: QueryKnowledgeChunksDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeChunksService.findMany(
      id,
      query,
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
