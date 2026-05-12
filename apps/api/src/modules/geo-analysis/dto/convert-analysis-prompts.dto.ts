import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
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
  toOptionalInt,
  toStringArray,
  trimOptionalString
} from "./geo-analysis-dto-transforms";

export class ConvertAnalysisPromptsDto {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  selectedPromptTexts?: string[];

  @IsOptional()
  @IsEnum(GEO_PROMPT_TYPE_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  promptType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsEnum(USER_INTENT_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  userIntent?: string;

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

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
