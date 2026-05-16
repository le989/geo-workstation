import { ForbiddenException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "./auth-policy";

export type CompanyTaskPolicyTarget = {
  companyId: string | null;
  createdById: string;
};

export const buildTaskReadWhere = (
  context: ResourceAccessContext
): Prisma.GeoAnalysisTaskWhereInput => {
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

export const buildTaskReadWhereById = (
  id: string,
  context: ResourceAccessContext
): Prisma.GeoAnalysisTaskWhereInput => ({
  AND: [
    {
      id
    },
    buildTaskReadWhere(context)
  ]
});

export const canManageCompanyTask = (
  context: ResourceAccessContext,
  task: CompanyTaskPolicyTarget
): boolean => {
  if (task.companyId !== getCurrentCompanyId(context)) {
    return false;
  }

  const role = getEffectiveRole(context);

  if (role === "platform_admin" || role === "company_admin") {
    return true;
  }

  return role === "operator" && task.createdById === context.user.id;
};

export const assertCanManageCompanyTask = (
  context: ResourceAccessContext,
  task: CompanyTaskPolicyTarget
): void => {
  if (!canManageCompanyTask(context, task)) {
    throw new ForbiddenException("无权操作当前 GEO 诊断任务");
  }
};

export const resolveTaskCreateData = (
  context: ResourceAccessContext
): Pick<
  Prisma.GeoAnalysisTaskCreateInput,
  "company" | "createdBy" | "updatedBy"
> => ({
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
});
