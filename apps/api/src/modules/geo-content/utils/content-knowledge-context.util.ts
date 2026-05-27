import { BadRequestException } from "@nestjs/common";
import {
  ProductLineStatus,
  Prisma,
  type ContentTask,
  type KnowledgeChunk,
  type ProductLine
} from "@prisma/client";
import type { PrismaService } from "../../../prisma/prisma.service";
import {
  getCurrentCompanyId,
  type ResourceAccessContext
} from "../../auth/auth-policy";
import { buildOfficialCitableKnowledgeFileWhere } from "../../geo-knowledge/utils/official-citation.util";

export type ContentKnowledgeScope =
  | {
      type: "all";
    }
  | {
      type: "product_line";
      productLineId: string;
      summary?: string;
    }
  | {
      type: "selected_files";
      selectedKnowledgeFileIds: string[];
      summary?: string;
    };

type ContentKnowledgeTask = Pick<
  ContentTask,
  "companyId" | "knowledgeBaseId" | "knowledgeScope" | "productLine" | "productLineId"
>;

type ContentKnowledgePrisma = Pick<PrismaService, "knowledgeChunk" | "productLine">;

export function normalizeContentKnowledgeScope(
  value: Prisma.JsonValue | null | undefined
): ContentKnowledgeScope {
  if (!isRecord(value)) {
    return {
      type: "all"
    };
  }

  const type = optionalString(value.type);

  if (type === "product_line") {
    const productLineId = optionalString(value.productLineId);

    if (!productLineId) {
      throw new BadRequestException("产品线资料范围缺少产品线 ID。");
    }

    return {
      type,
      productLineId,
      summary: optionalString(value.summary)
    };
  }

  if (type === "selected_files") {
    const selectedKnowledgeFileIds = optionalStringArray(value.selectedKnowledgeFileIds);

    if (selectedKnowledgeFileIds.length === 0) {
      throw new BadRequestException("指定资料范围缺少可引用资料 ID。");
    }

    return {
      type,
      selectedKnowledgeFileIds,
      summary: optionalString(value.summary)
    };
  }

  return {
    type: "all"
  };
}

export async function findScopedContentKnowledgeChunks(input: {
  prisma: ContentKnowledgePrisma;
  task: ContentKnowledgeTask;
  knowledgeBaseId?: string | null;
  context?: ResourceAccessContext;
  take?: number;
}): Promise<KnowledgeChunk[]> {
  const knowledgeBaseId = input.knowledgeBaseId ?? input.task.knowledgeBaseId;

  if (!knowledgeBaseId) {
    return [];
  }

  const knowledgeScope = normalizeContentKnowledgeScope(input.task.knowledgeScope);
  const companyId = input.context ? getCurrentCompanyId(input.context) : input.task.companyId ?? undefined;
  const andWhere: Prisma.KnowledgeChunkWhereInput[] = [
    {
      knowledgeBaseId,
      deletedAt: null,
      file: {
        is: buildOfficialCitableKnowledgeFileWhere({
          ...(companyId
            ? {
                companyId
              }
            : {})
        })
      },
      ...(companyId
        ? {
            companyId
          }
        : {})
    }
  ];

  if (knowledgeScope.type === "selected_files") {
    andWhere.push({
      fileId: {
        in: knowledgeScope.selectedKnowledgeFileIds
      }
    });
  }

  if (knowledgeScope.type === "product_line") {
    const productLine = await findActiveProductLine(
      input.prisma,
      knowledgeScope.productLineId,
      companyId
    );
    const legacyDefaultChunkWhere =
      productLine.code === "default"
        ? [
            {
              productLineId: null,
              productLine: null
            }
          ]
        : [];
    andWhere.push({
      OR: [
        {
          productLineId: productLine.id
        },
        {
          productLine: productLine.name
        },
        {
          productLine: productLine.code
        },
        ...legacyDefaultChunkWhere
      ]
    });
  }

  const chunks = await input.prisma.knowledgeChunk.findMany({
    where: {
      AND: andWhere
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: input.take ?? 5
  });

  if (knowledgeScope.type !== "all" && chunks.length === 0) {
    throw new BadRequestException("当前资料范围内没有可引用资料。");
  }

  return chunks;
}

async function findActiveProductLine(
  prisma: ContentKnowledgePrisma,
  id: string,
  companyId?: string
): Promise<ProductLine> {
  const productLine = await prisma.productLine.findFirst({
    where: {
      id,
      status: ProductLineStatus.active,
      ...(companyId
        ? {
            companyId
          }
        : {})
    }
  });

  if (!productLine) {
    throw new BadRequestException("产品线不存在、未启用或不属于当前公司。");
  }

  return productLine;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(optionalString).filter((item): item is string => Boolean(item)))];
}
