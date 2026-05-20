import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { toOptionalBoolean, toOptionalInt } from "../../geo-prompts/dto/geo-prompt-dto-transforms";

export class QueryUsageDto {
  @IsOptional()
  @IsString()
  moduleKey?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isMock?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class QueryUsageTrendDto extends QueryUsageDto {
  @IsOptional()
  @IsIn(["day", "week", "month"])
  granularity?: "day" | "week" | "month" = "day";
}

export class QueryUsageListDto extends QueryUsageDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
