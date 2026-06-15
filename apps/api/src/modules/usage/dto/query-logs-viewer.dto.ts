import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AiCallStatus } from "@prisma/client";
import { toOptionalBoolean, toOptionalInt } from "../../geo-prompts/dto/geo-prompt-dto-transforms";

export class LogsViewerPaginationDto {
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

export class QueryLogsViewerOperationLogsDto extends LogsViewerPaginationDto {
  @IsOptional()
  @IsString()
  moduleKey?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class QueryLogsViewerAiUsageRecordsDto extends LogsViewerPaginationDto {
  @IsOptional()
  @IsString()
  moduleKey?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  provider?: string;

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
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class QueryLogsViewerAiCallLogsDto extends LogsViewerPaginationDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsEnum(AiCallStatus)
  status?: AiCallStatus;

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
