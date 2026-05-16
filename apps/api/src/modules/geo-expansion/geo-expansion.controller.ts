import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
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
import { AiGenerateExpansionDto } from "./dto/ai-generate-expansion.dto";
import { RuleGenerateExpansionDto } from "./dto/rule-generate-expansion.dto";
import { SaveExpansionCandidatesDto } from "./dto/save-expansion-candidates.dto";
import { GeoExpansionService } from "./geo-expansion.service";

@Controller("api/expansion")
export class GeoExpansionController {
  constructor(
    @Inject(GeoExpansionService) private readonly geoExpansionService: GeoExpansionService
  ) {}

  @Post("rule-generate")
  ruleGenerate(
    @Body(createValidationPipe(RuleGenerateExpansionDto)) body: RuleGenerateExpansionDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoExpansionService.ruleGenerate(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("ai-generate")
  aiGenerate(
    @Body(createValidationPipe(AiGenerateExpansionDto)) body: AiGenerateExpansionDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoExpansionService.aiGenerate(
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("jobs/:id")
  getJob(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoExpansionService.getJob(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("jobs/:id/save-candidates")
  saveCandidates(
    @Param("id") id: string,
    @Body(createValidationPipe(SaveExpansionCandidatesDto)) body: SaveExpansionCandidatesDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.geoExpansionService.saveCandidates(
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
