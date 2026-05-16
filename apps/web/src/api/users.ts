import { apiRequest } from "./http";
import type { AuthRole } from "./auth";

export type UserStatus = "active" | "disabled";
export type MembershipStatus = "active" | "disabled";
export type MembershipRole = "platform_admin" | "company_admin" | "operator" | "viewer";

export type UserMembership = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  role: MembershipRole;
  status: MembershipStatus;
  isDefault: boolean;
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  memberships: UserMembership[];
};

export type ListUsersQuery = {
  keyword?: string;
  role?: AuthRole;
  status?: UserStatus;
  companyId?: string;
  membershipRole?: MembershipRole;
  page?: number;
  pageSize?: number;
};

export type ListUsersResult = {
  items: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  initialPassword: string;
  role: MembershipRole;
  companyId: string;
  membershipRole: MembershipRole;
  status?: UserStatus;
  isDefaultCompany?: boolean;
};

export type ResetUserPasswordPayload = {
  newPassword: string;
};

export type UpdateUserStatusPayload = {
  status: UserStatus;
};

export type UpdateUserMembershipPayload = {
  companyId: string;
  membershipRole: MembershipRole;
  membershipStatus?: MembershipStatus;
  isDefault?: boolean;
};

const appendQuery = (path: string, query: ListUsersQuery) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const listUsers = (query: ListUsersQuery = {}) =>
  apiRequest<ListUsersResult>(appendQuery("/api/users", query), {
    method: "GET"
  });

export const createUser = (payload: CreateUserPayload) =>
  apiRequest<ManagedUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const resetUserPassword = (userId: string, payload: ResetUserPasswordPayload) =>
  apiRequest<ManagedUser>(`/api/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateUserStatus = (userId: string, payload: UpdateUserStatusPayload) =>
  apiRequest<ManagedUser>(`/api/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const updateUserMembership = (userId: string, payload: UpdateUserMembershipPayload) =>
  apiRequest<ManagedUser>(`/api/users/${userId}/memberships`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
