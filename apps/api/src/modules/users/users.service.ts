import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CompanyStatus,
  MembershipRole,
  MembershipStatus,
  Prisma,
  UserRole,
  UserStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.types";
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

type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        company: true;
      };
    };
  };
}>;

export type UserMembershipResponse = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
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

  async listUsers(query: ListUsersDto, currentUser?: AuthUser): Promise<ListUsersResponse> {
    this.assertPlatformAdmin(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildListWhere(query);

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
      items: users.map((user) => this.toUserResponse(user)),
      total,
      page,
      pageSize
    };
  }

  async createUser(input: CreateUserDto, currentUser?: AuthUser): Promise<UserResponse> {
    this.assertPlatformAdmin(currentUser);
    this.assertNewRole(input.role);
    this.assertRoleMatchesMembership(input.role, input.membershipRole);
    const company = await this.getActiveCompany(input.companyId);
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
        status: input.status ?? UserStatus.active,
        passwordHash: await hashPassword(input.initialPassword),
        memberships: {
          create: {
            companyId: company.id,
            role: input.membershipRole,
            status: MembershipStatus.active,
            isDefault: input.isDefaultCompany ?? true
          }
        }
      },
      include: this.userInclude()
    });

    return this.toUserResponse(user);
  }

  async resetPassword(
    userId: string,
    input: ResetPasswordDto,
    currentUser?: AuthUser
  ): Promise<UserResponse> {
    this.assertPlatformAdmin(currentUser);
    await this.getUserOrThrow(userId);

    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        passwordHash: await hashPassword(input.newPassword)
      },
      include: this.userInclude()
    });

    return this.toUserResponse(user);
  }

  async updateStatus(
    userId: string,
    input: UpdateUserStatusDto,
    currentUser?: AuthUser
  ): Promise<UserResponse> {
    this.assertPlatformAdmin(currentUser);
    const user = await this.getUserOrThrow(userId);

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

    return this.toUserResponse(updated);
  }

  async updateMembership(
    userId: string,
    input: UpdateUserMembershipDto,
    currentUser?: AuthUser
  ): Promise<UserResponse> {
    this.assertPlatformAdmin(currentUser);
    this.assertNewMembershipRole(input.membershipRole);
    const user = await this.getUserOrThrow(userId);
    const company = await this.getActiveCompany(input.companyId);
    const membershipStatus = input.membershipStatus ?? MembershipStatus.active;
    const isDefault = input.isDefault ?? true;

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

    if (isDefault) {
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
    const updated = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        role: updatedUserRole,
        memberships: {
          upsert: {
            where: {
              userId_companyId: {
                userId,
                companyId: company.id
              }
            },
            update: {
              role: input.membershipRole,
              status: membershipStatus,
              isDefault
            },
            create: {
              companyId: company.id,
              role: input.membershipRole,
              status: membershipStatus,
              isDefault
            }
          }
        }
      },
      include: this.userInclude()
    });

    return this.toUserResponse(updated);
  }

  private buildListWhere(query: ListUsersDto): Prisma.UserWhereInput {
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

    if (query.companyId || query.membershipRole) {
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
          company: true
        },
        orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }]
      }
    };
  }

  private toUserResponse(user: UserWithMemberships): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        companyId: membership.companyId,
        companyName: membership.company.name,
        companyCode: membership.company.code,
        role: membership.role,
        status: membership.status,
        isDefault: membership.isDefault
      }))
    };
  }

  private assertPlatformAdmin(user?: AuthUser): asserts user is AuthUser {
    if (!user?.isPlatformAdmin && !this.isPlatformAdminRole(user?.role)) {
      throw new ForbiddenException("当前角色无权管理用户");
    }
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
