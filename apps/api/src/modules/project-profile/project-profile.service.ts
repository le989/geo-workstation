import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, type ProjectProfile } from "@prisma/client";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import type { CreateProjectProfileDto } from "./dto/create-project-profile.dto";
import type { UpdateProjectProfileDto } from "./dto/update-project-profile.dto";
import { PrismaService } from "../../prisma/prisma.service";

export type ProjectProfileResponse = {
  id: string;
  companyId?: string;
  projectName: string;
  companyName?: string;
  brandName?: string;
  websiteUrl?: string;
  industry?: string;
  mainProducts: string[];
  targetCustomers?: string;
  positioning?: string;
  tone?: string;
  forbiddenClaims: string[];
  targetModels: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProjectProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCurrent(context?: ResourceAccessContext): Promise<ProjectProfileResponse | null> {
    if (!context) {
      return null;
    }

    const profile = await this.findProfileByCompany(getCurrentCompanyId(context));
    return profile ? this.toResponse(profile) : null;
  }

  async create(
    input: CreateProjectProfileDto,
    context?: ResourceAccessContext
  ): Promise<ProjectProfileResponse> {
    this.assertCanWriteProfile(context);
    const companyId = getCurrentCompanyId(context);
    const existing = await this.findProfileByCompany(companyId);

    if (existing) {
      throw new BadRequestException("当前工作站已配置项目档案，请使用编辑更新。");
    }

    const profile = await this.prisma.projectProfile.create({
      data: this.toCreateData(input, context)
    });

    return this.toResponse(profile);
  }

  async update(
    input: UpdateProjectProfileDto,
    context?: ResourceAccessContext
  ): Promise<ProjectProfileResponse> {
    this.assertCanWriteProfile(context);
    const existing = await this.findProfileByCompany(getCurrentCompanyId(context));

    if (!existing) {
      throw new NotFoundException("尚未配置项目档案，请先创建。");
    }

    const profile = await this.prisma.projectProfile.update({
      where: {
        id: existing.id
      },
      data: this.toUpdateData(input, context)
    });

    return this.toResponse(profile);
  }

  async getPromptContext(context?: ResourceAccessContext): Promise<ProjectProfileResponse | null> {
    return this.getCurrent(context);
  }

  private findProfileByCompany(companyId: string): Promise<ProjectProfile | null> {
    return this.prisma.projectProfile.findFirst({
      where: {
        companyId
      },
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  private assertCanWriteProfile(
    context: ResourceAccessContext | undefined
  ): asserts context is ResourceAccessContext {
    if (!context) {
      throw new ForbiddenException("缺少当前公司上下文，无法维护项目档案");
    }

    if (getEffectiveRole(context) !== "platform_admin") {
      throw new ForbiddenException("当前角色无权维护项目档案");
    }
  }

  private toCreateData(
    input: CreateProjectProfileDto,
    context: ResourceAccessContext
  ): Prisma.ProjectProfileCreateInput {
    const projectName = input.projectName.trim();

    if (!projectName) {
      throw new BadRequestException("项目名称不能为空。");
    }

    return {
      projectName,
      companyName: input.companyName,
      brandName: input.brandName,
      websiteUrl: input.websiteUrl,
      industry: input.industry,
      mainProducts: this.toJsonArray(input.mainProducts),
      targetCustomers: input.targetCustomers,
      positioning: input.positioning,
      tone: input.tone,
      forbiddenClaims: this.toJsonArray(input.forbiddenClaims),
      targetModels: this.toJsonArray(input.targetModels),
      notes: input.notes,
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
  }

  private toUpdateData(
    input: UpdateProjectProfileDto,
    context: ResourceAccessContext
  ): Prisma.ProjectProfileUpdateInput {
    const data: Prisma.ProjectProfileUpdateInput = {
      updatedBy: {
        connect: {
          id: context.user.id
        }
      }
    };

    if (input.projectName !== undefined) {
      const projectName = input.projectName.trim();

      if (!projectName) {
        throw new BadRequestException("项目名称不能为空。");
      }

      data.projectName = projectName;
    }

    this.assignString(data, "companyName", input.companyName);
    this.assignString(data, "brandName", input.brandName);
    this.assignString(data, "websiteUrl", input.websiteUrl);
    this.assignString(data, "industry", input.industry);
    this.assignString(data, "targetCustomers", input.targetCustomers);
    this.assignString(data, "positioning", input.positioning);
    this.assignString(data, "tone", input.tone);
    this.assignString(data, "notes", input.notes);

    if (input.mainProducts !== undefined) {
      data.mainProducts = this.toJsonArray(input.mainProducts);
    }

    if (input.forbiddenClaims !== undefined) {
      data.forbiddenClaims = this.toJsonArray(input.forbiddenClaims);
    }

    if (input.targetModels !== undefined) {
      data.targetModels = this.toJsonArray(input.targetModels);
    }

    return data;
  }

  private assignString<T extends keyof Prisma.ProjectProfileUpdateInput>(
    data: Prisma.ProjectProfileUpdateInput,
    key: T,
    value: string | undefined
  ) {
    if (value !== undefined) {
      data[key] = value as Prisma.ProjectProfileUpdateInput[T];
    }
  }

  private toJsonArray(value: unknown): Prisma.InputJsonValue | undefined {
    if (!value) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const items = value.map((item) => String(item).trim()).filter(Boolean);
      return items.length > 0 ? items : undefined;
    }

    if (typeof value === "string") {
      const items = value
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      return items.length > 0 ? items : undefined;
    }

    return undefined;
  }

  private fromJsonArray(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  private toResponse(profile: ProjectProfile): ProjectProfileResponse {
    return {
      id: profile.id,
      companyId: profile.companyId ?? undefined,
      projectName: profile.projectName,
      companyName: profile.companyName ?? undefined,
      brandName: profile.brandName ?? undefined,
      websiteUrl: profile.websiteUrl ?? undefined,
      industry: profile.industry ?? undefined,
      mainProducts: this.fromJsonArray(profile.mainProducts),
      targetCustomers: profile.targetCustomers ?? undefined,
      positioning: profile.positioning ?? undefined,
      tone: profile.tone ?? undefined,
      forbiddenClaims: this.fromJsonArray(profile.forbiddenClaims),
      targetModels: this.fromJsonArray(profile.targetModels),
      notes: profile.notes ?? undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }
}
