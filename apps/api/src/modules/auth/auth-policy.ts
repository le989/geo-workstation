import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  MembershipRole,
  ProductLineStatus,
  UserRole,
  Visibility,
  type Prisma
} from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";
import type {
  AuthCompanyOption,
  AuthUser,
  CurrentMembershipContext
} from "./auth.types";

export type NormalizedAuthRole = "platform_admin" | "company_admin" | "operator" | "viewer";

export type ResourceAccessContext = {
  user: AuthUser;
  currentCompany: AuthCompanyOption;
  currentMembership?: CurrentMembershipContext;
};

export type ResourcePolicyTarget = {
  companyId: string | null;
  visibility: Visibility;
  createdById: string;
};

export const normalizeRole = (
  role: UserRole | MembershipRole | string | undefined
): NormalizedAuthRole => {
  switch (role) {
    case UserRole.platform_admin:
    case UserRole.admin:
    case MembershipRole.platform_admin:
      return "platform_admin";
    case UserRole.company_admin:
    case MembershipRole.company_admin:
      return "company_admin";
    case UserRole.operator:
    case UserRole.geo_operator:
    case UserRole.content_editor:
    case MembershipRole.operator:
      return "operator";
    default:
      return "viewer";
  }
};

export const isPlatformAdmin = (role: UserRole | MembershipRole | string | undefined) =>
  normalizeRole(role) === "platform_admin";

export const buildResourceAccessContext = (
  user?: AuthUser,
  currentCompany?: AuthCompanyOption,
  currentMembership?: CurrentMembershipContext
): ResourceAccessContext | undefined =>
  user && currentCompany
    ? {
        user,
        currentCompany,
        currentMembership
      }
    : undefined;

export const getCurrentCompanyId = (context: ResourceAccessContext): string =>
  context.currentCompany.id;

export const getEffectiveRole = (context: ResourceAccessContext): NormalizedAuthRole => {
  if (context.user.isPlatformAdmin || isPlatformAdmin(context.user.role)) {
    return "platform_admin";
  }

  return normalizeRole(context.currentMembership?.role ?? context.user.role);
};

export const buildResourceReadWhere = (
  context: ResourceAccessContext
): Prisma.GeoPromptWhereInput => {
  const companyId = getCurrentCompanyId(context);
  const role = getEffectiveRole(context);

  if (role === "platform_admin" || role === "company_admin") {
    return {
      OR: [
        {
          companyId
        },
        {
          visibility: Visibility.PLATFORM
        }
      ]
    };
  }

  if (role === "operator") {
    return {
      OR: [
        {
          companyId,
          visibility: Visibility.COMPANY
        },
        {
          companyId,
          visibility: Visibility.PRIVATE,
          createdById: context.user.id
        },
        {
          visibility: Visibility.PLATFORM
        }
      ]
    };
  }

  return {
    visibility: Visibility.PLATFORM
  };
};

export const canReadResource = (
  context: ResourceAccessContext,
  resource: ResourcePolicyTarget
): boolean => {
  if (resource.visibility === Visibility.PLATFORM) {
    return true;
  }

  if (resource.companyId !== getCurrentCompanyId(context)) {
    return false;
  }

  const role = getEffectiveRole(context);

  if (role === "platform_admin" || role === "company_admin") {
    return true;
  }

  if (role === "operator") {
    return (
      resource.visibility === Visibility.COMPANY ||
      (resource.visibility === Visibility.PRIVATE && resource.createdById === context.user.id)
    );
  }

  return false;
};

export const canUpdateResource = (
  context: ResourceAccessContext,
  resource: ResourcePolicyTarget
): boolean => {
  if (resource.visibility === Visibility.PLATFORM) {
    return false;
  }

  if (resource.companyId !== getCurrentCompanyId(context)) {
    return false;
  }

  const role = getEffectiveRole(context);

  if (role === "platform_admin" || role === "company_admin") {
    return true;
  }

  return (
    role === "operator" &&
    resource.visibility === Visibility.PRIVATE &&
    resource.createdById === context.user.id
  );
};

export const canDeleteResource = canUpdateResource;

export const assertCanUpdateResource = (
  context: ResourceAccessContext,
  resource: ResourcePolicyTarget
) => {
  if (!canUpdateResource(context, resource)) {
    throw new ForbiddenException("无权修改当前资源");
  }
};

export const assertCanDeleteResource = (
  context: ResourceAccessContext,
  resource: ResourcePolicyTarget
) => {
  if (!canDeleteResource(context, resource)) {
    throw new ForbiddenException("无权删除当前资源");
  }
};

export const resolveCreateVisibility = (
  context: ResourceAccessContext,
  requestedVisibility?: Visibility
): Visibility => {
  const role = getEffectiveRole(context);

  if (role === "viewer") {
    throw new ForbiddenException("当前角色无权创建资源");
  }

  if (requestedVisibility === Visibility.PLATFORM) {
    throw new ForbiddenException("平台公共资源不能通过普通入口创建");
  }

  if (requestedVisibility === Visibility.COMPANY && role === "operator") {
    throw new ForbiddenException("运营人员不能直接创建公司公共资源");
  }

  if (requestedVisibility === Visibility.PRIVATE) {
    return Visibility.PRIVATE;
  }

  return role === "operator" ? Visibility.PRIVATE : Visibility.COMPANY;
};

export const assertProductLineBelongsToCompany = async (
  prisma: PrismaService,
  productLineId: string | null | undefined,
  companyId: string
): Promise<string | undefined> => {
  if (!productLineId) {
    return undefined;
  }

  const productLine = await prisma.productLine.findFirst({
    where: {
      id: productLineId,
      companyId,
      status: ProductLineStatus.active
    },
    select: {
      id: true
    }
  });

  if (!productLine) {
    throw new BadRequestException(`productLineId must belong to current company: ${productLineId}`);
  }

  return productLine.id;
};
