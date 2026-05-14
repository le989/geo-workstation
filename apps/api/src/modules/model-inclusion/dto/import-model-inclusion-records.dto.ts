import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray } from "class-validator";

export type ImportModelInclusionRecordRow = {
  geoPromptId?: unknown;
  promptText?: unknown;
  model?: unknown;
  platform?: unknown;
  entryPoint?: unknown;
  detectionMethod?: unknown;
  deviceType?: unknown;
  isWebSearchEnabled?: unknown;
  isLoggedIn?: unknown;
  checkedAt?: unknown;
  brandMentioned?: unknown;
  brandRecommended?: unknown;
  rankingPosition?: unknown;
  citedOfficialSite?: unknown;
  citedContentAsset?: unknown;
  competitorMentioned?: unknown;
  hitLevel?: unknown;
  answerSummary?: unknown;
  rawAnswer?: unknown;
  citations?: unknown;
  searchResults?: unknown;
  screenshotPath?: unknown;
  errorMessage?: unknown;
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
