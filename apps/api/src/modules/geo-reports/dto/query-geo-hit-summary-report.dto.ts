import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min
} from "class-validator";
import {
  toOptionalBoolean,
  toOptionalDate,
  toOptionalInt,
  trimOptionalString
} from "./report-dto-transforms";

export class QueryGeoHitSummaryReportDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  platform?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  entryPoint?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  from?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  to?: Date;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value) ?? true)
  latestOnly?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => toOptionalInt(value))
  priority?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  trackEnabled?: boolean;
}
