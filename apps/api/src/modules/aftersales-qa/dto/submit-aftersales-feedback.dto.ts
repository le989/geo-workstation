import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

const trimString = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
};

const trimOptionalString = (value: unknown) => {
  const trimmed = trimString(value);

  return trimmed.length > 0 ? trimmed : undefined;
};

export class SubmitAftersalesFeedbackDto {
  @IsIn([
    "citation_wrong",
    "answer_incomplete",
    "answer_wrong",
    "knowledge_missing",
    "question_unclear",
    "other"
  ])
  errorType!:
    | "citation_wrong"
    | "answer_incomplete"
    | "answer_wrong"
    | "knowledge_missing"
    | "question_unclear"
    | "other";

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(2, 2000)
  correctionText!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  description?: string;
}
