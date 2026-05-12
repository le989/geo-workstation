import { Transform } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { toTags, trimOptionalString, trimRequiredString } from "./knowledge-dto-transforms";

export class UpdateKnowledgeChunkDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @Transform(({ value }) => trimRequiredString(value))
  content?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  sourceType?: string;

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
  tags?: string[];
}
