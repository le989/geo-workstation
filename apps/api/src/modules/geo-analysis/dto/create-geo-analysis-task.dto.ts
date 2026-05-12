import { Transform } from "class-transformer";
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import {
  toStringArray,
  trimOptionalString,
  trimRequiredString
} from "./geo-analysis-dto-transforms";

export class CreateGeoAnalysisTaskDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  brandName!: string;

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
  @Transform(({ value }) => toStringArray(value))
  baseWords?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => toStringArray(value))
  targetModels!: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
