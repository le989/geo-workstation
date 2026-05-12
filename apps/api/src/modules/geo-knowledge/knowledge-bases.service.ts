import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  UserRole,
  UserStatus,
  type KnowledgeBase,
  type KnowledgeChunk
} from "@prisma/client";
import type { CreateKnowledgeBaseDto } from "./dto/create-knowledge-base.dto";
import type { QueryKnowledgeBasesDto } from "./dto/query-knowledge-bases.dto";
import type { TextImportKnowledgeDto } from "./dto/text-import-knowledge.dto";
import type { UpdateKnowledgeBaseDto } from "./dto/update-knowledge-base.dto";
import { toOptionalInt } from "./dto/knowledge-dto-transforms";
import {
  normalizeCreateKnowledgeBase,
  normalizeUpdateKnowledgeBase,
  trimOptional
} from "./utils/normalize-knowledge-base";
import { normalizeTextImportKnowledge } from "./utils/normalize-knowledge-chunk";
import { jsonTagsToArray } from "./utils/tags.util";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MIN_KNOWLEDGE_CONTENT_LENGTH = 10;
const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";

export type KnowledgeBaseResponse = {
  id: string;
  name: string;
  productLine?: string;
  description?: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type KnowledgeChunkResponse = {
  id: string;
  knowledgeBaseId: string;
  fileId: string | null;
  title: string;
  content: string;
  sourceType: string;
  productLine?: string;
  materialType?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type KnowledgeBaseListResponse = {
  items: KnowledgeBaseResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type KnowledgeBaseDetailResponse = {
  knowledgeBase: KnowledgeBaseResponse;
  filesCount: number;
  chunksCount: number;
  latestChunks: KnowledgeChunkResponse[];
};

export type DeleteKnowledgeBaseResponse = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: Date;
};

@Injectable()
export class KnowledgeBasesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(query: QueryKnowledgeBasesDto): Promise<KnowledgeBaseListResponse> {
    const page = Math.max(toOptionalInt(query.page) ?? DEFAULT_PAGE, 1);
    const pageSize = Math.min(Math.max(toOptionalInt(query.pageSize) ?? DEFAULT_PAGE_SIZE, 1), 100);
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.knowledgeBase.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toKnowledgeBaseResponse(item)),
      total,
      page,
      pageSize
    };
  }

  async create(input: CreateKnowledgeBaseDto): Promise<KnowledgeBaseResponse> {
    const normalized = normalizeCreateKnowledgeBase(input);
    this.assertKnowledgeBaseName(normalized.name);
    await this.assertKnowledgeBaseNameIsUnique(normalized.name, normalized.productLine);
    const createdById = await this.resolveCreatedById(normalized.createdBy);

    const created = await this.prisma.knowledgeBase.create({
      data: {
        name: normalized.name,
        productLine: normalized.productLine,
        description: normalized.description,
        status: normalized.status,
        createdBy: {
          connect: {
            id: createdById
          }
        }
      }
    });

    return this.toKnowledgeBaseResponse(created);
  }

  async getDetail(id: string): Promise<KnowledgeBaseDetailResponse> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!knowledgeBase) {
      throw new NotFoundException(`GEO knowledge base not found: ${id}`);
    }

    const [filesCount, chunksCount, latestChunks] = await Promise.all([
      this.prisma.knowledgeFile.count({
        where: {
          knowledgeBaseId: id,
          deletedAt: null
        }
      }),
      this.prisma.knowledgeChunk.count({
        where: {
          knowledgeBaseId: id,
          deletedAt: null
        }
      }),
      this.prisma.knowledgeChunk.findMany({
        where: {
          knowledgeBaseId: id,
          deletedAt: null
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 5
      })
    ]);

    return {
      knowledgeBase: this.toKnowledgeBaseResponse(knowledgeBase),
      filesCount,
      chunksCount,
      latestChunks: latestChunks.map((chunk) => this.toKnowledgeChunkResponse(chunk))
    };
  }

  async update(id: string, input: UpdateKnowledgeBaseDto): Promise<KnowledgeBaseResponse> {
    const existing = await this.findExistingKnowledgeBase(id);

    if (existing.deletedAt) {
      throw new BadRequestException(`Deleted GEO knowledge base cannot be updated: ${id}`);
    }

    const normalized = normalizeUpdateKnowledgeBase(input);
    const nextName = normalized.name ?? existing.name;
    const nextProductLine =
      "productLine" in normalized ? normalized.productLine : (existing.productLine ?? undefined);

    if (normalized.name !== undefined) {
      this.assertKnowledgeBaseName(normalized.name);
    }

    if (normalized.name !== undefined || "productLine" in normalized) {
      await this.assertKnowledgeBaseNameIsUnique(nextName, nextProductLine, id);
    }

    const updateData: Prisma.KnowledgeBaseUpdateInput = {};

    if (normalized.name !== undefined) {
      updateData.name = normalized.name;
    }
    if ("productLine" in normalized) {
      updateData.productLine = normalized.productLine ?? null;
    }
    if ("description" in normalized) {
      updateData.description = normalized.description ?? null;
    }
    if ("status" in normalized) {
      updateData.status = normalized.status ?? "active";
    }

    const updated = await this.prisma.knowledgeBase.update({
      where: {
        id
      },
      data: updateData
    });

    return this.toKnowledgeBaseResponse(updated);
  }

  async softDelete(id: string): Promise<DeleteKnowledgeBaseResponse> {
    const existing = await this.findExistingKnowledgeBase(id);

    if (existing.deletedAt) {
      return {
        id,
        deleted: true,
        alreadyDeleted: true,
        deletedAt: existing.deletedAt
      };
    }

    const deletedAt = new Date();
    const [deleted] = await this.prisma.$transaction([
      this.prisma.knowledgeBase.update({
        where: {
          id
        },
        data: {
          deletedAt
        }
      }),
      this.prisma.knowledgeFile.updateMany({
        where: {
          knowledgeBaseId: id,
          deletedAt: null
        },
        data: {
          deletedAt
        }
      }),
      this.prisma.knowledgeChunk.updateMany({
        where: {
          knowledgeBaseId: id,
          deletedAt: null
        },
        data: {
          deletedAt
        }
      })
    ]);

    return {
      id,
      deleted: true,
      alreadyDeleted: false,
      deletedAt: deleted.deletedAt ?? deletedAt
    };
  }

  async textImport(
    knowledgeBaseId: string,
    input: TextImportKnowledgeDto
  ): Promise<KnowledgeChunkResponse> {
    const knowledgeBase = await this.findExistingKnowledgeBase(knowledgeBaseId);

    if (knowledgeBase.deletedAt) {
      throw new BadRequestException(
        `Deleted GEO knowledge base cannot accept text import: ${knowledgeBaseId}`
      );
    }

    const normalized = normalizeTextImportKnowledge(input);
    this.assertKnowledgeChunkTitle(normalized.title);
    this.assertKnowledgeChunkContent(normalized.content);

    if (normalized.createdBy) {
      await this.resolveCreatedById(normalized.createdBy);
    }

    const created = await this.prisma.knowledgeChunk.create({
      data: {
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        title: normalized.title,
        content: normalized.content,
        sourceType: normalized.sourceType,
        productLine: normalized.productLine ?? knowledgeBase.productLine,
        materialType: normalized.materialType,
        tags: normalized.tags
      }
    });

    return this.toKnowledgeChunkResponse(created);
  }

  private buildWhere(query: QueryKnowledgeBasesDto): Prisma.KnowledgeBaseWhereInput {
    const where: Prisma.KnowledgeBaseWhereInput = {
      deletedAt: null
    };
    const search = trimOptional(query.search);

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          productLine: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          description: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    if (query.productLine) {
      where.productLine = query.productLine;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.createdBy) {
      where.createdById = query.createdBy;
    }

    return where;
  }

  private async findExistingKnowledgeBase(id: string): Promise<KnowledgeBase> {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id
      }
    });

    if (!knowledgeBase) {
      throw new NotFoundException(`GEO knowledge base not found: ${id}`);
    }

    return knowledgeBase;
  }

  private async assertKnowledgeBaseNameIsUnique(
    name: string,
    productLine?: string,
    excludeId?: string
  ): Promise<void> {
    const duplicate = await this.prisma.knowledgeBase.findFirst({
      where: {
        name,
        productLine: productLine ?? null,
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

    if (duplicate) {
      throw new BadRequestException(`Active GEO knowledge base already exists: ${name}`);
    }
  }

  private assertKnowledgeBaseName(name: string): void {
    if (name.trim().length === 0) {
      throw new BadRequestException("GEO knowledge base name is required.");
    }
  }

  private assertKnowledgeChunkTitle(title: string): void {
    if (title.trim().length === 0) {
      throw new BadRequestException("GEO knowledge chunk title is required.");
    }
  }

  private assertKnowledgeChunkContent(content: string): void {
    if (content.trim().length < MIN_KNOWLEDGE_CONTENT_LENGTH) {
      throw new BadRequestException(
        `GEO knowledge chunk content must be at least ${MIN_KNOWLEDGE_CONTENT_LENGTH} characters.`
      );
    }
  }

  private toKnowledgeBaseResponse(knowledgeBase: KnowledgeBase): KnowledgeBaseResponse {
    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      productLine: knowledgeBase.productLine ?? undefined,
      description: knowledgeBase.description ?? undefined,
      status: knowledgeBase.status,
      createdBy: knowledgeBase.createdById,
      createdAt: knowledgeBase.createdAt,
      updatedAt: knowledgeBase.updatedAt
    };
  }

  private toKnowledgeChunkResponse(chunk: KnowledgeChunk): KnowledgeChunkResponse {
    return {
      id: chunk.id,
      knowledgeBaseId: chunk.knowledgeBaseId,
      fileId: chunk.fileId,
      title: chunk.title,
      content: chunk.content,
      sourceType: chunk.sourceType,
      productLine: chunk.productLine ?? undefined,
      materialType: chunk.materialType ?? undefined,
      tags: jsonTagsToArray(chunk.tags),
      createdAt: chunk.createdAt,
      updatedAt: chunk.updatedAt
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
