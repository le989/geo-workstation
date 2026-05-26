import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";
import { toStringArray, trimOptionalString, trimRequiredString } from "./content-dto-transforms";

export class CreateContentTaskDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLineId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  knowledgeBaseId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  instructionTemplateId?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  generationType!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  targetModel?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  provider?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsIn(["all", "product_line", "selected_files"])
  @Transform(({ value }) => trimOptionalString(value))
  scopeType?: "all" | "product_line" | "selected_files";

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  selectedKnowledgeFileIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => toStringArray(value))
  geoPromptIds!: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
