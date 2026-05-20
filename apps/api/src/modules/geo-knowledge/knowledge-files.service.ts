import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  DepartmentStatus,
  KnowledgeMaterialType,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  ParseStatus,
  Prisma,
  UserRole,
  UserStatus,
  type KnowledgeBase,
  type KnowledgeChunk,
  type KnowledgeFile
} from "@prisma/client";
import type { ManualKnowledgeMaterialDto } from "./dto/manual-knowledge-material.dto";
import type { QueryKnowledgeFilesDto } from "./dto/query-knowledge-files.dto";
import type { ReparseKnowledgeFileDto } from "./dto/reparse-knowledge-file.dto";
import type { UpdateKnowledgeFileMetadataDto } from "./dto/update-knowledge-file-metadata.dto";
import type { UploadKnowledgeFileDto } from "./dto/upload-knowledge-file.dto";
import { toOptionalInt } from "./dto/knowledge-dto-transforms";
import {
  KNOWLEDGE_FILE_MISSING_ERROR,
  KNOWLEDGE_FILE_READ_ERROR,
  KnowledgeFileParserService
} from "./knowledge-file-parser.service";
import { LocalFileStorageService, type UploadedKnowledgeFile } from "./local-file-storage.service";
import { resolveKnowledgeFileType } from "./utils/file-type.util";
import { trimOptional } from "./utils/normalize-knowledge-base";
import { jsonTagsToArray, normalizeTags } from "./utils/tags.util";
import {
  assertCanDeleteResource,
  assertCanUpdateResource,
  canReadResource,
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const PUBLIC_FILE_READ_ERROR_MESSAGE = "文件不存在或无法读取，请重新上传资料。";
const PUBLIC_FILE_PARSE_ERROR_MESSAGE = "资料解析失败，请检查文件内容后重试。";
const DEFAULT_APPLICABLE_MODULES = ["internal-search"];
const APPLICABLE_MODULE_KEYS = new Set([
  "internal-search",
  "geo-content",
  "aftersales-qa",
  "geo-analysis"
]);

type ParseOptions = {
  materialType?: string;
  tags?: unknown;
};

type KnowledgeFileWithBase = KnowledgeFile & {
  knowledgeBase: KnowledgeBase;
};

type KnowledgeFileMetadataInput = Pick<
  UploadKnowledgeFileDto,
  | "title"
  | "materialType"
  | "applicableModules"
  | "sourceDescription"
  | "trustLevel"
  | "reviewStatus"
  | "allowedDepartmentIds"
>;

type NormalizedKnowledgeFileMetadata = {
  title?: string;
  materialType: KnowledgeMaterialType;
  applicableModules: string[];
  sourceDescription?: string;
  trustLevel: KnowledgeTrustLevel;
  reviewStatus: KnowledgeReviewStatus;
  allowedDepartmentIds: string[];
  chunkMaterialType?: string;
};

export type KnowledgeFileResponse = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  companyId?: string;
  sourceType: string;
  materialType: KnowledgeMaterialType;
  applicableModules: string[];
  sourceDescription?: string;
  trustLevel: KnowledgeTrustLevel;
  reviewStatus: KnowledgeReviewStatus;
  allowedDepartmentIds: string[];
  parseStatus: ParseStatus;
  errorMessage?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type KnowledgeFileChunkResponse = {
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

export type KnowledgeFileParseResponse = {
  knowledgeFile: KnowledgeFileResponse;
  parseStatus: ParseStatus;
  createdChunksCount: number;
  createdChunks: KnowledgeFileChunkResponse[];
  errorMessage?: string;
};

export type KnowledgeFileListResponse = {
  items: KnowledgeFileResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type KnowledgeFileDetailResponse = {
  knowledgeFile: KnowledgeFileResponse;
  chunksCount: number;
  latestChunks: KnowledgeFileChunkResponse[];
};

export type DeleteKnowledgeFileResponse = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: Date;
};

@Injectable()
export class KnowledgeFilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LocalFileStorageService) private readonly storage: LocalFileStorageService,
    @Inject(KnowledgeFileParserService) private readonly parser: KnowledgeFileParserService
  ) {}

  async upload(
    knowledgeBaseId: string,
    file: UploadedKnowledgeFile | undefined,
    input: UploadKnowledgeFileDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileParseResponse> {
    const knowledgeBase = await this.findKnowledgeBaseForFileImport(knowledgeBaseId, context);
    if (context) {
      assertCanUpdateResource(context, knowledgeBase);
    }
    this.assertUploadFile(file);
    const fileType = this.resolveFileType(file.originalname);
    const createdById = context?.user.id ?? (await this.resolveCreatedById(input.createdBy));
    const companyId = context ? getCurrentCompanyId(context) : undefined;
    const metadata = await this.normalizeMetadataInput(input, context);
    const storagePath = await this.storage.saveKnowledgeFile(knowledgeBaseId, file);

    const knowledgeFile = await this.prisma.knowledgeFile.create({
      data: {
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        title: metadata.title ?? file.originalname,
        fileName: file.originalname,
        fileType,
        fileSize: file.size,
        storagePath,
        sourceType: "upload",
        materialType: metadata.materialType,
        applicableModules: metadata.applicableModules,
        sourceDescription: metadata.sourceDescription,
        trustLevel: metadata.trustLevel,
        reviewStatus: metadata.reviewStatus,
        allowedDepartmentIds: metadata.allowedDepartmentIds,
        parseStatus: ParseStatus.pending,
        ...(companyId
          ? {
              company: {
                connect: {
                  id: companyId
                }
              }
            }
          : {}),
        createdBy: {
          connect: {
            id: createdById
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

    return this.parseAndStoreChunks(
      knowledgeFile.id,
      {
        materialType: metadata.chunkMaterialType ?? metadata.materialType,
        tags: input.tags
      },
      context
    );
  }

  async createManualMaterial(
    knowledgeBaseId: string,
    input: ManualKnowledgeMaterialDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileParseResponse> {
    const knowledgeBase = await this.findKnowledgeBaseForFileImport(knowledgeBaseId, context);
    if (context) {
      assertCanUpdateResource(context, knowledgeBase);
    }

    const title = trimOptional(input.title);
    const content = trimOptional(input.content);

    if (!title) {
      throw new BadRequestException("资料标题不能为空。");
    }
    if (!content || content.length < 10) {
      throw new BadRequestException("手动录入资料正文至少需要 10 个字符。");
    }

    const createdById = context?.user.id ?? (await this.resolveCreatedById(input.createdBy));
    const companyId = context ? getCurrentCompanyId(context) : undefined;
    const metadata = await this.normalizeMetadataInput(input, context);
    const fileName = `${title}.manual`;
    const created = await this.prisma.$transaction(async (tx) => {
      const knowledgeFile = await tx.knowledgeFile.create({
        data: {
          knowledgeBase: {
            connect: {
              id: knowledgeBase.id
            }
          },
          title,
          fileName,
          fileType: "manual",
          fileSize: Buffer.byteLength(content, "utf8"),
          storagePath: null,
          sourceType: "manual",
          materialType: metadata.materialType,
          applicableModules: metadata.applicableModules,
          sourceDescription: metadata.sourceDescription,
          trustLevel: metadata.trustLevel,
          reviewStatus: metadata.reviewStatus,
          allowedDepartmentIds: metadata.allowedDepartmentIds,
          parseStatus: ParseStatus.succeeded,
          errorMessage: null,
          ...(companyId
            ? {
                company: {
                  connect: {
                    id: companyId
                  }
                }
              }
            : {}),
          createdBy: {
            connect: {
              id: createdById
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
      const chunk = await tx.knowledgeChunk.create({
        data: {
          knowledgeBase: {
            connect: {
              id: knowledgeBase.id
            }
          },
          file: {
            connect: {
              id: knowledgeFile.id
            }
          },
          title,
          content,
          sourceType: "manual",
          productLine: knowledgeBase.productLine,
          materialType: metadata.chunkMaterialType ?? metadata.materialType,
          tags: normalizeTags(input.tags),
          ...(companyId
            ? {
                company: {
                  connect: {
                    id: companyId
                  }
                }
              }
            : {})
        }
      });

      return {
        knowledgeFile,
        chunk
      };
    });

    return {
      knowledgeFile: this.toFileResponse(created.knowledgeFile),
      parseStatus: ParseStatus.succeeded,
      createdChunksCount: 1,
      createdChunks: [this.toChunkResponse(created.chunk)]
    };
  }

  async updateMetadata(
    id: string,
    input: UpdateKnowledgeFileMetadataDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileResponse> {
    const existing = await this.findActiveKnowledgeFileWithBase(id, context);

    if (context) {
      assertCanUpdateResource(context, existing.knowledgeBase);
    }

    const normalized = await this.normalizeMetadataInput(
      {
        title: input.title ?? existing.title ?? existing.fileName,
        materialType: input.materialType ?? existing.materialType,
        applicableModules:
          input.applicableModules ?? this.jsonStringArrayToArray(existing.applicableModules),
        sourceDescription:
          input.sourceDescription !== undefined
            ? input.sourceDescription
            : (existing.sourceDescription ?? undefined),
        trustLevel: input.trustLevel ?? existing.trustLevel,
        reviewStatus: input.reviewStatus ?? existing.reviewStatus,
        allowedDepartmentIds:
          input.allowedDepartmentIds ?? this.jsonStringArrayToArray(existing.allowedDepartmentIds)
      },
      context
    );

    const updated = await this.prisma.knowledgeFile.update({
      where: {
        id
      },
      data: {
        title: normalized.title,
        materialType: normalized.materialType,
        applicableModules: normalized.applicableModules,
        sourceDescription: normalized.sourceDescription ?? null,
        trustLevel: normalized.trustLevel,
        reviewStatus: normalized.reviewStatus,
        allowedDepartmentIds: normalized.allowedDepartmentIds,
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

    return this.toFileResponse(updated);
  }

  async findMany(
    knowledgeBaseId: string,
    query: QueryKnowledgeFilesDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileListResponse> {
    await this.assertActiveKnowledgeBase(knowledgeBaseId, context);
    const page = Math.max(toOptionalInt(query.page) ?? DEFAULT_PAGE, 1);
    const pageSize = Math.min(Math.max(toOptionalInt(query.pageSize) ?? DEFAULT_PAGE_SIZE, 1), 100);
    const where = this.buildWhere(knowledgeBaseId, query, context);

    const [items, total] = await Promise.all([
      this.prisma.knowledgeFile.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.knowledgeFile.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toFileResponse(item)),
      total,
      page,
      pageSize
    };
  }

  async getDetail(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileDetailResponse> {
    const knowledgeFile = await this.findActiveKnowledgeFile(id, context);
    const [chunksCount, latestChunks] = await Promise.all([
      this.prisma.knowledgeChunk.count({
        where: {
          fileId: id,
          deletedAt: null
        }
      }),
      this.prisma.knowledgeChunk.findMany({
        where: {
          fileId: id,
          deletedAt: null
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 5
      })
    ]);

    return {
      knowledgeFile: this.toFileResponse(knowledgeFile),
      chunksCount,
      latestChunks: latestChunks.map((chunk) => this.toChunkResponse(chunk))
    };
  }

  async reparse(
    id: string,
    input: ReparseKnowledgeFileDto,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileParseResponse> {
    const knowledgeFile = await this.findActiveKnowledgeFileWithBase(id, context);
    if (context) {
      assertCanUpdateResource(context, knowledgeFile.knowledgeBase);
    }
    return this.parseAndStoreChunks(id, input, context);
  }

  async softDelete(
    id: string,
    context?: ResourceAccessContext
  ): Promise<DeleteKnowledgeFileResponse> {
    const existing = await this.findExistingKnowledgeFile(id, context);

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

    const deletedAt = new Date();
    const [deleted] = await this.prisma.$transaction([
      this.prisma.knowledgeFile.update({
        where: {
          id
        },
        data: {
          deletedAt
        }
      }),
      this.prisma.knowledgeChunk.updateMany({
        where: {
          fileId: id,
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

  private async parseAndStoreChunks(
    knowledgeFileId: string,
    input: ParseOptions,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileParseResponse> {
    const knowledgeFile = await this.findActiveKnowledgeFileWithBase(knowledgeFileId, context);
    const materialType = trimOptional(input.materialType) ?? knowledgeFile.materialType;
    const tags = normalizeTags(input.tags);
    const companyId = context
      ? getCurrentCompanyId(context)
      : (knowledgeFile.companyId ?? knowledgeFile.knowledgeBase.companyId ?? undefined);

    await this.prisma.knowledgeFile.update({
      where: {
        id: knowledgeFile.id
      },
      data: {
        parseStatus: ParseStatus.parsing,
        errorMessage: null
      }
    });

    try {
      if (!knowledgeFile.storagePath) {
        throw new Error(KNOWLEDGE_FILE_READ_ERROR);
      }

      const parsedChunks = await this.parser.parse({
        fileName: knowledgeFile.fileName,
        fileType: knowledgeFile.fileType,
        storagePath: knowledgeFile.storagePath
      });
      const deletedAt = new Date();

      await this.prisma.knowledgeChunk.updateMany({
        where: {
          fileId: knowledgeFile.id,
          deletedAt: null
        },
        data: {
          deletedAt
        }
      });

      const createdChunks: KnowledgeChunk[] = [];
      for (const parsedChunk of parsedChunks) {
        const created = await this.prisma.knowledgeChunk.create({
          data: {
            knowledgeBase: {
              connect: {
                id: knowledgeFile.knowledgeBaseId
              }
            },
            file: {
              connect: {
                id: knowledgeFile.id
              }
            },
            title: parsedChunk.title,
            content: parsedChunk.content,
            sourceType: "uploaded_file",
            productLine: knowledgeFile.knowledgeBase.productLine,
            materialType,
            tags,
            ...(companyId
              ? {
                  company: {
                    connect: {
                      id: companyId
                    }
                  }
                }
              : {})
          }
        });
        createdChunks.push(created);
      }

      const updatedFile = await this.prisma.knowledgeFile.update({
        where: {
          id: knowledgeFile.id
        },
        data: {
          parseStatus: ParseStatus.succeeded,
          errorMessage: null
        }
      });

      return {
        knowledgeFile: this.toFileResponse(updatedFile),
        parseStatus: ParseStatus.succeeded,
        createdChunksCount: createdChunks.length,
        createdChunks: createdChunks.map((chunk) => this.toChunkResponse(chunk))
      };
    } catch (error) {
      const errorMessage = this.toPublicParseErrorMessage(error);
      const updatedFile = await this.prisma.knowledgeFile.update({
        where: {
          id: knowledgeFile.id
        },
        data: {
          parseStatus: ParseStatus.failed,
          errorMessage
        }
      });

      return {
        knowledgeFile: this.toFileResponse(updatedFile),
        parseStatus: ParseStatus.failed,
        createdChunksCount: 0,
        createdChunks: [],
        errorMessage
      };
    }
  }

  private buildWhere(
    knowledgeBaseId: string,
    query: QueryKnowledgeFilesDto,
    context?: ResourceAccessContext
  ): Prisma.KnowledgeFileWhereInput {
    const where: Prisma.KnowledgeFileWhereInput = {
      knowledgeBaseId,
      deletedAt: null
    };
    if (context) {
      where.companyId = getCurrentCompanyId(context);
    }
    const search = trimOptional(query.search);

    if (query.parseStatus) {
      where.parseStatus = query.parseStatus;
    }
    if (query.fileType) {
      where.fileType = query.fileType;
    }
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          fileName: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          sourceDescription: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }
    if (this.isKnowledgeMaterialType(query.materialType)) {
      where.materialType = query.materialType;
    }
    if (query.reviewStatus) {
      where.reviewStatus = query.reviewStatus;
    }
    if (query.trustLevel) {
      where.trustLevel = query.trustLevel;
    }
    if (query.applicableModule) {
      where.applicableModules = {
        array_contains: [query.applicableModule]
      };
    }
    const aftersalesWhere = this.buildAfterSalesFileAccessWhere(context);

    if (aftersalesWhere) {
      return {
        AND: [where, aftersalesWhere]
      };
    }

    return where;
  }

  private async findKnowledgeBaseForFileImport(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeBase> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id
      }
    });

    if (!knowledgeBase || (context && !canReadResource(context, knowledgeBase))) {
      throw new NotFoundException(`GEO knowledge base not found: ${id}`);
    }

    if (knowledgeBase.deletedAt) {
      throw new BadRequestException(`Deleted GEO knowledge base cannot accept file upload: ${id}`);
    }

    return knowledgeBase;
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

  private async findExistingKnowledgeFile(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileWithBase> {
    const knowledgeFile = await this.prisma.knowledgeFile.findFirst({
      where: {
        id
      },
      include: {
        knowledgeBase: true
      }
    });

    if (!knowledgeFile || !this.canReadKnowledgeFile(knowledgeFile, context)) {
      throw new NotFoundException(`GEO knowledge file not found: ${id}`);
    }

    return knowledgeFile;
  }

  private async findActiveKnowledgeFile(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileWithBase> {
    const knowledgeFile = await this.prisma.knowledgeFile.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        knowledgeBase: true
      }
    });

    if (!knowledgeFile || !this.canReadKnowledgeFile(knowledgeFile, context)) {
      throw new NotFoundException(`GEO knowledge file not found: ${id}`);
    }

    return knowledgeFile;
  }

  private async findActiveKnowledgeFileWithBase(
    id: string,
    context?: ResourceAccessContext
  ): Promise<KnowledgeFileWithBase> {
    const knowledgeFile = await this.prisma.knowledgeFile.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        knowledgeBase: true
      }
    });

    if (!knowledgeFile || !this.canReadKnowledgeFile(knowledgeFile, context)) {
      throw new NotFoundException(`GEO knowledge file not found: ${id}`);
    }

    if (knowledgeFile.knowledgeBase.deletedAt) {
      throw new BadRequestException(
        `Deleted GEO knowledge base cannot parse files: ${knowledgeFile.knowledgeBaseId}`
      );
    }

    return knowledgeFile;
  }

  private assertUploadFile(
    file: UploadedKnowledgeFile | undefined
  ): asserts file is UploadedKnowledgeFile {
    if (!file) {
      throw new BadRequestException("GEO knowledge file upload requires form field: file.");
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException("Uploaded GEO knowledge file cannot be empty.");
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      throw new BadRequestException("Uploaded GEO knowledge file exceeds 10MB limit.");
    }
  }

  private resolveFileType(fileName: string): string {
    try {
      return resolveKnowledgeFileType(fileName);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Unsupported file type"
      );
    }
  }

  private async normalizeMetadataInput(
    input: KnowledgeFileMetadataInput,
    context?: ResourceAccessContext
  ): Promise<NormalizedKnowledgeFileMetadata> {
    const title = trimOptional(input.title);
    const { materialType, chunkMaterialType } = this.normalizeMaterialType(input.materialType);
    const reviewStatus = this.normalizeReviewStatus(input.reviewStatus, context);
    const allowedDepartmentIds = await this.normalizeAllowedDepartmentIds(
      input.allowedDepartmentIds,
      materialType,
      context
    );

    return {
      title,
      materialType,
      applicableModules: this.normalizeApplicableModules(input.applicableModules),
      sourceDescription: trimOptional(input.sourceDescription),
      trustLevel: input.trustLevel ?? KnowledgeTrustLevel.medium,
      reviewStatus,
      allowedDepartmentIds,
      chunkMaterialType
    };
  }

  private normalizeMaterialType(value?: string | KnowledgeMaterialType): {
    materialType: KnowledgeMaterialType;
    chunkMaterialType?: string;
  } {
    const trimmed = trimOptional(value);

    if (!trimmed) {
      return {
        materialType: KnowledgeMaterialType.content_reference_material
      };
    }

    if (this.isKnowledgeMaterialType(trimmed)) {
      return {
        materialType: trimmed
      };
    }

    return {
      materialType: KnowledgeMaterialType.content_reference_material,
      chunkMaterialType: trimmed
    };
  }

  private normalizeReviewStatus(
    value: KnowledgeReviewStatus | undefined,
    context?: ResourceAccessContext
  ): KnowledgeReviewStatus {
    const reviewStatus = value ?? KnowledgeReviewStatus.pending;

    if (!context || reviewStatus === KnowledgeReviewStatus.pending) {
      return reviewStatus;
    }

    const role = getEffectiveRole(context);
    if (role === "platform_admin" || role === "company_admin") {
      return reviewStatus;
    }

    throw new ForbiddenException("当前角色无权设置资料审核状态");
  }

  private normalizeApplicableModules(value?: string[]): string[] {
    const modules = value && value.length > 0 ? value : DEFAULT_APPLICABLE_MODULES;
    const uniqueModules = Array.from(new Set(modules.map((item) => item.trim()).filter(Boolean)));

    for (const moduleKey of uniqueModules) {
      if (!APPLICABLE_MODULE_KEYS.has(moduleKey)) {
        throw new BadRequestException(`Unsupported applicable module: ${moduleKey}`);
      }
    }

    return uniqueModules;
  }

  private async normalizeAllowedDepartmentIds(
    value: string[] | undefined,
    materialType: KnowledgeMaterialType,
    context?: ResourceAccessContext
  ): Promise<string[]> {
    if (materialType !== KnowledgeMaterialType.aftersales_material) {
      return [];
    }

    const departmentIds = Array.from(
      new Set((value ?? []).map((item) => item.trim()).filter(Boolean))
    );

    if (departmentIds.length === 0) {
      const activeDepartmentId =
        context && !this.isAdminBypass(context) ? this.getActiveDepartmentId(context) : undefined;

      if (activeDepartmentId) {
        return [activeDepartmentId];
      }

      return [];
    }

    if (!context) {
      return departmentIds;
    }

    const companyId = getCurrentCompanyId(context);
    const count = await this.prisma.department.count({
      where: {
        id: {
          in: departmentIds
        },
        companyId
      }
    });

    if (count !== departmentIds.length) {
      throw new BadRequestException("allowedDepartmentIds must belong to current company");
    }

    return departmentIds;
  }

  private buildAfterSalesFileAccessWhere(
    context?: ResourceAccessContext
  ): Prisma.KnowledgeFileWhereInput | undefined {
    if (!context || this.isAdminBypass(context)) {
      return undefined;
    }

    const departmentId = this.getActiveDepartmentId(context);

    return {
      OR: [
        {
          materialType: {
            not: KnowledgeMaterialType.aftersales_material
          }
        },
        ...(departmentId
          ? [
              {
                materialType: KnowledgeMaterialType.aftersales_material,
                allowedDepartmentIds: {
                  array_contains: [departmentId]
                }
              } satisfies Prisma.KnowledgeFileWhereInput
            ]
          : [])
      ]
    };
  }

  private canReadKnowledgeFile(
    knowledgeFile: KnowledgeFileWithBase,
    context?: ResourceAccessContext
  ): boolean {
    if (!context) {
      return true;
    }

    if (!canReadResource(context, knowledgeFile.knowledgeBase)) {
      return false;
    }

    if (knowledgeFile.materialType !== KnowledgeMaterialType.aftersales_material) {
      return true;
    }

    if (this.isAdminBypass(context)) {
      return true;
    }

    const departmentId = this.getActiveDepartmentId(context);

    return Boolean(
      departmentId && this.jsonStringArrayToArray(knowledgeFile.allowedDepartmentIds).includes(departmentId)
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

  private isKnowledgeMaterialType(value?: string): value is KnowledgeMaterialType {
    return Boolean(
      value &&
        Object.values(KnowledgeMaterialType).includes(value as KnowledgeMaterialType)
    );
  }

  private jsonStringArrayToArray(value: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  private toFileResponse(file: KnowledgeFile): KnowledgeFileResponse {
    return {
      id: file.id,
      knowledgeBaseId: file.knowledgeBaseId,
      title: file.title ?? file.fileName,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize ?? undefined,
      companyId: file.companyId ?? undefined,
      sourceType: file.sourceType,
      materialType: file.materialType,
      applicableModules: this.jsonStringArrayToArray(file.applicableModules),
      sourceDescription: file.sourceDescription ?? undefined,
      trustLevel: file.trustLevel,
      reviewStatus: file.reviewStatus,
      allowedDepartmentIds: this.jsonStringArrayToArray(file.allowedDepartmentIds),
      parseStatus: file.parseStatus,
      errorMessage: file.errorMessage ?? undefined,
      createdBy: file.createdById,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    };
  }

  private toChunkResponse(chunk: KnowledgeChunk): KnowledgeFileChunkResponse {
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

  private toPublicParseErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : "";

    if (message === KNOWLEDGE_FILE_MISSING_ERROR || message === KNOWLEDGE_FILE_READ_ERROR) {
      return PUBLIC_FILE_READ_ERROR_MESSAGE;
    }

    return PUBLIC_FILE_PARSE_ERROR_MESSAGE;
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
