import { MembershipRole, MembershipStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { toOptionalBoolean, trimRequiredString } from "./user-dto-transforms";

export class UpdateUserMembershipDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  companyId!: string;

  @IsEnum(MembershipRole)
  membershipRole!: MembershipRole;

  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  isDefault?: boolean;
}
