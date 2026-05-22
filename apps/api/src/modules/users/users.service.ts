import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CompanyStatus,
  DepartmentStatus,
  MembershipRole,
  MembershipStatus,
  Prisma,
  UserRole,
  UserStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  type NormalizedAuthRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { hashPassword } from "../auth/utils/password-hash.util";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { ListUsersDto } from "./dto/list-users.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { UpdateUserMembershipDto } from "./dto/update-user-membership.dto";
import type { UpdateUserStatusDto } from "./dto/update-user-status.dto";

const NEW_USER_ROLES = [
  UserRole.platform_admin,
  UserRole.company_admin,
  UserRole.operator,
  UserRole.viewer
] as const;

const COMPANY_ADMIN_MANAGED_ROLES = [MembershipRole.operator, MembershipRole.viewer] as const;

type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        company: true;
        department: true;
      };
    };
  };
}>;

type UserManagementAccess = {
  context: ResourceAccessContext;
  role: Extract<NormalizedAuthRole, "platform_admin" | "company_admin">;
  companyId: string;
};

export type UserMembershipResponse = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  departmentStatus: DepartmentStatus | null;
  role: MembershipRole;
  status: MembershipStatus;
  isDefault: boolean;
};

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  memberships: UserMembershipResponse[];
};

export type ListUsersResponse = {
  items: UserResponse[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listUsers(
    query: ListUsersDto,
    context?: ResourceAccessContext
  ): Promise<ListUsersResponse> {
    const access = this.assertCanManageUsers(context);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildListWhere(query, access);

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: this.userInclude(),
        orderBy: [{ createdAt: "desc" }, { email: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: users.map((user) =>
        this.toUserResponse(user, access.role === "company_admin" ? access.companyId : undefined)
      ),
      total,
      page,
      pageSize
    };
  }

  async createUser(input: CreateUserDto, context?: ResourceAccessContext): Promise<UserResponse> {
    const access = this.assertCanManageUsers(context);
    this.assertNewRole(input.role);
    this.assertRoleMatchesMembership(input.role, input.membershipRole);
    if (access.role === "company_admin") {
      this.assertCompanyAdminManagedRole(input.membershipRole);
      this.assertCompanyAdminManagedUserRole(input.role);
    }

    const companyId = access.role === "company_admin" ? access.companyId : input.companyId;
    const company = await this.getActiveCompany(companyId);
    const departmentId = await this.resolveDepartmentId(input.departmentId ?? null, company.id);
    const existing = await this.prisma.user.findUnique({
      where: {
        email: input.email
      },
      select: {
        id: true
      }
    });

    if (existing) {
      throw new BadRequestException("邮箱已存在");
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        status:
          access.role === "company_admin"
            ? UserStatus.active
            : (input.status ?? UserStatus.active),
        passwordHash: await hashPassword(input.initialPassword),
        memberships: {
          create: {
            companyId: company.id,
            departmentId,
            role: input.membershipRole,
            status: MembershipStatus.active,
            isDefault: input.isDefaultCompany ?? true
          }
        }
      },
      include: this.userInclude()
    });

    return this.toUserResponse(
      user,
      access.role === "company_admin" ? access.companyId : undefined
    );
  }

  async resetPassword(
    userId: string,
    input: ResetPasswordDto,
    context?: ResourceAccessContext
  ): Promise<UserResponse> {
    const access = this.assertCanManageUsers(context);
    const target = await this.getUserOrThrow(userId);
    if (access.role === "company_admin") {
      this.assertCompanyAdminCanManageOrdinaryUser(target, access, "reset");
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        passwordHash: await hashPassword(input.newPassword)
      },
      include: this.userInclude()
    });

    return this.toUserResponse(
      user,
      access.role === "company_admin" ? access.companyId : undefined
    );
  }

  async updateStatus(
    userId: string,
    input: UpdateUserStatusDto,
    context?: ResourceAccessContext
  ): Promise<UserResponse> {
    const access = this.assertCanManageUsers(context);
    const user = await this.getUserOrThrow(userId);
    if (access.role === "company_admin") {
      this.assertCompanyAdminCanManageOrdinaryUser(user, access, "status");
    }

    if (input.status === UserStatus.disabled) {
      await this.assertCanDisableUser(user);
    }

    const updated = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        status: input.status
      },
      include: this.userInclude()
    });

    return this.toUserResponse(
      updated,
      access.role === "company_admin" ? access.companyId : undefined
    );
  }

  async updateMembership(
    userId: string,
    input: UpdateUserMembershipDto,
    context?: ResourceAccessContext
  ): Promise<UserResponse> {
    const access = this.assertCanManageUsers(context);
    this.assertNewMembershipRole(input.membershipRole);
    const user = await this.getUserOrThrow(userId);
    const companyId = access.role === "company_admin" ? access.companyId : input.companyId;
    let companyAdminTargetMembership: UserWithMemberships["memberships"][number] | undefined;
    if (access.role === "company_admin") {
      this.assertRequestedCompanyMatchesCurrent(input.companyId, access.companyId);
      companyAdminTargetMembership = this.assertCompanyAdminCanManageOrdinaryUser(
        user,
        access,
        "membership"
      );
      this.assertCompanyAdminManagedRole(input.membershipRole);

      if (input.membershipStatus === MembershipStatus.disabled) {
        throw new ForbiddenException("公司管理员不能禁用公司成员关系，请使用账号停用");
      }
    }
    const company = await this.getActiveCompany(companyId);
    const hasDepartmentInput = Object.prototype.hasOwnProperty.call(input, "departmentId");
    const departmentId = hasDepartmentInput
      ? await this.resolveDepartmentId(input.departmentId ?? null, company.id)
      : undefined;
    const membershipStatus =
      access.role === "company_admin"
        ? MembershipStatus.active
        : (input.membershipStatus ?? MembershipStatus.active);
    const isDefault =
      access.role === "company_admin"
        ? (companyAdminTargetMembership?.isDefault ?? true)
        : (input.isDefault ?? true);

    if (membershipStatus === MembershipStatus.disabled && isDefault) {
      throw new BadRequestException("禁用的公司成员关系不能设为默认公司");
    }

    if (
      this.isPlatformAdminRole(user.role) &&
      (input.membershipRole !== MembershipRole.platform_admin ||
        membershipStatus !== MembershipStatus.active)
    ) {
      await this.assertCanChangePlatformAdminMemberships(
        user,
        company.id,
        input.membershipRole,
        membershipStatus
      );
    }

    if (isDefault && access.role === "platform_admin") {
      await this.prisma.membership.updateMany({
        where: {
          userId
        },
        data: {
          isDefault: false
        }
      });
    }

    const updatedUserRole = this.userRoleFromMembershipRole(input.membershipRole);
    const membershipData = {
      role: input.membershipRole,
      status: membershipStatus,
      isDefault,
      ...(hasDepartmentInput ? { departmentId } : {})
    };
    const updated = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        role: updatedUserRole,
        memberships:
          access.role === "company_admin"
            ? {
                update: {
                  where: {
                    userId_companyId: {
                      userId,
                      companyId: company.id
                    }
                  },
                  data: membershipData
                }
              }
            : {
                upsert: {
                  where: {
                    userId_companyId: {
                      userId,
                      companyId: company.id
                    }
                  },
                  update: membershipData,
                  create: {
                    companyId: company.id,
                    departmentId: departmentId ?? null,
                    role: input.membershipRole,
                    status: membershipStatus,
                    isDefault
                  }
                }
              }
      },
      include: this.userInclude()
    });

    return this.toUserResponse(
      updated,
      access.role === "company_admin" ? access.companyId : undefined
    );
  }

  private buildListWhere(
    query: ListUsersDto,
    access: UserManagementAccess
  ): Prisma.UserWhereInput {
    const and: Prisma.UserWhereInput[] = [];

    if (query.keyword) {
      and.push({
        OR: [
          {
            name: {
              contains: query.keyword,
              mode: "insensitive"
            }
          },
          {
            email: {
              contains: query.keyword,
              mode: "insensitive"
            }
          }
        ]
      });
    }

    if (query.role) {
      and.push({ role: query.role });
    }

    if (query.status) {
      and.push({ status: query.status });
    }

    if (access.role === "company_admin") {
      and.push({
        memberships: {
          some: {
            companyId: access.companyId
          }
        }
      });
    } else if (query.companyId || query.membershipRole) {
      and.push({
        memberships: {
          some: {
            ...(query.companyId ? { companyId: query.companyId } : {}),
            ...(query.membershipRole ? { role: query.membershipRole } : {})
          }
        }
      });
    }

    return and.length ? { AND: and } : {};
  }

  private userInclude() {
    return {
      memberships: {
        include: {
          company: true,
          department: true
        },
        orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }]
      }
    };
  }

  private toUserResponse(user: UserWithMemberships, visibleCompanyId?: string): UserResponse {
    const memberships = visibleCompanyId
      ? user.memberships.filter((membership) => membership.companyId === visibleCompanyId)
      : user.memberships;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships: memberships.map((membership) => ({
        id: membership.id,
        companyId: membership.companyId,
        companyName: membership.company.name,
        companyCode: membership.company.code,
        departmentId: membership.departmentId,
        departmentName: membership.department?.name ?? null,
        departmentCode: membership.department?.code ?? null,
        departmentStatus: membership.department?.status ?? null,
        role: membership.role,
        status: membership.status,
        isDefault: membership.isDefault
      }))
    };
  }

  private assertCanManageUsers(context?: ResourceAccessContext): UserManagementAccess {
    if (!context) {
      throw new ForbiddenException("当前角色无权管理用户");
    }

    const role = getEffectiveRole(context);
    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("当前角色无权管理用户");
    }

    return {
      context,
      role,
      companyId: getCurrentCompanyId(context)
    };
  }

  private async getUserOrThrow(userId: string): Promise<UserWithMemberships> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      },
      include: this.userInclude()
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return user;
  }

  private async getActiveCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: {
        id: companyId
      }
    });

    if (!company || company.status !== CompanyStatus.active) {
      throw new BadRequestException("公司不存在或已停用");
    }

    return company;
  }

  private async resolveDepartmentId(
    departmentId: string | null | undefined,
    companyId: string
  ): Promise<string | null> {
    if (!departmentId) {
      return null;
    }

    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        companyId,
        status: DepartmentStatus.active
      },
      select: {
        id: true
      }
    });

    if (!department) {
      throw new BadRequestException("部门不存在、已停用或不属于当前公司");
    }

    return department.id;
  }

  private assertNewRole(role: UserRole): void {
    if (!NEW_USER_ROLES.includes(role as (typeof NEW_USER_ROLES)[number])) {
      throw new BadRequestException("用户管理仅支持新角色");
    }
  }

  private assertNewMembershipRole(role: MembershipRole): void {
    if (!Object.values(MembershipRole).includes(role)) {
      throw new BadRequestException("公司角色不合法");
    }
  }

  private assertRoleMatchesMembership(role: UserRole, membershipRole: MembershipRole): void {
    if (role !== this.userRoleFromMembershipRole(membershipRole)) {
      throw new BadRequestException("全局角色和公司角色必须保持一致");
    }
  }

  private userRoleFromMembershipRole(role: MembershipRole): UserRole {
    switch (role) {
      case MembershipRole.platform_admin:
        return UserRole.platform_admin;
      case MembershipRole.company_admin:
        return UserRole.company_admin;
      case MembershipRole.operator:
        return UserRole.operator;
      case MembershipRole.viewer:
      default:
        return UserRole.viewer;
    }
  }

  private isPlatformAdminRole(role?: UserRole): boolean {
    return role === UserRole.platform_admin || role === UserRole.admin;
  }

  private isCompanyAdminManagedRole(role: MembershipRole): boolean {
    return COMPANY_ADMIN_MANAGED_ROLES.includes(
      role as (typeof COMPANY_ADMIN_MANAGED_ROLES)[number]
    );
  }

  private assertCompanyAdminManagedRole(role: MembershipRole): void {
    if (!this.isCompanyAdminManagedRole(role)) {
      throw new ForbiddenException("公司管理员只能管理运营人员或只读用户");
    }
  }

  private assertCompanyAdminManagedUserRole(role: UserRole): void {
    if (role !== UserRole.operator && role !== UserRole.viewer) {
      throw new ForbiddenException("公司管理员只能创建运营人员或只读用户");
    }
  }

  private assertRequestedCompanyMatchesCurrent(
    requestedCompanyId: string,
    currentCompanyId: string
  ): void {
    if (requestedCompanyId !== currentCompanyId) {
      throw new ForbiddenException("只能管理本公司用户");
    }
  }

  private assertCompanyAdminCanManageOrdinaryUser(
    user: UserWithMemberships,
    access: UserManagementAccess,
    action: "membership" | "status" | "reset"
  ) {
    if (user.id === access.context.user.id) {
      if (action === "status") {
        throw new ForbiddenException("不能停用自己");
      }

      if (action === "membership") {
        throw new ForbiddenException("不能修改自己的角色");
      }

      throw new ForbiddenException("公司管理员不能重置自己的密码");
    }

    const membership = user.memberships.find((item) => item.companyId === access.companyId);

    if (!membership) {
      throw new ForbiddenException("只能管理本公司用户");
    }

    if (
      this.isPlatformAdminRole(user.role) ||
      membership.role === MembershipRole.platform_admin
    ) {
      throw new ForbiddenException("公司管理员不能修改平台管理员");
    }

    if (
      user.role === UserRole.company_admin ||
      membership.role === MembershipRole.company_admin
    ) {
      throw new ForbiddenException("公司管理员只能管理普通用户");
    }

    if (!this.isCompanyAdminManagedRole(membership.role)) {
      throw new ForbiddenException("公司管理员只能管理普通用户");
    }

    return membership;
  }

  private async assertCanDisableUser(user: UserWithMemberships): Promise<void> {
    if (!this.isPlatformAdminRole(user.role)) {
      return;
    }

    const activePlatformMemberships = user.memberships.filter(
      (membership) =>
        membership.role === MembershipRole.platform_admin &&
        membership.status === MembershipStatus.active
    );

    for (const membership of activePlatformMemberships) {
      await this.assertCompanyHasOtherActivePlatformAdmin(membership.companyId, user.id);
    }
  }

  private async assertCanChangePlatformAdminMemberships(
    user: UserWithMemberships,
    targetCompanyId: string,
    nextMembershipRole: MembershipRole,
    nextMembershipStatus: MembershipStatus
  ): Promise<void> {
    const nextUserRole = this.userRoleFromMembershipRole(nextMembershipRole);
    const affectedMemberships = user.memberships.filter(
      (membership) =>
        membership.role === MembershipRole.platform_admin &&
        membership.status === MembershipStatus.active &&
        (!this.isPlatformAdminRole(nextUserRole) ||
          (membership.companyId === targetCompanyId &&
            (nextMembershipRole !== MembershipRole.platform_admin ||
              nextMembershipStatus !== MembershipStatus.active)))
    );

    for (const membership of affectedMemberships) {
      await this.assertCompanyHasOtherActivePlatformAdmin(membership.companyId, user.id);
    }
  }

  private async assertCompanyHasOtherActivePlatformAdmin(
    companyId: string,
    userId: string
  ): Promise<void> {
    const otherPlatformAdmins = await this.prisma.membership.count({
      where: {
        companyId,
        userId: {
          not: userId
        },
        role: MembershipRole.platform_admin,
        status: MembershipStatus.active,
        user: {
          status: UserStatus.active,
          role: {
            in: [UserRole.platform_admin, UserRole.admin]
          }
        }
      }
    });

    if (otherPlatformAdmins === 0) {
      throw new BadRequestException("不能禁用或降级最后一个平台管理员");
    }
  }
}
