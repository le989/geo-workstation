import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { GeoModuleKey } from "@geo-workstation/shared";
import {
  DepartmentStatus,
  Prisma,
  type Department,
  type DepartmentModulePermission
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { GEO_MODULE_KEYS } from "../auth/geo-module-catalog";
import type { CreateDepartmentDto } from "./dto/create-department.dto";
import type { SaveDepartmentModulePermissionsDto } from "./dto/save-department-module-permissions.dto";
import type { UpdateDepartmentStatusDto } from "./dto/update-department-status.dto";
import type { UpdateDepartmentDto } from "./dto/update-department.dto";

export type DepartmentResponse = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type DepartmentModulePermissionResponse = {
  id: string | null;
  companyId: string;
  departmentId: string;
  moduleKey: GeoModuleKey;
  canAccess: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ListDepartmentsResponse = {
  items: DepartmentResponse[];
  total: number;
};

export type DepartmentPermissionsResponse = {
  department: DepartmentResponse;
  permissions: DepartmentModulePermissionResponse[];
};

@Injectable()
export class DepartmentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listDepartments(context?: ResourceAccessContext): Promise<ListDepartmentsResponse> {
    this.assertCanManageDepartments(context);
    const companyId = getCurrentCompanyId(context);
    const departments = await this.prisma.department.findMany({
      where: {
        companyId
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { name: "asc" }]
    });

    return {
      items: departments.map((department) => this.toDepartmentResponse(department)),
      total: departments.length
    };
  }

  async createDepartment(
    input: CreateDepartmentDto,
    context?: ResourceAccessContext
  ): Promise<DepartmentResponse> {
    this.assertCanManageDepartments(context);
    const companyId = getCurrentCompanyId(context);
    await this.assertDepartmentCodeIsUnique(companyId, input.code);

    const department = await this.prisma.department.create({
      data: {
        companyId,
        name: input.name,
        code: input.code,
        status: DepartmentStatus.active,
        modulePermissions: {
          create: GEO_MODULE_KEYS.map((moduleKey) => ({
            companyId,
            moduleKey,
            canAccess: moduleKey === "dashboard" || moduleKey === "help"
          }))
        }
      }
    });

    return this.toDepartmentResponse(department);
  }

  async updateDepartment(
    id: string,
    input: UpdateDepartmentDto,
    context?: ResourceAccessContext
  ): Promise<DepartmentResponse> {
    this.assertCanManageDepartments(context);
    const companyId = getCurrentCompanyId(context);
    await this.getDepartmentOrThrow(id, companyId);

    if (input.code !== undefined) {
      await this.assertDepartmentCodeIsUnique(companyId, input.code, id);
    }

    const data: Prisma.DepartmentUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.code !== undefined) {
      data.code = input.code;
    }

    const department = await this.prisma.department.update({
      where: {
        id
      },
      data
    });

    return this.toDepartmentResponse(department);
  }

  async updateDepartmentStatus(
    id: string,
    input: UpdateDepartmentStatusDto,
    context?: ResourceAccessContext
  ): Promise<DepartmentResponse> {
    this.assertCanManageDepartments(context);
    const companyId = getCurrentCompanyId(context);
    await this.getDepartmentOrThrow(id, companyId);

    const department = await this.prisma.department.update({
      where: {
        id
      },
      data: {
        status: input.status
      }
    });

    return this.toDepartmentResponse(department);
  }

  async getModulePermissions(
    departmentId: string,
    context?: ResourceAccessContext
  ): Promise<DepartmentPermissionsResponse> {
    this.assertCanManageDepartments(context);
    const companyId = getCurrentCompanyId(context);
    const department = await this.getDepartmentOrThrow(departmentId, companyId);
    const permissions = await this.prisma.departmentModulePermission.findMany({
      where: {
        companyId,
        departmentId
      },
      orderBy: {
        moduleKey: "asc"
      }
    });

    return {
      department: this.toDepartmentResponse(department),
      permissions: this.toPermissionResponses(companyId, departmentId, permissions)
    };
  }

  async saveModulePermissions(
    departmentId: string,
    input: SaveDepartmentModulePermissionsDto,
    context?: ResourceAccessContext
  ): Promise<DepartmentPermissionsResponse> {
    this.assertCanManageDepartments(context);
    const companyId = getCurrentCompanyId(context);
    const department = await this.getDepartmentOrThrow(departmentId, companyId);
    this.assertNoDuplicateModuleKeys(input.permissions.map((permission) => permission.moduleKey));

    await this.prisma.$transaction(
      input.permissions.map((permission) =>
        this.prisma.departmentModulePermission.upsert({
          where: {
            departmentId_moduleKey: {
              departmentId,
              moduleKey: permission.moduleKey
            }
          },
          update: {
            canAccess: permission.canAccess
          },
          create: {
            companyId,
            departmentId,
            moduleKey: permission.moduleKey,
            canAccess: permission.canAccess
          }
        })
      )
    );

    const permissions = await this.prisma.departmentModulePermission.findMany({
      where: {
        companyId,
        departmentId
      }
    });

    return {
      department: this.toDepartmentResponse(department),
      permissions: this.toPermissionResponses(companyId, departmentId, permissions)
    };
  }

  private assertCanManageDepartments(
    context: ResourceAccessContext | undefined
  ): asserts context is ResourceAccessContext {
    if (!context) {
      throw new ForbiddenException("缺少当前公司上下文");
    }

    const role = getEffectiveRole(context);

    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("当前角色无权管理部门");
    }
  }

  private async getDepartmentOrThrow(id: string, companyId: string): Promise<Department> {
    const department = await this.prisma.department.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!department) {
      throw new NotFoundException("部门不存在");
    }

    return department;
  }

  private async assertDepartmentCodeIsUnique(
    companyId: string,
    code: string,
    excludeId?: string
  ): Promise<void> {
    const existing = await this.prisma.department.findFirst({
      where: {
        companyId,
        code,
        ...(excludeId
          ? {
              id: {
                not: excludeId
              }
            }
          : {})
      },
      select: {
        id: true
      }
    });

    if (existing) {
      throw new BadRequestException("部门编码已存在");
    }
  }

  private assertNoDuplicateModuleKeys(moduleKeys: string[]): void {
    const seen = new Set<string>();

    for (const moduleKey of moduleKeys) {
      if (seen.has(moduleKey)) {
        throw new BadRequestException(`模块权限重复: ${moduleKey}`);
      }
      seen.add(moduleKey);
    }
  }

  private toDepartmentResponse(department: Department): DepartmentResponse {
    return {
      id: department.id,
      companyId: department.companyId,
      name: department.name,
      code: department.code,
      status: department.status,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };
  }

  private toPermissionResponses(
    companyId: string,
    departmentId: string,
    permissions: DepartmentModulePermission[]
  ): DepartmentModulePermissionResponse[] {
    const permissionByModule = new Map(permissions.map((permission) => [permission.moduleKey, permission]));

    return GEO_MODULE_KEYS.map((moduleKey) => {
      const permission = permissionByModule.get(moduleKey);

      return {
        id: permission?.id ?? null,
        companyId,
        departmentId,
        moduleKey,
        canAccess: permission?.canAccess ?? false,
        createdAt: permission?.createdAt ?? null,
        updatedAt: permission?.updatedAt ?? null
      };
    });
  }
}
