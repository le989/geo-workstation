import type { GeoModuleKey } from "@geo-workstation/shared";
import { apiRequest } from "./http";

export type DepartmentStatus = "active" | "inactive";

export type Department = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  status: DepartmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListDepartmentsResult = {
  items: Department[];
  total: number;
};

export type DepartmentPayload = {
  name: string;
  code: string;
};

export type DepartmentModulePermission = {
  id: string | null;
  companyId: string;
  departmentId: string;
  moduleKey: GeoModuleKey;
  canAccess: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DepartmentPermissionsResult = {
  department: Department;
  permissions: DepartmentModulePermission[];
};

export type SaveDepartmentPermissionsPayload = {
  permissions: Array<{
    moduleKey: GeoModuleKey;
    canAccess: boolean;
  }>;
};

const withCompanyHeader = (companyId?: string) =>
  companyId
    ? {
        headers: {
          "X-Company-Id": companyId
        }
      }
    : {};

export const listDepartments = (companyId?: string) =>
  apiRequest<ListDepartmentsResult>("/api/departments", {
    method: "GET",
    ...withCompanyHeader(companyId)
  });

export const createDepartment = (payload: DepartmentPayload) =>
  apiRequest<Department>("/api/departments", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateDepartment = (departmentId: string, payload: DepartmentPayload) =>
  apiRequest<Department>(`/api/departments/${departmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const updateDepartmentStatus = (departmentId: string, status: DepartmentStatus) =>
  apiRequest<Department>(`/api/departments/${departmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

export const getDepartmentModulePermissions = (departmentId: string) =>
  apiRequest<DepartmentPermissionsResult>(`/api/departments/${departmentId}/module-permissions`, {
    method: "GET"
  });

export const saveDepartmentModulePermissions = (
  departmentId: string,
  payload: SaveDepartmentPermissionsPayload
) =>
  apiRequest<DepartmentPermissionsResult>(`/api/departments/${departmentId}/module-permissions`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
