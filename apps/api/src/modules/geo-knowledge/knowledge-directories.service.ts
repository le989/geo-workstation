import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
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
import { OperationLogsService } from "../usage/operation-logs.service";
import { PrismaService } from "../../prisma/prisma.service";

export const DEFAULT_KNOWLEDGE_DIRECTORY_NAME = "默认根目录";
export const KNOWLEDGE_DIRECTORY_ACTIVE_STATUS = "active";
export const KNOWLEDGE_DIRECTORY_DISABLED_STATUS = "disabled";
export const MAX_KNOWLEDGE_DIRECTORY_DEPTH = 4;

export type KnowledgeDirectoryResponse = {
  id: string;
  knowledgeBaseId: string;
  companyId?: string;
  parentId?: string;
  name: string;
  status: string;
  isDefault: boolean;
  sortOrder: number;
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
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(OperationLogsService)
    private readonly operationLogsService?: OperationLogsService
  ) {}

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
          sortOrder: "asc"
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
    const parent = await this.resolveParentDirectory(knowledgeBase, input.parentId, context);

    if (name === DEFAULT_KNOWLEDGE_DIRECTORY_NAME) {
      throw new BadRequestException("默认根目录由系统维护，不能重复创建。");
    }

    await this.assertDirectoryNameIsUnique(knowledgeBase.id, parent?.id ?? null, name);

    const created = await this.prisma.knowledgeDirectory.create({
      data: {
        name,
        status: KNOWLEDGE_DIRECTORY_ACTIVE_STATUS,
        isDefault: false,
        sortOrder: 0,
        company: this.resolveCompanyConnect(knowledgeBase, context),
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        ...(parent
          ? {
              parent: {
                connect: {
                  id: parent.id
                }
              }
            }
          : {}),
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

    // 只记录目录审计摘要，不记录请求原文、目录树快照或子文件列表。
    await this.recordKnowledgeDirectoryOperation(
      "knowledge_base.directory.created",
      created,
      {
        statusAfter: created.status,
        changedFields: ["name", "parentId"]
      },
      context
    );

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
    await this.assertDirectoryNameIsUnique(
      existing.knowledgeBaseId,
      existing.parentId ?? null,
      name,
      existing.id
    );

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

    // 只记录字段名和状态摘要，不记录目录名新旧值或原始请求体。
    await this.recordKnowledgeDirectoryOperation(
      "knowledge_base.directory.updated",
      updated,
      {
        statusBefore: existing.status,
        statusAfter: updated.status,
        changedFields: existing.name === updated.name ? [] : ["name"]
      },
      context
    );

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

    const activeChildrenCount = await this.prisma.knowledgeDirectory.count({
      where: {
        parentId: existing.id,
        status: KNOWLEDGE_DIRECTORY_ACTIVE_STATUS
      }
    });
    if (activeChildrenCount > 0) {
      throw new BadRequestException("目录下仍有启用子目录，请先停用或迁移子目录。");
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

    // 只在首次停用成功后记录用户操作审计，重复停用沿用原有直接返回逻辑。
    await this.recordKnowledgeDirectoryOperation(
      "knowledge_base.directory.disabled",
      updated,
      {
        statusBefore: existing.status,
        statusAfter: updated.status
      },
      context
    );

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
        existingDefault.disabledAt ||
        existingDefault.parentId ||
        existingDefault.sortOrder !== 0
      ) {
        return this.prisma.knowledgeDirectory.update({
          where: {
            id: existingDefault.id
          },
          data: {
            name: DEFAULT_KNOWLEDGE_DIRECTORY_NAME,
            status: KNOWLEDGE_DIRECTORY_ACTIVE_STATUS,
            disabledAt: null,
            parent: {
              disconnect: true
            },
            sortOrder: 0,
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

    const existingByName = await this.prisma.knowledgeDirectory.findFirst({
      where: {
        knowledgeBaseId: knowledgeBase.id,
        name: DEFAULT_KNOWLEDGE_DIRECTORY_NAME,
        parentId: null
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
          parent: {
            disconnect: true
          },
          sortOrder: 0,
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
        sortOrder: 0,
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
    parentId: string | null,
    name: string,
    excludeId?: string
  ): Promise<void> {
    const duplicate = await this.prisma.knowledgeDirectory.findFirst({
      where: {
        knowledgeBaseId,
        parentId,
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
      throw new BadRequestException(`同一父级下已存在目录：${name}`);
    }
  }

  private async resolveParentDirectory(
    knowledgeBase: KnowledgeBase,
    requestedParentId?: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeDirectory | null> {
    const parentId = trimOptional(requestedParentId);
    if (!parentId) {
      return null;
    }

    const parent = await this.prisma.knowledgeDirectory.findFirst({
      where: {
        id: parentId
      }
    });
    if (!parent) {
      throw new BadRequestException(`父级目录不存在：${parentId}`);
    }
    if (parent.knowledgeBaseId !== knowledgeBase.id) {
      throw new BadRequestException("父级目录必须属于当前知识库。");
    }

    const companyId = context ? getCurrentCompanyId(context) : (knowledgeBase.companyId ?? undefined);
    if (companyId && parent.companyId && parent.companyId !== companyId) {
      throw new BadRequestException("父级目录必须属于当前公司。");
    }
    if (parent.status !== KNOWLEDGE_DIRECTORY_ACTIVE_STATUS) {
      throw new BadRequestException("停用目录不能创建子目录。");
    }

    const parentDepth = await this.calculateDirectoryDepth(parent);
    if (parentDepth + 1 > MAX_KNOWLEDGE_DIRECTORY_DEPTH) {
      throw new BadRequestException(`目录最多支持 ${MAX_KNOWLEDGE_DIRECTORY_DEPTH} 层。`);
    }

    return parent;
  }

  private async calculateDirectoryDepth(directory: KnowledgeDirectory): Promise<number> {
    let depth = 1;
    let parentId = directory.parentId;
    const visited = new Set<string>([directory.id]);

    while (parentId) {
      if (visited.has(parentId)) {
        throw new BadRequestException("目录层级存在循环引用。");
      }
      visited.add(parentId);

      const parent = await this.prisma.knowledgeDirectory.findUnique({
        where: {
          id: parentId
        },
        select: {
          id: true,
          parentId: true
        }
      });
      if (!parent) {
        break;
      }

      depth += 1;
      parentId = parent.parentId;
    }

    return depth;
  }

  private normalizeDirectoryName(value?: string): string {
    const name = trimOptional(value);
    if (!name) {
      throw new BadRequestException("知识库目录名称不能为空。");
    }

    return name;
  }

  private async recordKnowledgeDirectoryOperation(
    action: string,
    directory: KnowledgeDirectory,
    metadata: Record<string, unknown>,
    context?: ResourceAccessContext
  ): Promise<void> {
    await this.operationLogsService?.recordOperation(
      {
        moduleKey: "knowledge-bases",
        action,
        targetType: "knowledge_directory",
        targetId: directory.id,
        targetTitle: directory.name,
        success: true,
        metadata: {
          knowledgeBaseId: directory.knowledgeBaseId,
          directoryId: directory.id,
          parentDirectoryId: directory.parentId,
          titlePreview: directory.name,
          directoryNamePreview: directory.name,
          ...metadata
        }
      },
      context
    );
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
      parentId: directory.parentId ?? undefined,
      name: directory.name,
      status: directory.status,
      isDefault: directory.isDefault,
      sortOrder: directory.sortOrder,
      disabledAt: directory.disabledAt ?? undefined,
      createdAt: directory.createdAt,
      updatedAt: directory.updatedAt
    };
  }
}
