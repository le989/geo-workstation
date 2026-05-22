import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  Prisma,
  ProductLineStatus,
  UserRole,
  type Company,
  type ProductLine
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import type { AuthUser } from "../auth/auth.types";
import type { CreateCompanyDto } from "./dto/create-company.dto";
import type { CreateProductLineDto } from "./dto/create-product-line.dto";
import type { UpdateCompanyStatusDto } from "./dto/update-company-status.dto";
import type { UpdateCompanyDto } from "./dto/update-company.dto";
import type { UpdateProductLineStatusDto } from "./dto/update-product-line-status.dto";
import type { UpdateProductLineDto } from "./dto/update-product-line.dto";

export type CompanyResponse = {
  id: string;
  name: string;
  code: string;
  type: CompanyType;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ListCompaniesResponse = {
  items: CompanyResponse[];
  total: number;
};

export type ProductLineResponse = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  status: ProductLineStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ListProductLinesResponse = {
  items: ProductLineResponse[];
  total: number;
};

@Injectable()
export class SettingsManagementService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCompanies(
    context?: ResourceAccessContext,
    currentUser?: AuthUser
  ): Promise<ListCompaniesResponse> {
    const where: Prisma.CompanyWhereInput = this.isPlatformAdmin(currentUser?.role)
      ? {}
      : context
        ? { id: getCurrentCompanyId(context) }
        : { id: "__no_company_context__" };
    const companies = await this.prisma.company.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }, { name: "asc" }]
    });

    return {
      items: companies.map((company) => this.toCompanyResponse(company)),
      total: companies.length
    };
  }

  async createCompany(
    input: CreateCompanyDto,
    currentUser?: AuthUser
  ): Promise<CompanyResponse> {
    this.assertCanManageCompanies(currentUser);
    await this.assertCompanyCodeIsUnique(input.code);

    const company = await this.prisma.company.create({
      data: {
        name: input.name,
        code: input.code,
        type: input.type ?? CompanyType.internal,
        status: CompanyStatus.active
      }
    });

    return this.toCompanyResponse(company);
  }

  async updateCompany(
    id: string,
    input: UpdateCompanyDto,
    currentUser?: AuthUser
  ): Promise<CompanyResponse> {
    this.assertCanManageCompanies(currentUser);
    await this.getCompanyOrThrow(id);

    if (input.code !== undefined) {
      await this.assertCompanyCodeIsUnique(input.code, id);
    }

    const data: Prisma.CompanyUpdateInput = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new BadRequestException("公司名称不能为空");
      }
      data.name = input.name;
    }

    if (input.code !== undefined) {
      if (!input.code.trim()) {
        throw new BadRequestException("公司编码不能为空");
      }
      data.code = input.code;
    }

    if (input.type !== undefined) {
      data.type = input.type;
    }

    const company = await this.prisma.company.update({
      where: {
        id
      },
      data
    });

    return this.toCompanyResponse(company);
  }

  async updateCompanyStatus(
    id: string,
    input: UpdateCompanyStatusDto,
    currentUser?: AuthUser
  ): Promise<CompanyResponse> {
    this.assertCanManageCompanies(currentUser);
    await this.getCompanyOrThrow(id);

    if (input.status === CompanyStatus.disabled) {
      const activeCompanyCount = await this.prisma.company.count({
        where: {
          status: CompanyStatus.active,
          id: {
            not: id
          }
        }
      });

      if (activeCompanyCount === 0) {
        throw new BadRequestException("至少需要保留一个启用公司");
      }
    }

    const company = await this.prisma.company.update({
      where: {
        id
      },
      data: {
        status: input.status
      }
    });

    return this.toCompanyResponse(company);
  }

  async listProductLines(context?: ResourceAccessContext): Promise<ListProductLinesResponse> {
    this.assertHasCompanyContext(context);
    const productLines = await this.prisma.productLine.findMany({
      where: {
        companyId: getCurrentCompanyId(context)
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { name: "asc" }]
    });

    return {
      items: productLines.map((productLine) => this.toProductLineResponse(productLine)),
      total: productLines.length
    };
  }

  async createProductLine(
    input: CreateProductLineDto,
    context?: ResourceAccessContext
  ): Promise<ProductLineResponse> {
    this.assertCanManageProductLines(context);
    const companyId = getCurrentCompanyId(context);
    await this.assertProductLineCodeIsUnique(companyId, input.code);

    const productLine = await this.prisma.productLine.create({
      data: {
        companyId,
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        status: ProductLineStatus.active
      }
    });

    return this.toProductLineResponse(productLine);
  }

  async updateProductLine(
    id: string,
    input: UpdateProductLineDto,
    context?: ResourceAccessContext
  ): Promise<ProductLineResponse> {
    this.assertCanManageProductLines(context);
    const companyId = getCurrentCompanyId(context);
    await this.getProductLineOrThrow(id, companyId);

    if (input.code !== undefined) {
      await this.assertProductLineCodeIsUnique(companyId, input.code, id);
    }

    const data: Prisma.ProductLineUpdateInput = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new BadRequestException("产品线名称不能为空");
      }
      data.name = input.name;
    }

    if (input.code !== undefined) {
      if (!input.code.trim()) {
        throw new BadRequestException("产品线编码不能为空");
      }
      data.code = input.code;
    }

    if (input.description !== undefined) {
      data.description = input.description ?? null;
    }

    const productLine = await this.prisma.productLine.update({
      where: {
        id
      },
      data
    });

    return this.toProductLineResponse(productLine);
  }

  async updateProductLineStatus(
    id: string,
    input: UpdateProductLineStatusDto,
    context?: ResourceAccessContext
  ): Promise<ProductLineResponse> {
    this.assertCanManageProductLines(context);
    const companyId = getCurrentCompanyId(context);
    await this.getProductLineOrThrow(id, companyId);

    const productLine = await this.prisma.productLine.update({
      where: {
        id
      },
      data: {
        status: input.status
      }
    });

    return this.toProductLineResponse(productLine);
  }

  private assertHasCompanyContext(
    context: ResourceAccessContext | undefined
  ): asserts context is ResourceAccessContext {
    if (!context) {
      throw new ForbiddenException("缺少当前公司上下文");
    }
  }

  private assertCanManageCompanies(currentUser?: AuthUser): asserts currentUser is AuthUser {
    if (!currentUser?.isPlatformAdmin && !this.isPlatformAdmin(currentUser?.role)) {
      throw new ForbiddenException("当前角色无权管理公司");
    }
  }

  private assertCanManageProductLines(
    context: ResourceAccessContext | undefined
  ): asserts context is ResourceAccessContext {
    this.assertHasCompanyContext(context);
    const role = getEffectiveRole(context);

    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("当前角色无权维护产品线");
    }
  }

  private isPlatformAdmin(role?: UserRole): boolean {
    return role === UserRole.platform_admin || role === UserRole.admin;
  }

  private async getCompanyOrThrow(id: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: {
        id
      }
    });

    if (!company) {
      throw new NotFoundException("公司不存在");
    }

    return company;
  }

  private async getProductLineOrThrow(id: string, companyId: string): Promise<ProductLine> {
    const productLine = await this.prisma.productLine.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!productLine) {
      throw new NotFoundException("产品线不存在");
    }

    return productLine;
  }

  private async assertCompanyCodeIsUnique(code: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.company.findUnique({
      where: {
        code
      },
      select: {
        id: true
      }
    });

    if (existing && existing.id !== excludeId) {
      throw new BadRequestException("公司编码已存在");
    }
  }

  private async assertProductLineCodeIsUnique(
    companyId: string,
    code: string,
    excludeId?: string
  ): Promise<void> {
    const existing = await this.prisma.productLine.findFirst({
      where: {
        companyId,
        code,
        ...(excludeId
          ? {
              id: {
                not: excludeId
              }
            }
          : {})
      },
      select: {
        id: true
      }
    });

    if (existing) {
      throw new BadRequestException("产品线编码已存在");
    }
  }

  private toCompanyResponse(company: Company): CompanyResponse {
    return {
      id: company.id,
      name: company.name,
      code: company.code,
      type: company.type,
      status: company.status,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };
  }

  private toProductLineResponse(productLine: ProductLine): ProductLineResponse {
    return {
      id: productLine.id,
      companyId: productLine.companyId,
      name: productLine.name,
      code: productLine.code,
      description: productLine.description ?? undefined,
      status: productLine.status,
      createdAt: productLine.createdAt,
      updatedAt: productLine.updatedAt
    };
  }
}
