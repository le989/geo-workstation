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
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  answerSummary?: string;

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
