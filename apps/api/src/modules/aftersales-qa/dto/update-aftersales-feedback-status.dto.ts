import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const trimOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class UpdateAftersalesFeedbackStatusDto {
  @IsIn(["pending", "handled", "no_action"])
  status!: "pending" | "handled" | "no_action";

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  handleNote?: string;
}
