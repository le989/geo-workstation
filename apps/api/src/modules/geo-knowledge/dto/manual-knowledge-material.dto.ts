import { KnowledgeReviewStatus, KnowledgeTrustLevel } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength
} from "class-validator";
import { toTags, trimOptionalString, trimRequiredString } from "./knowledge-dto-transforms";

export class ManualKnowledgeMaterialDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @Transform(({ value }) => trimRequiredString(value))
  content!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  directoryId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialTopic?: string;

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
