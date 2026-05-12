import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString, MinLength } from "class-validator";
import { toStringArray, trimOptionalString, trimRequiredString } from "./content-dto-transforms";

export class UpdateContentItemDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @Transform(({ value }) => trimRequiredString(value))
  body?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  geoOptimizationPoints?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  suggestedPublishChannel?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  status?: string;
}
