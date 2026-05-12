import { Transform } from "class-transformer";
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import {
  toStringArray,
  trimOptionalString,
  trimRequiredString
} from "./geo-analysis-dto-transforms";

export class UpdateGeoAnalysisTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  brandName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => toStringArray(value))
  targetModels?: string[];
}
