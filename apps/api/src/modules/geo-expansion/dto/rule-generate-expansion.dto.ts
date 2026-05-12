import { GeoPromptType, UserIntent } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import {
  toOptionalBoolean,
  toOptionalInt,
  toStringArray,
  toTargetModels,
  trimOptionalString,
  trimRequiredString
} from "./expansion-dto-transforms";

export class RuleGenerateExpansionDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  baseWord!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  prefixes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  serviceSuffixes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  applicationSuffixes?: string[];

  @IsOptional()
  @IsEnum(GeoPromptType)
  promptType?: GeoPromptType = GeoPromptType.distilled;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  scenario?: string;

  @IsOptional()
  @IsEnum(UserIntent)
  userIntent?: UserIntent;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => toOptionalInt(value))
  priority?: number = 3;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTargetModels(value))
  targetModels?: string[] = [];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  source?: string = "rule_expansion";

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  trackEnabled?: boolean = false;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
