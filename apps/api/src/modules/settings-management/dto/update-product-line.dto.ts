import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { trimRequiredString } from "./settings-management-transforms";

export class UpdateProductLineDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  code?: string;
}
