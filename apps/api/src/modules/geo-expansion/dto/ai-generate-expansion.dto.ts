import { GeoPromptType, UserIntent } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  NotEquals
} from "class-validator";
import {
  toOptionalInt,
  toTargetModels,
  trimOptionalString,
  trimRequiredString
} from "./expansion-dto-transforms";

export class AiGenerateExpansionDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  baseWord!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  knowledgeBaseId?: string;

  @IsEnum(GeoPromptType)
  @NotEquals(GeoPromptType.base)
  promptType!: GeoPromptType;

  @IsOptional()
  @IsEnum(UserIntent)
  userIntent?: UserIntent;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  scenario?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => toOptionalInt(value))
  count?: number = 10;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  constraints?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTargetModels(value))
  targetModels?: string[] = [];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  provider?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
