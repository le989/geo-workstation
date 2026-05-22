import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
import { trimRequiredString } from "./model-inclusion-dto-transforms";

export class VoidModelInclusionRecordDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  voidReason!: string;
}
