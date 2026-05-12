import { Transform } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { toTags, trimOptionalString, trimRequiredString } from "./knowledge-dto-transforms";

export class TextImportKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @Transform(({ value }) => trimRequiredString(value))
  content!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  sourceType?: string = "pasted_text";

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toTags(value))
  tags?: string[] = [];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
