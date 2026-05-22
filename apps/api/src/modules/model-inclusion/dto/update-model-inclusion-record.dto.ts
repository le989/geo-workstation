import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString
} from "class-validator";
import {
  GEO_HIT_LEVEL_VALUES,
  toOptionalBoolean,
  toOptionalDate,
  toOptionalInt,
  toStringArray,
  trimOptionalString
} from "./model-inclusion-dto-transforms";

export class UpdateModelInclusionRecordDto {
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  checkedAt?: Date;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  brandMentioned?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  brandRecommended?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => toOptionalInt(value))
  rankingPosition?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  citedOfficialSite?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  citedContentAsset?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  competitorMentioned?: boolean;

  @IsOptional()
  @IsEnum(GEO_HIT_LEVEL_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  hitLevel?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  answerSummary?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  rawAnswer?: string;

  @IsOptional()
  citations?: unknown;

  @IsOptional()
  searchResults?: unknown;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  screenshotPath?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  errorMessage?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  competitors?: string[];
}
