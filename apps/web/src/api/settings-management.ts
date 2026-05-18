import { apiGet, apiRequest } from "./http";

export type CompanyType = "internal" | "customer";
export type CompanyStatus = "active" | "disabled";
export type ProductLineStatus = "active" | "disabled";

export type ManagedCompany = {
  id: string;
  name: string;
  code: string;
  type: CompanyType;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
};

export type ManagedProductLine = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  status: ProductLineStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListCompaniesResult = {
  items: ManagedCompany[];
  total: number;
};

export type ListProductLinesResult = {
  items: ManagedProductLine[];
  total: number;
};

export type CompanyPayload = {
  name: string;
  code: string;
  type: CompanyType;
};

export type ProductLinePayload = {
  name: string;
  code: string;
};

export const listCompanies = () => apiGet<ListCompaniesResult>("/api/companies");

export const createCompany = (payload: CompanyPayload) =>
  apiRequest<ManagedCompany>("/api/companies", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateCompany = (companyId: string, payload: Partial<CompanyPayload>) =>
  apiRequest<ManagedCompany>(`/api/companies/${companyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const updateCompanyStatus = (companyId: string, status: CompanyStatus) =>
  apiRequest<ManagedCompany>(`/api/companies/${companyId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

export const listProductLines = () => apiGet<ListProductLinesResult>("/api/product-lines");

export const createProductLine = (payload: ProductLinePayload) =>
  apiRequest<ManagedProductLine>("/api/product-lines", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateProductLine = (
  productLineId: string,
  payload: Partial<ProductLinePayload>
) =>
  apiRequest<ManagedProductLine>(`/api/product-lines/${productLineId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const updateProductLineStatus = (
  productLineId: string,
  status: ProductLineStatus
) =>
  apiRequest<ManagedProductLine>(`/api/product-lines/${productLineId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
