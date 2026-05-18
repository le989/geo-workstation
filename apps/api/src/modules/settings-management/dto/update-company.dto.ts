import { CompanyType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { trimOptionalString, trimRequiredString } from "./settings-management-transforms";

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  code?: string;

  @IsOptional()
  @IsEnum(CompanyType)
  @Transform(({ value }) => trimOptionalString(value))
  type?: CompanyType;
}
