import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { trimOptionalString } from "./instruction-template-dto-transforms";

export class DuplicateInstructionTemplateDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
