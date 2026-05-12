import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  GeoPromptType,
  Prisma,
  UserRole,
  UserStatus,
  type InstructionTemplate
} from "@prisma/client";
import type { CreateInstructionTemplateDto } from "./dto/create-instruction-template.dto";
import type { DuplicateInstructionTemplateDto } from "./dto/duplicate-instruction-template.dto";
import type { QueryInstructionTemplatesDto } from "./dto/query-instruction-templates.dto";
import type { UpdateInstructionTemplateDto } from "./dto/update-instruction-template.dto";
import {
  buildInstructionTemplateCopyName,
  buildInstructionTemplateNumberedCopyName
} from "./utils/duplicate-name.util";
import {
  normalizeCreateInstructionTemplate,
  normalizeDuplicateInstructionTemplate,
  normalizeQueryInstructionTemplates,
  normalizeUpdateInstructionTemplate,
  trimOptional,
  type NormalizedQueryInstructionTemplates
} from "./utils/normalize-instruction-template";
import { PrismaService } from "../../prisma/prisma.service";

const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";

export type InstructionTemplateResponse = {
  id: string;
  name: string;
  instructionType: string;
  contentType: string;
  targetPromptType?: GeoPromptType;
  targetModel?: string;
  instruction: string;
  outputFormat?: string;
  qualityRules?: string;
  forbiddenRules?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InstructionTemplateListResponse = {
  items: InstructionTemplateResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type DeleteInstructionTemplateResponse = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: Date;
};

@Injectable()
export class InstructionTemplatesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(query: QueryInstructionTemplatesDto): Promise<InstructionTemplateListResponse> {
    const normalized = normalizeQueryInstructionTemplates(query);
    const where = this.buildWhere(normalized);

    const [items, total] = await Promise.all([
      this.prisma.instructionTemplate.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.instructionTemplate.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      total,
      page: normalized.page,
      pageSize: normalized.pageSize
    };
  }

  async create(input: CreateInstructionTemplateDto): Promise<InstructionTemplateResponse> {
    const normalized = normalizeCreateInstructionTemplate(input);
    await this.assertNameIsUnique(normalized.instructionType, normalized.name);
    const createdById = await this.resolveCreatedById(normalized.createdBy);

    const created = await this.prisma.instructionTemplate.create({
      data: {
        name: normalized.name,
        instructionType: normalized.instructionType,
        contentType: normalized.contentType,
        targetPromptType: normalized.targetPromptType,
        targetModel: normalized.targetModel,
        instruction: normalized.instruction,
        outputFormat: normalized.outputFormat,
        qualityRules: normalized.qualityRules,
        forbiddenRules: normalized.forbiddenRules,
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });

    return this.toResponse(created);
  }

  async getDetail(id: string): Promise<InstructionTemplateResponse> {
    const existing = await this.findActiveInstructionTemplate(id);
    return this.toResponse(existing);
  }

  async update(
    id: string,
    input: UpdateInstructionTemplateDto
  ): Promise<InstructionTemplateResponse> {
    const existing = await this.findExistingInstructionTemplate(id);

    if (existing.deletedAt) {
      throw new BadRequestException(`Deleted GEO instruction template cannot be updated: ${id}`);
    }

    const normalized = normalizeUpdateInstructionTemplate(input);
    const nextInstructionType = normalized.instructionType ?? existing.instructionType;
    const nextName = normalized.name ?? existing.name;

    if (nextInstructionType !== existing.instructionType || nextName !== existing.name) {
      await this.assertNameIsUnique(nextInstructionType, nextName, id);
    }

    const data: Prisma.InstructionTemplateUpdateInput = {};

    if (normalized.name !== undefined) {
      data.name = normalized.name;
    }
    if (normalized.instructionType !== undefined) {
      data.instructionType = normalized.instructionType;
    }
    if (normalized.contentType !== undefined) {
      data.contentType = normalized.contentType;
    }
    if (normalized.targetPromptType !== undefined) {
      data.targetPromptType = normalized.targetPromptType;
    }
    if (normalized.targetModel !== undefined) {
      data.targetModel = normalized.targetModel;
    }
    if (normalized.instruction !== undefined) {
      data.instruction = normalized.instruction;
    }
    if (normalized.outputFormat !== undefined) {
      data.outputFormat = normalized.outputFormat;
    }
    if (normalized.qualityRules !== undefined) {
      data.qualityRules = normalized.qualityRules;
    }
    if (normalized.forbiddenRules !== undefined) {
      data.forbiddenRules = normalized.forbiddenRules;
    }

    const updated = await this.prisma.instructionTemplate.update({
      where: {
        id
      },
      data
    });

    return this.toResponse(updated);
  }

  async duplicate(
    id: string,
    input: DuplicateInstructionTemplateDto
  ): Promise<InstructionTemplateResponse> {
    const source = await this.findActiveInstructionTemplate(id);
    const normalized = normalizeDuplicateInstructionTemplate(input);
    const baseName = normalized.name ?? buildInstructionTemplateCopyName(source.name);
    const copyName = await this.resolveAvailableCopyName(source.instructionType, baseName);
    const createdById = normalized.createdBy
      ? await this.resolveCreatedById(normalized.createdBy)
      : source.createdById;

    const duplicated = await this.prisma.instructionTemplate.create({
      data: {
        name: copyName,
        instructionType: source.instructionType,
        contentType: source.contentType,
        targetPromptType: source.targetPromptType,
        targetModel: source.targetModel,
        instruction: source.instruction,
        outputFormat: source.outputFormat,
        qualityRules: source.qualityRules,
        forbiddenRules: source.forbiddenRules,
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });

    return this.toResponse(duplicated);
  }

  async softDelete(id: string): Promise<DeleteInstructionTemplateResponse> {
    const existing = await this.findExistingInstructionTemplate(id);

    if (existing.deletedAt) {
      return {
        id,
        deleted: true,
        alreadyDeleted: true,
        deletedAt: existing.deletedAt
      };
    }

    const deleted = await this.prisma.instructionTemplate.update({
      where: {
        id
      },
      data: {
        deletedAt: new Date()
      }
    });

    return {
      id,
      deleted: true,
      alreadyDeleted: false,
      deletedAt: deleted.deletedAt ?? new Date()
    };
  }

  private buildWhere(
    query: NormalizedQueryInstructionTemplates
  ): Prisma.InstructionTemplateWhereInput {
    const where: Prisma.InstructionTemplateWhereInput = {
      deletedAt: null
    };

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          instruction: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          contentType: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          instructionType: {
            contains: query.search,
            mode: "insensitive"
          }
        }
      ];
    }

    if (query.instructionType) {
      where.instructionType = query.instructionType;
    }
    if (query.contentType) {
      where.contentType = query.contentType;
    }
    if (query.targetPromptType) {
      where.targetPromptType = query.targetPromptType;
    }
    if (query.targetModel) {
      where.targetModel = query.targetModel;
    }
    if (query.createdBy) {
      where.createdById = query.createdBy;
    }

    return where;
  }

  private async findExistingInstructionTemplate(id: string): Promise<InstructionTemplate> {
    const existing = await this.prisma.instructionTemplate.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new NotFoundException(`GEO instruction template not found: ${id}`);
    }

    return existing;
  }

  private async findActiveInstructionTemplate(id: string): Promise<InstructionTemplate> {
    const existing = await this.findExistingInstructionTemplate(id);

    if (existing.deletedAt) {
      throw new BadRequestException(`Deleted GEO instruction template cannot be accessed: ${id}`);
    }

    return existing;
  }

  private async assertNameIsUnique(
    instructionType: string,
    name: string,
    excludeId?: string
  ): Promise<void> {
    const existing = await this.prisma.instructionTemplate.findFirst({
      where: {
        instructionType,
        name,
        deletedAt: null,
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
      throw new BadRequestException(
        `Active GEO instruction template already exists: ${instructionType} / ${name}`
      );
    }
  }

  private async resolveAvailableCopyName(
    instructionType: string,
    baseName: string
  ): Promise<string> {
    let candidateName = baseName;
    let sequence = 2;

    while (await this.activeNameExists(instructionType, candidateName)) {
      candidateName = buildInstructionTemplateNumberedCopyName(baseName, sequence);
      sequence += 1;
    }

    return candidateName;
  }

  private async activeNameExists(instructionType: string, name: string): Promise<boolean> {
    const existing = await this.prisma.instructionTemplate.findFirst({
      where: {
        instructionType,
        name,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    return Boolean(existing);
  }

  private toResponse(template: InstructionTemplate): InstructionTemplateResponse {
    return {
      id: template.id,
      name: template.name,
      instructionType: template.instructionType,
      contentType: template.contentType,
      targetPromptType: template.targetPromptType ?? undefined,
      targetModel: template.targetModel ?? undefined,
      instruction: template.instruction,
      outputFormat: template.outputFormat ?? undefined,
      qualityRules: template.qualityRules ?? undefined,
      forbiddenRules: template.forbiddenRules ?? undefined,
      createdBy: template.createdById,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  private async resolveCreatedById(createdBy?: string): Promise<string> {
    const normalizedCreatedBy = trimOptional(createdBy);

    if (normalizedCreatedBy) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: normalizedCreatedBy
        },
        select: {
          id: true
        }
      });

      if (!user) {
        throw new BadRequestException(
          `createdBy must reference an existing user: ${normalizedCreatedBy}`
        );
      }

      return user.id;
    }

    const admin = await this.prisma.user.findFirst({
      where: {
        role: UserRole.admin,
        status: UserStatus.active
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    });

    if (admin) {
      return admin.id;
    }

    const systemOperator = await this.prisma.user.upsert({
      where: {
        email: SYSTEM_GEO_OPERATOR_EMAIL
      },
      create: {
        email: SYSTEM_GEO_OPERATOR_EMAIL,
        name: "System GEO Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      },
      update: {
        status: UserStatus.active
      },
      select: {
        id: true
      }
    });

    return systemOperator.id;
  }
}
