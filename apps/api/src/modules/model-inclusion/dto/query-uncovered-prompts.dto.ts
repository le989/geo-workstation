import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max
} from "class-validator";
import {
  GEO_PROMPT_TYPE_VALUES,
  USER_INTENT_VALUES,
  toOptionalBoolean,
  toOptionalDate,
  toOptionalInt,
  trimOptionalString
} from "./model-inclusion-dto-transforms";

export class QueryUncoveredPromptsDto {
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
  @IsEnum(USER_INTENT_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  userIntent?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  trackEnabled?: boolean;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  checkedFrom?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  checkedTo?: Date;
}
