import { GeoPromptType, UserIntent } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsNotEmpty
} from "class-validator";
import {
  trimOptionalString,
  trimRequiredString,
  toOptionalBoolean,
  toOptionalInt,
  toTargetModels
} from "./geo-prompt-dto-transforms";

export class CreateGeoPromptDto {
  @IsEnum(GeoPromptType)
  type!: GeoPromptType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  baseWord?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  promptText!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  scenario?: string;

  @IsEnum(UserIntent)
  userIntent!: UserIntent;

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
