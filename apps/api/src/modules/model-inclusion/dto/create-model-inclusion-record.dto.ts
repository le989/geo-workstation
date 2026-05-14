import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString
} from "class-validator";
import {
  GEO_HIT_DETECTION_METHOD_VALUES,
  GEO_HIT_DEVICE_TYPE_VALUES,
  GEO_HIT_ENTRY_POINT_VALUES,
  GEO_HIT_LEVEL_VALUES,
  RECORD_METHOD_VALUES,
  toOptionalBoolean,
  toOptionalDate,
  toOptionalInt,
  toStringArray,
  trimOptionalString,
  trimRequiredString
} from "./model-inclusion-dto-transforms";

export class CreateModelInclusionRecordDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  geoPromptId!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  model!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  platform?: string;

  @IsOptional()
  @IsEnum(GEO_HIT_ENTRY_POINT_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  entryPoint?: string;

  @IsOptional()
  @IsEnum(GEO_HIT_DETECTION_METHOD_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  detectionMethod?: string;

  @IsOptional()
  @IsEnum(GEO_HIT_DEVICE_TYPE_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  deviceType?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  isWebSearchEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  isLoggedIn?: boolean;

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

  @IsOptional()
  @IsEnum(RECORD_METHOD_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  recordMethod?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
