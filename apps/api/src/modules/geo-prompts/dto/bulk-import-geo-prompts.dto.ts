import { ArrayMaxSize, IsArray, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { trimOptionalString } from "./geo-prompt-dto-transforms";

export type BulkImportGeoPromptRow = Record<string, unknown>;

export class BulkImportGeoPromptsDto {
  @IsArray()
  @ArrayMaxSize(1000)
  rows!: BulkImportGeoPromptRow[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;
}
