import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
import { trimRequiredString } from "./knowledge-dto-transforms";

export class CreateKnowledgeDirectoryDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;
}
