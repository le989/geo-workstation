import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ParseStatus,
  Prisma,
  UserRole,
  UserStatus,
  type KnowledgeBase,
  type KnowledgeChunk,
  type KnowledgeFile
} from "@prisma/client";
import type { QueryKnowledgeFilesDto } from "./dto/query-knowledge-files.dto";
import type { ReparseKnowledgeFileDto } from "./dto/reparse-knowledge-file.dto";
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
  type ResourceAccessContext
} from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";
const PUBLIC_FILE_READ_ERROR_MESSAGE = "文件不存在或无法读取，请重新上传资料。";
const PUBLIC_FILE_PARSE_ERROR_MESSAGE = "资料解析失败，请检查文件内容后重试。";

type ParseOptions = {
  materialType?: string;
  tags?: unknown;
};

type KnowledgeFileWithBase = KnowledgeFile & {
  knowledgeBase: KnowledgeBase;
};

export type KnowledgeFileResponse = {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  companyId?: string;
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
    const storagePath = await this.storage.saveKnowledgeFile(knowledgeBaseId, file);

    const knowledgeFile = await this.prisma.knowledgeFile.create({
      data: {
        knowledgeBase: {
          connect: {
            id: knowledgeBase.id
          }
        },
        fileName: file.originalname,
        fileType,
        fileSize: file.size,
        storagePath,
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

    return this.parseAndStoreChunks(knowledgeFile.id, input, context);
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
    const materialType = trimOptional(input.materialType) ?? "file_import";
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
      where.fileName = {
        contains: search,
        mode: "insensitive"
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

    if (!knowledgeFile || (context && !canReadResource(context, knowledgeFile.knowledgeBase))) {
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

    if (!knowledgeFile || (context && !canReadResource(context, knowledgeFile.knowledgeBase))) {
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

    if (!knowledgeFile || (context && !canReadResource(context, knowledgeFile.knowledgeBase))) {
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

  private toFileResponse(file: KnowledgeFile): KnowledgeFileResponse {
    return {
      id: file.id,
      knowledgeBaseId: file.knowledgeBaseId,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize ?? undefined,
      companyId: file.companyId ?? undefined,
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
