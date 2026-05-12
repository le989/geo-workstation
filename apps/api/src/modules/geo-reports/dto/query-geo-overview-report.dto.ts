import { Transform } from "class-transformer";
import { IsDate, IsOptional, IsString } from "class-validator";
import { toOptionalDate, trimOptionalString } from "./report-dto-transforms";

export class QueryGeoOverviewReportDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  from?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  to?: Date;
}
