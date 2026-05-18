import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
import { trimRequiredString } from "./settings-management-transforms";

export class CreateProductLineDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  code!: string;
}
