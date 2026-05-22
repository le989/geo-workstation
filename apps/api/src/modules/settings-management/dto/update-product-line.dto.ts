import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { trimNullableString, trimRequiredString } from "./settings-management-transforms";

export class UpdateProductLineDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => trimNullableString(value))
  description?: string | null;
}
