import { KnowledgeReviewStatus, KnowledgeTrustLevel } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { toTags, trimOptionalString } from "./knowledge-dto-transforms";

export class UploadKnowledgeFileDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTags(value))
  applicableModules?: string[] = [];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  sourceDescription?: string;

  @IsOptional()
  @IsEnum(KnowledgeTrustLevel)
  trustLevel?: KnowledgeTrustLevel;

  @IsOptional()
  @IsEnum(KnowledgeReviewStatus)
  reviewStatus?: KnowledgeReviewStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTags(value))
  allowedDepartmentIds?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTags(value))
  tags?: string[] = [];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
