import { MembershipRole, UserRole, UserStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { toOptionalBoolean, trimRequiredString } from "./user-dto-transforms";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  name!: string;

  @IsEmail()
  @Transform(({ value }) => trimRequiredString(value))
  email!: string;

  @IsString()
  @MinLength(8)
  initialPassword!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => trimRequiredString(value))
  companyId!: string;

  @IsEnum(MembershipRole)
  membershipRole!: MembershipRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toOptionalBoolean(value))
  isDefaultCompany?: boolean;
}
