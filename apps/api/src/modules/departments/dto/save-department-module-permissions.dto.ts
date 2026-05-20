import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, ValidateNested } from "class-validator";
import { GEO_MODULE_KEYS } from "../../auth/geo-module-catalog";

export class DepartmentModulePermissionItemDto {
  @IsIn(GEO_MODULE_KEYS)
  moduleKey!: string;

  @IsBoolean()
  canAccess!: boolean;
}

export class SaveDepartmentModulePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentModulePermissionItemDto)
  permissions!: DepartmentModulePermissionItemDto[];
}
