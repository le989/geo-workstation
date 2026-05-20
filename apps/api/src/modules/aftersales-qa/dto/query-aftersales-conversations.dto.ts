import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { toOptionalBoolean, toOptionalInt } from "../../geo-prompts/dto/geo-prompt-dto-transforms";

const trimOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class QueryAftersalesConversationsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  mineOnly?: boolean;

  @IsOptional()
  @IsIn(["active", "archived", "all"])
  status?: "active" | "archived" | "all" = "active";

  @IsOptional()
  @IsIn(["mine", "all"])
  scope?: "mine" | "all";

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}
