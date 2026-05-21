import { KnowledgeMaterialType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength
} from "class-validator";
import { toTags, trimOptionalString, trimRequiredString } from "../../geo-knowledge/dto/knowledge-dto-transforms";

export class ConvertFeedbackKnowledgeDraftDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  knowledgeBaseId!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  title!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  directoryId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @Transform(({ value }) => trimRequiredString(value))
  content!: string;

  @IsOptional()
  @IsEnum(KnowledgeMaterialType)
  materialType?: KnowledgeMaterialType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialTopic?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  sourceDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTags(value))
  applicableModules?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTags(value))
  allowedDepartmentIds?: string[] = [];
}
