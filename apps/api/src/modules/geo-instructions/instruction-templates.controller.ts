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
import { CreateInstructionTemplateDto } from "./dto/create-instruction-template.dto";
import { DuplicateInstructionTemplateDto } from "./dto/duplicate-instruction-template.dto";
import { QueryInstructionTemplatesDto } from "./dto/query-instruction-templates.dto";
import { UpdateInstructionTemplateDto } from "./dto/update-instruction-template.dto";
import { InstructionTemplatesService } from "./instruction-templates.service";

@Controller("api/instruction-templates")
export class InstructionTemplatesController {
  constructor(
    @Inject(InstructionTemplatesService)
    private readonly instructionTemplatesService: InstructionTemplatesService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryInstructionTemplatesDto))
    query: QueryInstructionTemplatesDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.instructionTemplatesService.findMany(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post()
  create(
    @Body(createValidationPipe(CreateInstructionTemplateDto))
    body: CreateInstructionTemplateDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.instructionTemplatesService.create(
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
    return this.instructionTemplatesService.getDetail(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateInstructionTemplateDto))
    body: UpdateInstructionTemplateDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.instructionTemplatesService.update(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/duplicate")
  duplicate(
    @Param("id") id: string,
    @Body(createValidationPipe(DuplicateInstructionTemplateDto))
    body: DuplicateInstructionTemplateDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.instructionTemplatesService.duplicate(
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
    return this.instructionTemplatesService.softDelete(
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
