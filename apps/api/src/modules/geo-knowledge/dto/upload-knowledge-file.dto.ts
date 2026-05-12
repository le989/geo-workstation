import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";
import { toTags, trimOptionalString } from "./knowledge-dto-transforms";

export class UploadKnowledgeFileDto {
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
