import { ProductLineStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateProductLineStatusDto {
  @IsEnum(ProductLineStatus)
  status!: ProductLineStatus;
}
