import { ForbiddenException } from "@nestjs/common";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "./auth-policy";

export type OwnerCompanyPolicyTarget = {
  companyId: string | null;
  createdById: string;
};

export type OwnerCompanyReadWhere = {
  companyId: string;
  createdById?: string;
};

export type OwnerCompanyCreateData = {
  company: {
    connect: {
      id: string;
    };
  };
  createdBy: {
    connect: {
      id: string;
    };
  };
  updatedBy: {
    connect: {
      id: string;
    };
  };
};

export const buildOwnerCompanyReadWhere = (
  context: ResourceAccessContext
): OwnerCompanyReadWhere => {
  const companyId = getCurrentCompanyId(context);
  const role = getEffectiveRole(context);

  if (role === "operator") {
    return {
      companyId,
      createdById: context.user.id
    };
  }

  return {
    companyId
  };
};

export const buildOwnerCompanyReadWhereById = (
  id: string,
  context: ResourceAccessContext
): { AND: [{ id: string }, OwnerCompanyReadWhere] } => ({
  AND: [
    {
      id
    },
    buildOwnerCompanyReadWhere(context)
  ]
});

export const canManageOwnerCompanyResource = (
  context: ResourceAccessContext,
  resource: OwnerCompanyPolicyTarget
): boolean => {
  if (resource.companyId !== getCurrentCompanyId(context)) {
    return false;
  }

  const role = getEffectiveRole(context);

  if (role === "platform_admin" || role === "company_admin") {
    return true;
  }

  return role === "operator" && resource.createdById === context.user.id;
};

export const assertCanManageOwnerCompanyResource = (
  context: ResourceAccessContext,
  resource: OwnerCompanyPolicyTarget,
  message = "无权操作当前资源"
): void => {
  if (!canManageOwnerCompanyResource(context, resource)) {
    throw new ForbiddenException(message);
  }
};

export const resolveOwnerCompanyCreateData = (
  context: ResourceAccessContext
): OwnerCompanyCreateData => {
  if (getEffectiveRole(context) === "viewer") {
    throw new ForbiddenException("当前角色无权创建 GEO 内容任务");
  }

  return {
    company: {
      connect: {
        id: getCurrentCompanyId(context)
      }
    },
    createdBy: {
      connect: {
        id: context.user.id
      }
    },
    updatedBy: {
      connect: {
        id: context.user.id
      }
    }
  };
};
