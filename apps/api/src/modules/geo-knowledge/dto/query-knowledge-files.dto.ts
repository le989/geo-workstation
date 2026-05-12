import { ParseStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { toOptionalInt, trimOptionalString } from "./knowledge-dto-transforms";

export class QueryKnowledgeFilesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => toOptionalInt(value))
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => toOptionalInt(value))
  pageSize?: number;

  @IsOptional()
  @IsEnum(ParseStatus)
  parseStatus?: ParseStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  fileType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  search?: string;
}
