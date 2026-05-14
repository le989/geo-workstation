import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import {
  GEO_HIT_ENTRY_POINT_VALUES,
  toOptionalBoolean,
  toOptionalInt,
  toStringArray,
  trimOptionalString
} from "./model-inclusion-dto-transforms";

export const WEB_SEARCH_PROVIDER_VALUES = ["kimi_web_search", "volcengine_web_search"] as const;

export class WebSearchCheckDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @Transform(({ value }) => toStringArray(value))
  geoPromptIds!: string[];

  @IsEnum(WEB_SEARCH_PROVIDER_VALUES)
  @Transform(({ value }) => trimOptionalString(value) ?? "kimi_web_search")
  provider!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  brandName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  companyName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  websiteUrl?: string;

  @IsOptional()
  @IsEnum(GEO_HIT_ENTRY_POINT_VALUES)
  @Transform(({ value }) => trimOptionalString(value))
  entryPoint?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  isLoggedIn?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => toOptionalInt(value))
  limit?: number;
}
