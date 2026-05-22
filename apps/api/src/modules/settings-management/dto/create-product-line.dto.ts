import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { trimNullableString, trimRequiredString } from "./settings-management-transforms";

export class CreateProductLineDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => trimNullableString(value))
  description?: string | null;
}
