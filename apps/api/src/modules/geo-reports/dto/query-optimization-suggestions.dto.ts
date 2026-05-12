import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from "class-validator";
import { toOptionalInt, trimOptionalString } from "./report-dto-transforms";

export class QueryOptimizationSuggestionsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => toOptionalInt(value))
  priority?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(200)
  @Transform(({ value }) => toOptionalInt(value))
  limit?: number;
}
