import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { toOptionalInt } from "../../geo-prompts/dto/geo-prompt-dto-transforms";

export class QueryAftersalesFeedbacksDto {
  @IsOptional()
  @IsIn(["pending", "handled", "no_action"])
  status?: "pending" | "handled" | "no_action";

  @IsOptional()
  @IsIn([
    "citation_wrong",
    "answer_incomplete",
    "answer_wrong",
    "knowledge_missing",
    "question_unclear",
    "other"
  ])
  errorType?:
    | "citation_wrong"
    | "answer_incomplete"
    | "answer_wrong"
    | "knowledge_missing"
    | "question_unclear"
    | "other";

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
