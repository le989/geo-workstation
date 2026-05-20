import { DepartmentStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateDepartmentStatusDto {
  @IsEnum(DepartmentStatus)
  status!: DepartmentStatus;
}
