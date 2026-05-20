import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException
} from "@nestjs/common";
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
import { AftersalesQaService } from "./aftersales-qa.service";
import { AskAftersalesQuestionDto } from "./dto/ask-aftersales-question.dto";
import { CreateAftersalesConversationDto } from "./dto/create-aftersales-conversation.dto";
import { QueryAftersalesConversationsDto } from "./dto/query-aftersales-conversations.dto";
import { QueryAftersalesRecordsDto } from "./dto/query-aftersales-records.dto";
import { UpdateAftersalesConversationDto } from "./dto/update-aftersales-conversation.dto";
import { UpdateAftersalesConversationStatusDto } from "./dto/update-aftersales-conversation-status.dto";

@Controller("api/aftersales-qa")
export class AftersalesQaController {
  constructor(@Inject(AftersalesQaService) private readonly service: AftersalesQaService) {}

  @Get("conversations")
  findConversations(
    @Query(createValidationPipe(QueryAftersalesConversationsDto))
    query: QueryAftersalesConversationsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.findConversations(query, this.buildContext(user, currentCompany, currentMembership));
  }

  @Post("conversations")
  createConversation(
    @Body(createValidationPipe(CreateAftersalesConversationDto))
    body: CreateAftersalesConversationDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.createConversation(body, this.buildContext(user, currentCompany, currentMembership));
  }

  @Get("conversations/:id")
  getConversation(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.getConversation(id, this.buildContext(user, currentCompany, currentMembership));
  }

  @Patch("conversations/:id")
  updateConversation(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateAftersalesConversationDto))
    body: UpdateAftersalesConversationDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.updateConversation(id, body, this.buildContext(user, currentCompany, currentMembership));
  }

  @Patch("conversations/:id/status")
  updateConversationStatus(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateAftersalesConversationStatusDto))
    body: UpdateAftersalesConversationStatusDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.updateConversationStatus(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("conversations/:id/ask")
  askInConversation(
    @Param("id") id: string,
    @Body(createValidationPipe(AskAftersalesQuestionDto)) body: AskAftersalesQuestionDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.askInConversation(id, body, this.buildContext(user, currentCompany, currentMembership));
  }

  @Post("ask")
  ask(
    @Body(createValidationPipe(AskAftersalesQuestionDto)) body: AskAftersalesQuestionDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.ask(body, this.buildContext(user, currentCompany, currentMembership));
  }

  @Get("records")
  findRecords(
    @Query(createValidationPipe(QueryAftersalesRecordsDto)) query: QueryAftersalesRecordsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.findRecords(query, this.buildContext(user, currentCompany, currentMembership));
  }

  @Get("records/:id")
  getRecord(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.service.getRecord(id, this.buildContext(user, currentCompany, currentMembership));
  }

  private buildContext(
    user?: AuthUser,
    currentCompany?: AuthCompanyOption,
    currentMembership?: CurrentMembershipContext
  ): ResourceAccessContext {
    const context = buildResourceAccessContext(user, currentCompany, currentMembership);

    if (!context) {
      throw new UnauthorizedException("请先登录");
    }

    return context;
  }
}
