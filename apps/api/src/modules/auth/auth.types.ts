import type { UserRole, UserStatus } from "@prisma/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  user?: AuthUser;
};

export type JwtUserPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
