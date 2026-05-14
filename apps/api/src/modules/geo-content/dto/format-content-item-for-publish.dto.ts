import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export type PublishSourceType = "original" | "optimized";
export type PublishFormatStyle = "general" | "website" | "zhihu_baijiahao" | "wechat";

const trimOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const transformOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "是"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "否"].includes(normalized)) {
    return false;
  }

  return Boolean(value);
};

export class FormatContentItemForPublishDto {
  @IsOptional()
  @IsIn(["original", "optimized"])
  @Transform(({ value }) => trimOptionalString(value))
  sourceType?: PublishSourceType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  optimizedTitle?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  optimizedBody?: string;

  @IsOptional()
  @IsIn(["general", "website", "zhihu_baijiahao", "wechat"])
  @Transform(({ value }) => trimOptionalString(value))
  formatStyle?: PublishFormatStyle;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformOptionalBoolean(value))
  includeGeoNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformOptionalBoolean(value))
  includeWarnings?: boolean;
}
