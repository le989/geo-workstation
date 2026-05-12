import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import {
  toOptionalBoolean,
  toOptionalInt,
  toStringArray,
  trimOptionalString
} from "./expansion-dto-transforms";

export class SaveExpansionCandidatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  candidateIds!: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  createdBy?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  defaultProductLine?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => toOptionalInt(value))
  defaultPriority?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  defaultTrackEnabled?: boolean;
}
