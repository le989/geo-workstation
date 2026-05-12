import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import {
  GEO_PROMPT_TYPE_VALUES,
  trimOptionalString,
  trimRequiredString
} from "./instruction-template-dto-transforms";

export class CreateInstructionTemplateDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  instructionType!: string;

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

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @Transform(({ value }) => trimRequiredString(value))
  instruction!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  outputFormat?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  qualityRules?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  forbiddenRules?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
