import { Transform } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsOptional, IsPositive, IsString, Max } from "class-validator";
import {
  TASK_STATUS_VALUES,
  toOptionalDate,
  toOptionalInt,
  trimOptionalString
} from "./geo-analysis-dto-transforms";

export class QueryGeoAnalysisTasksDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => toOptionalInt(value))
  page?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(100)
  @Transform(({ value }) => toOptionalInt(value))
  pageSize?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  search?: string;

  @IsOptional()
  @IsEnum(TASK_STATUS_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  status?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  targetModel?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  createdFrom?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  createdTo?: Date;
}
