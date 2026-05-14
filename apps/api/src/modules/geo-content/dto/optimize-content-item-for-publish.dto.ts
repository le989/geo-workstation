import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

const trimOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

export class OptimizeContentItemForPublishDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  provider?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  model?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  targetChannel?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  optimizationGoal?: string;
}
