import { Transform } from "class-transformer";
import { IsDate, IsOptional, IsString } from "class-validator";
import { toOptionalDate, trimOptionalString } from "./model-inclusion-dto-transforms";

export class QueryModelInclusionSummaryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  checkedFrom?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  checkedTo?: Date;
}
