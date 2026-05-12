import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray } from "class-validator";

export type ImportModelInclusionRecordRow = {
  geoPromptId?: unknown;
  promptText?: unknown;
  model?: unknown;
  checkedAt?: unknown;
  brandMentioned?: unknown;
  brandRecommended?: unknown;
  rankingPosition?: unknown;
  citedOfficialSite?: unknown;
  answerSummary?: unknown;
  competitors?: unknown;
  recordMethod?: unknown;
  createdBy?: unknown;
};

export class ImportModelInclusionRecordsDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @Transform(({ value }) => (Array.isArray(value) ? value : value))
  rows!: ImportModelInclusionRecordRow[];
}
