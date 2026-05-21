import { KnowledgeReviewStatus, KnowledgeTrustLevel, ParseStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { toOptionalInt, trimOptionalString } from "./knowledge-dto-transforms";

export const officialCitationStatusValues = ["citable", "not_citable"] as const;
export type OfficialCitationStatus = (typeof officialCitationStatusValues)[number];

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

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  directoryId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  materialTopic?: string;

  @IsOptional()
  @IsEnum(KnowledgeReviewStatus)
  reviewStatus?: KnowledgeReviewStatus;

  @IsOptional()
  @IsEnum(KnowledgeTrustLevel)
  trustLevel?: KnowledgeTrustLevel;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  applicableModule?: string;

  @IsOptional()
  @IsIn(officialCitationStatusValues)
  officialCitationStatus?: OfficialCitationStatus;
}
