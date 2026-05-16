import { ForbiddenException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  buildResourceReadWhere,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { buildOwnerCompanyReadWhere } from "../auth/owner-company-policy";

type WhereInput = object;

const hasWhereClauses = (where: WhereInput | undefined): where is WhereInput =>
  Boolean(where && Object.keys(where).length > 0);

export const mergeAndWhere = <T extends WhereInput>(
  baseWhere: T,
  ...scopeWhere: Array<T | undefined>
): T => {
  const parts = [baseWhere, ...scopeWhere].filter(hasWhereClauses);

  if (parts.length === 0) {
    return {} as T;
  }

  if (parts.length === 1) {
    return parts[0] as T;
  }

  return {
    AND: parts
  } as T;
};

export const buildReportOwnerWhere = <T extends WhereInput>(
  context: ResourceAccessContext
): T => buildOwnerCompanyReadWhere(context) as T;

export const buildReportPromptWhere = (
  context: ResourceAccessContext
): Prisma.GeoPromptWhereInput => buildResourceReadWhere(context);

export const buildReportKnowledgeWhere = (
  context: ResourceAccessContext
): Prisma.KnowledgeBaseWhereInput =>
  buildResourceReadWhere(context) as Prisma.KnowledgeBaseWhereInput;

export const assertCanExportReports = (context: ResourceAccessContext): void => {
  if (getEffectiveRole(context) === "viewer") {
    throw new ForbiddenException("当前角色无权导出报表");
  }
};
