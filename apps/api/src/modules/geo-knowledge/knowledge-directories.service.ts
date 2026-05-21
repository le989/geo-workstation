import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type KnowledgeBase, type KnowledgeDirectory } from "@prisma/client";
import type { CreateKnowledgeDirectoryDto } from "./dto/create-knowledge-directory.dto";
import type { UpdateKnowledgeDirectoryDto } from "./dto/update-knowledge-directory.dto";
import { trimOptional } from "./utils/normalize-knowledge-base";
import {
  assertCanUpdateResource,
  buildResourceReadWhere,
  canReadResource,
  getCurrentCompanyId,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";

export const DEFAULT_KNOWLEDGE_DIRECTORY_NAME = "默认根目录";
export const KNOWLEDGE_DIRECTORY_ACTIVE_STATUS = "active";
export const KNOWLEDGE_DIRECTORY_DISABLED_STATUS = "disabled";

export type KnowledgeDirectoryResponse = {
  id: string;
  knowledgeBaseId: string;
  companyId?: string;
  name: string;
  status: string;
  isDefault: boolean;
  disabledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type KnowledgeDirectoryListResponse = {
  items: KnowledgeDirectoryResponse[];
};

type KnowledgeDirectoryWithBase = KnowledgeDirectory & {
  knowledgeBase: KnowledgeBase;
};

@Injectable()
export class KnowledgeDirectoriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(
    knowledgeBaseId: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeDirectoryListResponse> {
    const knowledgeBase = await this.findActiveKnowledgeBase(knowledgeBaseId, context);
    await this.ensureDefaultDirectory(knowledgeBase, context);
    const items = await this.prisma.knowledgeDirectory.findMany({
      where: {
        knowledgeBaseId: knowledgeBase.id
      },
      orderBy: [
        {
          isDefault: "desc"
        },
        {
          status: "asc"
        },
        {
          name: "asc"
        }
      ]
    });

    return {
      items: items.map((item) => this.toDirectoryResponse(item))
    };
  }

  async create(
    knowledgeBaseId: string,
    input: CreateKnowledgeDirectoryDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeDirectoryResponse> {
    const knowledgeBase = await this.findActiveKnowledgeBase(knowledgeBaseId, context);
    this.assertCanManageDirectory(knowledgeBase, context);
    const name = this.normalizeDirectoryName(input.name);

    if (name === DEFAULT_KNOWLEDGE_DIRECTORY_NAME) {
      throw new BadRequestException("默认根目录由系统维护，不能重复创建。");
    }

    await this.assertDirectoryNameIsUnique(knowledgeBase.id, name);

    const created = await this.prisma.knowledgeDirectory.create({
      data: {
        name,
        status: KNOWLEDGE_DIRECTORY_ACTIVE_STATUS,
        isDefault: false,
        company: this.resolveCompanyConnect(knowledgeBase, context),
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        createdBy: {
          connect: {
            id: context?.user.id ?? knowledgeBase.createdById
          }
        },
        ...(context
          ? {
              updatedBy: {
                connect: {
                  id: context.user.id
                }
              }
            }
          : {})
      }
    });

    return this.toDirectoryResponse(created);
  }

  async update(
    id: string,
    input: UpdateKnowledgeDirectoryDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeDirectoryResponse> {
    const existing = await this.findExistingDirectory(id, context);
    this.assertCanManageDirectory(existing.knowledgeBase, context);

    if (existing.isDefault) {
      throw new BadRequestException("默认根目录不能重命名。");
    }

    const name = this.normalizeDirectoryName(input.name);
    if (name === DEFAULT_KNOWLEDGE_DIRECTORY_NAME) {
      throw new BadRequestException("默认根目录由系统维护，不能作为自定义目录名称。");
    }
    await this.assertDirectoryNameIsUnique(existing.knowledgeBaseId, name, existing.id);

    const updated = await this.prisma.knowledgeDirectory.update({
      where: {
        id: existing.id
      },
      data: {
        name,
        ...(context
          ? {
              updatedBy: {
                connect: {
                  id: context.user.id
                }
              }
            }
          : {})
      }
    });

    return this.toDirectoryResponse(updated);
  }

  async disable(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeDirectoryResponse> {
    const existing = await this.findExistingDirectory(id, context);
    this.assertCanManageDirectory(existing.knowledgeBase, context);

    if (existing.isDefault) {
      throw new BadRequestException("默认根目录不能停用。");
    }

    if (existing.status === KNOWLEDGE_DIRECTORY_DISABLED_STATUS && existing.disabledAt) {
      return this.toDirectoryResponse(existing);
    }

    const disabledAt = new Date();
    const updated = await this.prisma.knowledgeDirectory.update({
      where: {
        id: existing.id
      },
      data: {
        status: KNOWLEDGE_DIRECTORY_DISABLED_STATUS,
        disabledAt,
        ...(context
          ? {
              updatedBy: {
                connect: {
                  id: context.user.id
                }
              }
            }
          : {})
      }
    });

    return this.toDirectoryResponse(updated);
  }

  async ensureDefaultDirectory(
    knowledgeBase: KnowledgeBase,
    context?: ResourceAccessContext
  ): Promise<KnowledgeDirectory> {
    const existingDefault = await this.prisma.knowledgeDirectory.findFirst({
      where: {
        knowledgeBaseId: knowledgeBase.id,
        isDefault: true
      }
    });

    if (existingDefault) {
      if (
        existingDefault.name !== DEFAULT_KNOWLEDGE_DIRECTORY_NAME ||
        existingDefault.status !== KNOWLEDGE_DIRECTORY_ACTIVE_STATUS ||
        existingDefault.disabledAt
      ) {
        return this.prisma.knowledgeDirectory.update({
          where: {
            id: existingDefault.id
          },
          data: {
            name: DEFAULT_KNOWLEDGE_DIRECTORY_NAME,
            status: KNOWLEDGE_DIRECTORY_ACTIVE_STATUS,
            disabledAt: null,
            ...(context
              ? {
                  updatedBy: {
                    connect: {
                      id: context.user.id
                    }
                  }
                }
              : {})
          }
        });
      }

      return existingDefault;
    }

    const existingByName = await this.prisma.knowledgeDirectory.findUnique({
      where: {
        knowledgeBaseId_name: {
          knowledgeBaseId: knowledgeBase.id,
          name: DEFAULT_KNOWLEDGE_DIRECTORY_NAME
        }
      }
    });

    if (existingByName) {
      return this.prisma.knowledgeDirectory.update({
        where: {
          id: existingByName.id
        },
        data: {
          isDefault: true,
          status: KNOWLEDGE_DIRECTORY_ACTIVE_STATUS,
          disabledAt: null,
          ...(context
            ? {
                updatedBy: {
                  connect: {
                    id: context.user.id
                  }
                }
              }
            : {})
        }
      });
    }

    return this.prisma.knowledgeDirectory.create({
      data: {
        name: DEFAULT_KNOWLEDGE_DIRECTORY_NAME,
        status: KNOWLEDGE_DIRECTORY_ACTIVE_STATUS,
        isDefault: true,
        company: this.resolveCompanyConnect(knowledgeBase, context),
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        createdBy: {
          connect: {
            id: context?.user.id ?? knowledgeBase.createdById
          }
        },
        ...(context
          ? {
              updatedBy: {
                connect: {
                  id: context.user.id
                }
              }
            }
          : {})
      }
    });
  }

  private async findActiveKnowledgeBase(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeBase> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: context
        ? {
            AND: [
              {
                id,
                deletedAt: null
              },
              buildResourceReadWhere(context) as Prisma.KnowledgeBaseWhereInput
            ]
          }
        : {
            id,
            deletedAt: null
          }
    });

    if (!knowledgeBase) {
      throw new NotFoundException(`GEO knowledge base not found: ${id}`);
    }

    return knowledgeBase;
  }

  private async findExistingDirectory(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeDirectoryWithBase> {
    const directory = await this.prisma.knowledgeDirectory.findFirst({
      where: {
        id
      },
      include: {
        knowledgeBase: true
      }
    });

    if (!directory || (context && !canReadResource(context, directory.knowledgeBase))) {
      throw new NotFoundException(`GEO knowledge directory not found: ${id}`);
    }

    return directory;
  }

  private assertCanManageDirectory(
    knowledgeBase: KnowledgeBase,
    context?: ResourceAccessContext
  ): void {
    if (!context) {
      return;
    }

    try {
      assertCanUpdateResource(context, knowledgeBase);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw error;
    }
  }

  private async assertDirectoryNameIsUnique(
    knowledgeBaseId: string,
    name: string,
    excludeId?: string
  ): Promise<void> {
    const duplicate = await this.prisma.knowledgeDirectory.findFirst({
      where: {
        knowledgeBaseId,
        name,
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

    if (duplicate) {
      throw new BadRequestException(`知识库目录已存在：${name}`);
    }
  }

  private normalizeDirectoryName(value?: string): string {
    const name = trimOptional(value);
    if (!name) {
      throw new BadRequestException("知识库目录名称不能为空。");
    }

    return name;
  }

  private resolveCompanyConnect(
    knowledgeBase: KnowledgeBase,
    context?: ResourceAccessContext
  ): Prisma.KnowledgeDirectoryCreateInput["company"] {
    const companyId = context ? getCurrentCompanyId(context) : (knowledgeBase.companyId ?? undefined);

    return companyId
      ? {
          connect: {
            id: companyId
          }
        }
      : undefined;
  }

  private toDirectoryResponse(directory: KnowledgeDirectory): KnowledgeDirectoryResponse {
    return {
      id: directory.id,
      knowledgeBaseId: directory.knowledgeBaseId,
      companyId: directory.companyId ?? undefined,
      name: directory.name,
      status: directory.status,
      isDefault: directory.isDefault,
      disabledAt: directory.disabledAt ?? undefined,
      createdAt: directory.createdAt,
      updatedAt: directory.updatedAt
    };
  }
}
