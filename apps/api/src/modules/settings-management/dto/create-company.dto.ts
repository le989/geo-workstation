import { CompanyType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { trimOptionalString, trimRequiredString } from "./settings-management-transforms";

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  code!: string;

  @IsOptional()
  @IsEnum(CompanyType)
  @Transform(({ value }) => trimOptionalString(value))
  type?: CompanyType;
}
