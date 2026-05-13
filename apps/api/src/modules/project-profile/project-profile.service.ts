import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type ProjectProfile } from "@prisma/client";
import type { CreateProjectProfileDto } from "./dto/create-project-profile.dto";
import type { UpdateProjectProfileDto } from "./dto/update-project-profile.dto";
import { PrismaService } from "../../prisma/prisma.service";

export type ProjectProfileResponse = {
  id: string;
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

  async getCurrent(): Promise<ProjectProfileResponse | null> {
    const profile = await this.findFirstProfile();
    return profile ? this.toResponse(profile) : null;
  }

  async create(input: CreateProjectProfileDto): Promise<ProjectProfileResponse> {
    const existing = await this.findFirstProfile();

    if (existing) {
      throw new BadRequestException("当前工作站已配置项目档案，请使用编辑更新。");
    }

    const profile = await this.prisma.projectProfile.create({
      data: this.toCreateData(input)
    });

    return this.toResponse(profile);
  }

  async update(input: UpdateProjectProfileDto): Promise<ProjectProfileResponse> {
    const existing = await this.findFirstProfile();

    if (!existing) {
      throw new NotFoundException("尚未配置项目档案，请先创建。");
    }

    const profile = await this.prisma.projectProfile.update({
      where: {
        id: existing.id
      },
      data: this.toUpdateData(input)
    });

    return this.toResponse(profile);
  }

  async getPromptContext(): Promise<ProjectProfileResponse | null> {
    return this.getCurrent();
  }

  private findFirstProfile(): Promise<ProjectProfile | null> {
    return this.prisma.projectProfile.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  private toCreateData(input: CreateProjectProfileDto): Prisma.ProjectProfileCreateInput {
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
      notes: input.notes
    };
  }

  private toUpdateData(input: UpdateProjectProfileDto): Prisma.ProjectProfileUpdateInput {
    const data: Prisma.ProjectProfileUpdateInput = {};

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
