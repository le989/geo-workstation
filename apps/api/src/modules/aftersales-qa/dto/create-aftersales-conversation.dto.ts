import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

const trimOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class CreateAftersalesConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(({ value }) => trimOptionalString(value))
  title?: string;
}
