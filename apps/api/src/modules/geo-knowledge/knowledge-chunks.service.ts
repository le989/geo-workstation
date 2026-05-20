import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  DepartmentStatus,
  KnowledgeMaterialType,
  Prisma,
  type KnowledgeBase,
  type KnowledgeChunk,
  type KnowledgeFile
} from "@prisma/client";
import type { QueryKnowledgeChunksDto } from "./dto/query-knowledge-chunks.dto";
import type { UpdateKnowledgeChunkDto } from "./dto/update-knowledge-chunk.dto";
import {
  normalizeQueryKnowledgeChunks,
  normalizeUpdateKnowledgeChunk
} from "./utils/normalize-knowledge-chunk";
import { jsonTagsToArray } from "./utils/tags.util";
import {
  assertCanDeleteResource,
  assertCanUpdateResource,
  canReadResource,
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";

const MIN_KNOWLEDGE_CONTENT_LENGTH = 10;

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

export type KnowledgeChunkListResponse = {
  items: KnowledgeChunkResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type DeleteKnowledgeChunkResponse = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: Date;
};

@Injectable()
export class KnowledgeChunksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(
    knowledgeBaseId: string,
    query: QueryKnowledgeChunksDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeChunkListResponse> {
    await this.assertActiveKnowledgeBase(knowledgeBaseId, context);
    const normalized = normalizeQueryKnowledgeChunks(query);
    const where = this.buildWhere(knowledgeBaseId, normalized, context);

    const [items, total] = await Promise.all([
      this.prisma.knowledgeChunk.findMany({
        where,
        orderBy: {
          updatedAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.knowledgeChunk.count({
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

  async update(
    id: string,
    input: UpdateKnowledgeChunkDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeChunkResponse> {
    const existing = await this.findExistingKnowledgeChunk(id, context);

    if (existing.deletedAt) {
      throw new BadRequestException(`Deleted GEO knowledge chunk cannot be updated: ${id}`);
    }
    if (context) {
      assertCanUpdateResource(context, existing.knowledgeBase);
    }

    const normalized = normalizeUpdateKnowledgeChunk(input);

    if (normalized.title !== undefined) {
      this.assertKnowledgeChunkTitle(normalized.title);
    }
    if (normalized.content !== undefined) {
      this.assertKnowledgeChunkContent(normalized.content);
    }

    const updateData: Prisma.KnowledgeChunkUpdateInput = {};

    if (normalized.title !== undefined) {
      updateData.title = normalized.title;
    }
    if (normalized.content !== undefined) {
      updateData.content = normalized.content;
    }
    if ("sourceType" in normalized) {
      updateData.sourceType = normalized.sourceType ?? "pasted_text";
    }
    if ("productLine" in normalized) {
      updateData.productLine = normalized.productLine ?? null;
    }
    if ("materialType" in normalized) {
      updateData.materialType = normalized.materialType ?? null;
    }
    if ("tags" in normalized) {
      updateData.tags = normalized.tags ?? [];
    }

    const updated = await this.prisma.knowledgeChunk.update({
      where: {
        id
      },
      data: updateData
    });

    return this.toResponse(updated);
  }

  async softDelete(
    id: string,
    context?: ResourceAccessContext
  ): Promise<DeleteKnowledgeChunkResponse> {
    const existing = await this.findExistingKnowledgeChunk(id, context);

    if (existing.deletedAt) {
      return {
        id,
        deleted: true,
        alreadyDeleted: true,
        deletedAt: existing.deletedAt
      };
    }
    if (context) {
      assertCanDeleteResource(context, existing.knowledgeBase);
    }

    const deleted = await this.prisma.knowledgeChunk.update({
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
    knowledgeBaseId: string,
    query: ReturnType<typeof normalizeQueryKnowledgeChunks>,
    context?: ResourceAccessContext
  ): Prisma.KnowledgeChunkWhereInput {
    const where: Prisma.KnowledgeChunkWhereInput = {
      knowledgeBaseId,
      deletedAt: null
    };
    if (context) {
      where.companyId = getCurrentCompanyId(context);
    }

    if (query.search) {
      where.OR = [
        {
          title: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          content: {
            contains: query.search,
            mode: "insensitive"
          }
        }
      ];
    }
    if (query.sourceType) {
      where.sourceType = query.sourceType;
    }
    if (query.productLine) {
      where.productLine = query.productLine;
    }
    if (query.materialType) {
      where.materialType = query.materialType;
    }
    if (query.tags.length > 0) {
      where.tags = {
        array_contains: query.tags
      };
    }
    const aftersalesWhere = this.buildAfterSalesChunkAccessWhere(context);

    if (aftersalesWhere) {
      return {
        AND: [where, aftersalesWhere]
      };
    }

    return where;
  }

  private async assertActiveKnowledgeBase(
    knowledgeBaseId: string,
    context?: ResourceAccessContext
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        deletedAt: null
      }
    });

    if (!knowledgeBase || (context && !canReadResource(context, knowledgeBase))) {
      throw new NotFoundException(`GEO knowledge base not found: ${knowledgeBaseId}`);
    }
  }

  private async findExistingKnowledgeChunk(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeChunk & { knowledgeBase: KnowledgeBase; file: KnowledgeFile | null }> {
    const chunk = await this.prisma.knowledgeChunk.findFirst({
      where: {
        id
      },
      include: {
        knowledgeBase: true,
        file: true
      }
    });

    if (!chunk || !this.canReadKnowledgeChunk(chunk, context)) {
      throw new NotFoundException(`GEO knowledge chunk not found: ${id}`);
    }

    return chunk;
  }

  private buildAfterSalesChunkAccessWhere(
    context?: ResourceAccessContext
  ): Prisma.KnowledgeChunkWhereInput | undefined {
    if (!context || this.isAdminBypass(context)) {
      return undefined;
    }

    const departmentId = this.getActiveDepartmentId(context);

    return {
      OR: [
        {
          fileId: null,
          OR: [
            {
              materialType: null
            },
            {
              materialType: {
                not: KnowledgeMaterialType.aftersales_material
              }
            }
          ]
        },
        {
          file: {
            materialType: {
              not: KnowledgeMaterialType.aftersales_material
            }
          }
        },
        ...(departmentId
          ? [
              {
                file: {
                  materialType: KnowledgeMaterialType.aftersales_material,
                  allowedDepartmentIds: {
                    array_contains: [departmentId]
                  }
                }
              } satisfies Prisma.KnowledgeChunkWhereInput
            ]
          : [])
      ]
    };
  }

  private canReadKnowledgeChunk(
    chunk: KnowledgeChunk & { knowledgeBase: KnowledgeBase; file: KnowledgeFile | null },
    context?: ResourceAccessContext
  ): boolean {
    if (!context) {
      return true;
    }

    if (!canReadResource(context, chunk.knowledgeBase)) {
      return false;
    }

    if (!chunk.file) {
      return chunk.materialType !== KnowledgeMaterialType.aftersales_material;
    }

    if (chunk.file.materialType !== KnowledgeMaterialType.aftersales_material) {
      return true;
    }

    if (this.isAdminBypass(context)) {
      return true;
    }

    const departmentId = this.getActiveDepartmentId(context);

    return Boolean(
      departmentId && this.jsonStringArrayToArray(chunk.file.allowedDepartmentIds).includes(departmentId)
    );
  }

  private getActiveDepartmentId(context: ResourceAccessContext): string | undefined {
    const department = context.currentCompany.department;

    if (
      !department ||
      department.status !== DepartmentStatus.active ||
      context.currentMembership?.departmentId !== department.id
    ) {
      return undefined;
    }

    return department.id;
  }

  private isAdminBypass(context: ResourceAccessContext): boolean {
    const role = getEffectiveRole(context);
    return role === "platform_admin" || role === "company_admin";
  }

  private jsonStringArrayToArray(value: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => String(item).trim()).filter(Boolean);
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

  private toResponse(chunk: KnowledgeChunk): KnowledgeChunkResponse {
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
}
