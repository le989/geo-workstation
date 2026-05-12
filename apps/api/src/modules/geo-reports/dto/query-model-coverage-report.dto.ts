import { Transform } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import {
  GEO_PROMPT_TYPE_VALUES,
  toOptionalDate,
  trimOptionalString
} from "./report-dto-transforms";

export class QueryModelCoverageReportDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsEnum(GEO_PROMPT_TYPE_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  promptType?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  from?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  to?: Date;
}
