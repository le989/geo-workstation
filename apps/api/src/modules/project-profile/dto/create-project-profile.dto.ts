import { Transform } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import {
  toStringArray,
  trimOptionalString,
  trimRequiredString
} from "./project-profile-dto-transforms";

export class CreateProjectProfileDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  projectName!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  companyName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  brandName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  industry?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  mainProducts?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  targetCustomers?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  positioning?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  tone?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  forbiddenClaims?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  targetModels?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  notes?: string;
}
