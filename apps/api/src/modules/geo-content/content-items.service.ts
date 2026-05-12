import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type ContentItem } from "@prisma/client";
import type { QueryContentItemsDto } from "./dto/query-content-items.dto";
import type { UpdateContentItemDto } from "./dto/update-content-item.dto";
import { buildContentItemMarkdown } from "./utils/markdown-export.util";
import {
  jsonStringArray,
  normalizeQueryContentItems,
  normalizeUpdateContentItem,
  type NormalizedQueryContentItems
} from "./utils/normalize-content-item";
import { PrismaService } from "../../prisma/prisma.service";

export type GeneratedContentItemResponse = {
  id: string;
  taskId: string;
  geoPromptId: string | null;
  title: string;
  body: string;
  geoOptimizationPoints: string[];
  suggestedPublishChannel?: string;
  status: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GeneratedContentItemListResponse = {
  items: GeneratedContentItemResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type DeleteContentItemResponse = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: Date;
};

@Injectable()
export class ContentItemsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(query: QueryContentItemsDto): Promise<GeneratedContentItemListResponse> {
    const normalized = normalizeQueryContentItems(query);
    const where = this.buildWhere(normalized);

    const [items, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: {
          updatedAt: "desc"
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize
      }),
      this.prisma.contentItem.count({
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

  async update(id: string, input: UpdateContentItemDto): Promise<GeneratedContentItemResponse> {
    const existing = await this.findExistingContentItem(id);

    if (existing.deletedAt) {
      throw new BadRequestException(`Deleted GEO content item cannot be updated: ${id}`);
    }

    const normalized = normalizeUpdateContentItem(input);
    const data: Prisma.ContentItemUpdateInput = {};

    if (normalized.title !== undefined) {
      data.title = normalized.title;
    }
    if (normalized.body !== undefined) {
      data.body = normalized.body;
    }
    if (normalized.geoOptimizationPoints !== undefined) {
      data.geoOptimizationPoints = normalized.geoOptimizationPoints as Prisma.InputJsonValue;
    }
    if (normalized.suggestedPublishChannel !== undefined) {
      data.suggestedPublishChannel = normalized.suggestedPublishChannel;
    }
    if (normalized.status !== undefined) {
      data.status = normalized.status;
    }

    const updated = await this.prisma.contentItem.update({
      where: {
        id
      },
      data
    });

    return this.toResponse(updated);
  }

  async softDelete(id: string): Promise<DeleteContentItemResponse> {
    const existing = await this.findExistingContentItem(id);

    if (existing.deletedAt) {
      return {
        id,
        deleted: true,
        alreadyDeleted: true,
        deletedAt: existing.deletedAt
      };
    }

    const deleted = await this.prisma.contentItem.update({
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

  async exportMarkdown(id: string): Promise<string> {
    const item = await this.prisma.contentItem.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        geoPrompt: true
      }
    });

    if (!item) {
      throw new NotFoundException(`GEO content item not found: ${id}`);
    }

    return buildContentItemMarkdown(item);
  }

  private buildWhere(query: NormalizedQueryContentItems): Prisma.ContentItemWhereInput {
    const where: Prisma.ContentItemWhereInput = {
      deletedAt: null
    };

    if (query.search) {
      where.OR = [
        {
          title: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          body: {
            contains: query.search,
            mode: "insensitive"
          }
        },
        {
          suggestedPublishChannel: {
            contains: query.search,
            mode: "insensitive"
          }
        }
      ];
    }

    if (query.taskId) {
      where.taskId = query.taskId;
    }
    if (query.geoPromptId) {
      where.geoPromptId = query.geoPromptId;
    }
    if (query.status) {
      where.status = query.status;
    }

    return where;
  }

  private async findExistingContentItem(id: string): Promise<ContentItem> {
    const item = await this.prisma.contentItem.findUnique({
      where: {
        id
      }
    });

    if (!item) {
      throw new NotFoundException(`GEO content item not found: ${id}`);
    }

    return item;
  }

  private toResponse(item: ContentItem): GeneratedContentItemResponse {
    return {
      id: item.id,
      taskId: item.taskId,
      geoPromptId: item.geoPromptId,
      title: item.title,
      body: item.body,
      geoOptimizationPoints: jsonStringArray(item.geoOptimizationPoints),
      suggestedPublishChannel: item.suggestedPublishChannel ?? undefined,
      status: item.status,
      errorMessage: item.errorMessage ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}
