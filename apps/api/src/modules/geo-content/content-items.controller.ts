import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
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
import { ContentItemsService } from "./content-items.service";
import { ContentQualityCheckDto } from "./dto/content-quality-check.dto";
import { FormatContentItemForPublishDto } from "./dto/format-content-item-for-publish.dto";
import { OptimizeContentItemForPublishDto } from "./dto/optimize-content-item-for-publish.dto";
import { QueryContentItemsDto } from "./dto/query-content-items.dto";
import { UpdateContentItemDto } from "./dto/update-content-item.dto";

@Controller("api/content-items")
export class ContentItemsController {
  constructor(
    @Inject(ContentItemsService) private readonly contentItemsService: ContentItemsService
  ) {}

  @Get()
  findMany(
    @Query(createValidationPipe(QueryContentItemsDto)) query: QueryContentItemsDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentItemsService.findMany(
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateContentItemDto)) body: UpdateContentItemDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentItemsService.update(
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
    return this.contentItemsService.softDelete(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/quality-check")
  qualityCheck(
    @Param("id") id: string,
    @Body(createValidationPipe(ContentQualityCheckDto)) body: ContentQualityCheckDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentItemsService.qualityCheck(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/optimize-for-publish")
  optimizeForPublish(
    @Param("id") id: string,
    @Body(createValidationPipe(OptimizeContentItemForPublishDto))
    body: OptimizeContentItemForPublishDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentItemsService.optimizeForPublish(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/format-for-publish")
  formatForPublish(
    @Param("id") id: string,
    @Body(createValidationPipe(FormatContentItemForPublishDto)) body: FormatContentItemForPublishDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentItemsService.formatForPublish(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post(":id/publish-package")
  generatePublishPackage(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.contentItemsService.generatePublishPackage(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get(":id/publish-package/export")
  exportPublishPackage(
    @Param("id") id: string,
    @Query("format") format: string | undefined,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    const normalizedFormat = format === "txt" ? "txt" : format === "markdown" || !format ? "markdown" : null;

    if (!normalizedFormat) {
      throw new BadRequestException("发布包导出格式仅支持 markdown 或 txt。");
    }

    return this.contentItemsService.exportPublishPackage(
      id,
      normalizedFormat,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get(":id/export")
  exportMarkdown(
    @Param("id") id: string,
    @Query("type") type: string | undefined,
    @Query("format") format: string | undefined,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    const normalizedType = type === "publish" ? "publish" : type === "review" || !type ? "review" : null;
    const normalizedFormat = format === "txt" ? "txt" : format === "markdown" || !format ? "markdown" : null;

    if (!normalizedType) {
      throw new BadRequestException("内容导出类型仅支持 review 或 publish。");
    }

    if (!normalizedFormat) {
      throw new BadRequestException("内容导出格式仅支持 markdown 或 txt。");
    }

    return this.contentItemsService.exportContentItem(
      id,
      {
        type: normalizedType,
        format: normalizedFormat
      },
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
