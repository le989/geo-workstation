import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
import { trimRequiredString } from "./department-dto-transforms";

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  code!: string;
}
