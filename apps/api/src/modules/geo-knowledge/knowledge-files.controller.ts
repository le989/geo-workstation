import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { ManualKnowledgeMaterialDto } from "./dto/manual-knowledge-material.dto";
import { QueryKnowledgeFilesDto } from "./dto/query-knowledge-files.dto";
import { ReparseKnowledgeFileDto } from "./dto/reparse-knowledge-file.dto";
import { UpdateKnowledgeFileMetadataDto } from "./dto/update-knowledge-file-metadata.dto";
import { UploadKnowledgeFileDto } from "./dto/upload-knowledge-file.dto";
import { KnowledgeFilesService } from "./knowledge-files.service";
import type { UploadedKnowledgeFile } from "./local-file-storage.service";

const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;

@Controller()
export class KnowledgeFilesController {
  constructor(
    @Inject(KnowledgeFilesService) private readonly knowledgeFilesService: KnowledgeFilesService
  ) {}

  @Post("api/knowledge-bases/:id/files")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: MAX_UPLOAD_FILE_SIZE
      }
    })
  )
  upload(
    @Param("id") id: string,
    @UploadedFile() file: UploadedKnowledgeFile | undefined,
    @Body(createValidationPipe(UploadKnowledgeFileDto)) body: UploadKnowledgeFileDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeFilesService.upload(
      id,
      file,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("api/knowledge-bases/:id/manual-materials")
  createManualMaterial(
    @Param("id") id: string,
    @Body(createValidationPipe(ManualKnowledgeMaterialDto)) body: ManualKnowledgeMaterialDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeFilesService.createManualMaterial(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("api/knowledge-bases/:id/files")
  findMany(
    @Param("id") id: string,
    @Query(createValidationPipe(QueryKnowledgeFilesDto)) query: QueryKnowledgeFilesDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeFilesService.findMany(
      id,
      query,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Get("api/knowledge-files/:id")
  getDetail(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeFilesService.getDetail(
      id,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Post("api/knowledge-files/:id/reparse")
  reparse(
    @Param("id") id: string,
    @Body(createValidationPipe(ReparseKnowledgeFileDto)) body: ReparseKnowledgeFileDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeFilesService.reparse(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Patch("api/knowledge-files/:id/metadata")
  updateMetadata(
    @Param("id") id: string,
    @Body(createValidationPipe(UpdateKnowledgeFileMetadataDto)) body: UpdateKnowledgeFileMetadataDto,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeFilesService.updateMetadata(
      id,
      body,
      this.buildContext(user, currentCompany, currentMembership)
    );
  }

  @Delete("api/knowledge-files/:id")
  softDelete(
    @Param("id") id: string,
    @CurrentUser() user?: AuthUser,
    @CurrentCompany() currentCompany?: AuthCompanyOption,
    @CurrentMembership() currentMembership?: CurrentMembershipContext
  ) {
    return this.knowledgeFilesService.softDelete(
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
