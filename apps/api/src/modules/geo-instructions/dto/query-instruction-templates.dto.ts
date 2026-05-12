import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Max } from "class-validator";
import {
  GEO_PROMPT_TYPE_VALUES,
  toOptionalInt,
  trimOptionalString
} from "./instruction-template-dto-transforms";

export class QueryInstructionTemplatesDto {
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
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  instructionType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  contentType?: string;

  @IsOptional()
  @IsEnum(GEO_PROMPT_TYPE_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  targetPromptType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  targetModel?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
