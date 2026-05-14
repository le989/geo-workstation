import { Transform } from "class-transformer";
import { IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import {
  GEO_PROMPT_TYPE_VALUES,
  REPORT_TYPE_VALUES,
  TASK_STATUS_VALUES,
  USER_INTENT_VALUES,
  toOptionalBoolean,
  toOptionalDate,
  toOptionalInt,
  trimOptionalString,
  type ReportType
} from "./report-dto-transforms";

export class ExportReportDto {
  @IsEnum(REPORT_TYPE_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  reportType!: ReportType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  platform?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  entryPoint?: string;

  @IsOptional()
  @IsEnum(GEO_PROMPT_TYPE_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  promptType?: string;

  @IsOptional()
  @IsEnum(USER_INTENT_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  userIntent?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  trackEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => toOptionalInt(value))
  priority?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  generationType?: string;

  @IsOptional()
  @IsEnum(TASK_STATUS_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  status?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Transform(({ value }) => toOptionalInt(value))
  limit?: number;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  from?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  to?: Date;
}
