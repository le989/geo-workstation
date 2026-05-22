import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max
} from "class-validator";
import {
  GEO_PROMPT_TYPE_VALUES,
  GEO_HIT_DETECTION_METHOD_VALUES,
  GEO_HIT_DEVICE_TYPE_VALUES,
  GEO_HIT_ENTRY_POINT_VALUES,
  GEO_HIT_LEVEL_VALUES,
  RECORD_METHOD_VALUES,
  USER_INTENT_VALUES,
  toOptionalBoolean,
  toOptionalDate,
  toOptionalInt,
  trimOptionalString
} from "./model-inclusion-dto-transforms";

export const MODEL_INCLUSION_VOID_STATUS_VALUES = ["normal", "voided", "all"] as const;
export type ModelInclusionVoidStatus = (typeof MODEL_INCLUSION_VOID_STATUS_VALUES)[number];

export class QueryModelInclusionRecordsDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => toOptionalInt(value))
  page?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(100)
  @Transform(({ value }) => toOptionalInt(value))
  pageSize?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  search?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  geoPromptId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

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
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  brandMentioned?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  brandRecommended?: boolean;

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
  @IsEnum(RECORD_METHOD_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  recordMethod?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;

  @IsOptional()
  @IsEnum(MODEL_INCLUSION_VOID_STATUS_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  voidStatus?: ModelInclusionVoidStatus;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  checkedFrom?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => toOptionalDate(value))
  checkedTo?: Date;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  productLine?: string;

  @IsOptional()
  @IsEnum(GEO_PROMPT_TYPE_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  promptType?: string;

  @IsOptional()
  @IsEnum(USER_INTENT_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  userIntent?: string;
}
