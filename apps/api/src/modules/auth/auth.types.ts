import type { CompanyStatus, MembershipRole, UserRole, UserStatus } from "@prisma/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isPlatformAdmin: boolean;
};

export type AuthCompanyOption = {
  id: string;
  name: string;
  code: string;
  role: MembershipRole;
  isDefault: boolean;
  status: CompanyStatus;
};

export type CurrentMembershipContext = {
  companyId: string;
  role: MembershipRole;
  isDefault: boolean;
  isPlatformAdmin: boolean;
};

export type AuthSession = {
  user: AuthUser;
  companies: AuthCompanyOption[];
  currentCompany: AuthCompanyOption;
};

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  user?: AuthUser;
  authSession?: AuthSession;
  currentCompany?: AuthCompanyOption;
  currentMembership?: CurrentMembershipContext;
};

export type JwtUserPayload = {
  sub: string;
  email: string;
  role: UserRole;
  isPlatformAdmin?: boolean;
};
