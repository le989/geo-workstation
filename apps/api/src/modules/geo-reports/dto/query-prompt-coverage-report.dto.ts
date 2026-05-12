import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min
} from "class-validator";
import {
  GEO_PROMPT_TYPE_VALUES,
  USER_INTENT_VALUES,
  toOptionalBoolean,
  toOptionalDate,
  toOptionalInt,
  trimOptionalString
} from "./report-dto-transforms";

export class QueryPromptCoverageReportDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

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
  @IsPositive()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => toOptionalInt(value))
  priority?: number;

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
