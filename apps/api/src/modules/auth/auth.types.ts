import type {
  CompanyStatus,
  DepartmentStatus,
  MembershipRole,
  UserRole,
  UserStatus
} from "@prisma/client";
import type { GeoModuleKey } from "@geo-workstation/shared";

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
  department: {
    id: string;
    name: string;
    code: string;
    status: DepartmentStatus;
  } | null;
  accessibleModules: GeoModuleKey[];
};

export type CurrentMembershipContext = {
  companyId: string;
  role: MembershipRole;
  isDefault: boolean;
  isPlatformAdmin: boolean;
  departmentId?: string | null;
  accessibleModules: GeoModuleKey[];
};

export type AuthSession = {
  user: AuthUser;
  companies: AuthCompanyOption[];
  currentCompany: AuthCompanyOption;
};

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  originalUrl?: string;
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
