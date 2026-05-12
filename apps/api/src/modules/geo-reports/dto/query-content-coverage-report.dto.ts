import { Transform } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { TASK_STATUS_VALUES, toOptionalDate, trimOptionalString } from "./report-dto-transforms";

export class QueryContentCoverageReportDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  generationType?: string;

  @IsOptional()
  @IsEnum(TASK_STATUS_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  status?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  from?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  to?: Date;
}
