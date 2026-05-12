import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";
import { toStringArray, trimOptionalString } from "./geo-analysis-dto-transforms";

export class CreateAnalysisContentTaskDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  knowledgeBaseId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  instructionTemplateId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  generationType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  targetModel?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  geoPromptIds?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
