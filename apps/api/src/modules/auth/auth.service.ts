import {
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException
} from "@nestjs/common";
import {
  CompanyStatus,
  MembershipRole,
  MembershipStatus,
  UserRole,
  UserStatus,
  type User
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthCompanyOption, AuthSession, AuthUser } from "./auth.types";
import { JwtTokenService } from "./jwt-token.service";
import { ALL_GEO_MODULE_KEYS, resolveAccessibleModuleKeys } from "./module-access";
import { verifyPassword } from "./utils/password-hash.util";
import { OperationLogsService } from "../usage/operation-logs.service";

type LoginResult = AuthSession & {
  token: string;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtTokenService)
    private readonly jwtTokenService: JwtTokenService,
    @Optional()
    @Inject(OperationLogsService)
    private readonly operationLogsService?: OperationLogsService
  ) {}

  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: input.email
      }
    });

    if (
      !user ||
      user.status !== UserStatus.active ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      await this.recordLoginOperation(input.email, false);
      throw new UnauthorizedException("账号或密码错误");
    }

    let session: AuthSession;

    try {
      session = await this.toAuthSession(user);
    } catch (error) {
      await this.recordLoginOperation(input.email, false, user, undefined, error);
      throw error;
    }

    await this.recordLoginOperation(input.email, true, user, session.currentCompany);

    return {
      token: this.jwtTokenService.signUser(session.user),
      ...session
    };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    return (await this.getCurrentSession(userId)).user;
  }

  async getCurrentSession(userId: string, requestedCompanyId?: string): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException("登录状态无效或已过期");
    }

    return this.toAuthSession(user, requestedCompanyId);
  }

  toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isPlatformAdmin: this.isPlatformAdminRole(user.role)
    };
  }

  private async toAuthSession(user: User, requestedCompanyId?: string): Promise<AuthSession> {
    const safeUser = this.toAuthUser(user);
    const companies = await this.resolveAccessibleCompanies(user);

    if (!companies.length) {
      throw new ForbiddenException("当前账号没有可用公司");
    }

    const currentCompany = requestedCompanyId
      ? companies.find((company) => company.id === requestedCompanyId)
      : companies.find((company) => company.isDefault) ?? companies[0];

    if (!currentCompany) {
      throw new ForbiddenException("无权访问当前公司");
    }

    return {
      user: safeUser,
      companies,
      currentCompany
    };
  }

  private async resolveAccessibleCompanies(user: User): Promise<AuthCompanyOption[]> {
    if (this.isPlatformAdminRole(user.role)) {
      const memberships = await this.prisma.membership.findMany({
        where: {
          userId: user.id,
          status: MembershipStatus.active,
          company: {
            status: CompanyStatus.active
          }
        },
        select: {
          companyId: true,
          isDefault: true
        }
      });
      const defaultCompanyIds = new Set(
        memberships.filter((membership) => membership.isDefault).map((membership) => membership.companyId)
      );
      const companies = await this.prisma.company.findMany({
        where: {
          status: CompanyStatus.active
        },
        orderBy: [{ createdAt: "asc" }, { name: "asc" }]
      });

      return companies.map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code,
        role: MembershipRole.platform_admin,
        isDefault: defaultCompanyIds.has(company.id),
        status: company.status,
        department: null,
        accessibleModules: ALL_GEO_MODULE_KEYS
      }));
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: user.id,
        status: MembershipStatus.active,
        company: {
          status: CompanyStatus.active
        }
      },
      include: {
        company: true,
        department: true
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
    });

    return Promise.all(
      memberships.map(async (membership) => {
        const permissions = membership.departmentId
          ? await this.prisma.departmentModulePermission.findMany({
              where: {
                companyId: membership.companyId,
                departmentId: membership.departmentId
              },
              select: {
                moduleKey: true,
                canAccess: true
              }
            })
          : [];

        return {
          id: membership.company.id,
          name: membership.company.name,
          code: membership.company.code,
          role: membership.role,
          isDefault: membership.isDefault,
          status: membership.company.status,
          department: membership.department
            ? {
                id: membership.department.id,
                name: membership.department.name,
                code: membership.department.code,
                status: membership.department.status
              }
            : null,
          accessibleModules: resolveAccessibleModuleKeys({
            role: membership.role,
            isPlatformAdmin: false,
            department: membership.department,
            permissions
          })
        };
      })
    );
  }

  private isPlatformAdminRole(role: UserRole): boolean {
    return role === UserRole.platform_admin || role === UserRole.admin;
  }

  private async recordLoginOperation(
    email: string,
    success: boolean,
    user?: User,
    currentCompany?: AuthCompanyOption,
    error?: unknown
  ): Promise<void> {
    await this.operationLogsService?.recordOperation({
      companyId: currentCompany?.id ?? null,
      userId: user?.id ?? null,
      departmentId: currentCompany?.department?.id ?? null,
      moduleKey: "dashboard",
      action: "login",
      targetType: "auth_session",
      targetId: user?.id ?? null,
      targetTitle: user?.name ?? null,
      success,
      errorMessage: success ? undefined : error ?? "账号或密码错误",
      metadata: {
        role: currentCompany?.role ?? user?.role,
        emailDomain: this.extractEmailDomain(email)
      }
    });
  }

  private extractEmailDomain(email: string): string | undefined {
    const domain = email.split("@")[1]?.trim().toLowerCase();

    return domain || undefined;
  }
}
