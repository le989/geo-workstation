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
  trimOptionalString,
  trimRequiredString,
  toOptionalBoolean,
  toOptionalInt,
  toTargetModels
} from "./geo-prompt-dto-transforms";

export class UpdateGeoPromptDto {
  @IsOptional()
  @IsEnum(GeoPromptType)
  type?: GeoPromptType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  baseWord?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  promptText?: string;

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
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTargetModels(value))
  targetModels?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  source?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  trackEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  latestCoverageStatus?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
