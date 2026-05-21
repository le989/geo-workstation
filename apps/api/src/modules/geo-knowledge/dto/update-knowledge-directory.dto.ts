import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { trimOptionalString } from "./knowledge-dto-transforms";

export class UpdateKnowledgeDirectoryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  name?: string;
}
