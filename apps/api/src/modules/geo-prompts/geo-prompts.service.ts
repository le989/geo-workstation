import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  GeoPromptType,
  Prisma,
  UserIntent,
  UserRole,
  UserStatus,
  type GeoPrompt
} from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateGeoPromptDto } from "./dto/create-geo-prompt.dto";
import type {
  BulkImportGeoPromptsDto,
  BulkImportGeoPromptRow
} from "./dto/bulk-import-geo-prompts.dto";
import { toOptionalBoolean, toOptionalInt } from "./dto/geo-prompt-dto-transforms";
import type { QueryGeoPromptsDto } from "./dto/query-geo-prompts.dto";
import type { UpdateGeoPromptDto } from "./dto/update-geo-prompt.dto";
import { buildGeoPromptsCsv } from "./utils/csv-export";
import {
  normalizeCreateGeoPrompt,
  normalizeUpdateGeoPrompt,
  trimOptional,
  type NormalizedCreateGeoPrompt
} from "./utils/normalize-geo-prompt";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const SYSTEM_GEO_OPERATOR_EMAIL = "system-geo-operator@geo-workstation.local";

export type GeoPromptResponse = {
  id: string;
  type: GeoPromptType;
  baseWord?: string;
  promptText: string;
  productLine?: string;
  scenario?: string;
  userIntent: UserIntent;
  priority: number;
  targetModels: string[];
  source?: string;
  trackEnabled: boolean;
  latestCoverageStatus?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GeoPromptListResponse = {
  items: GeoPromptResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type DuplicateGeoPromptRow = {
  rowIndex: number;
  promptText: string;
  reason: "duplicate_in_batch" | "duplicate_in_database";
};

export type FailedGeoPromptRow = {
  rowIndex: number;
  row: BulkImportGeoPromptRow;
  errors: string[];
};

export type BulkImportGeoPromptsResponse = {
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  failedCount: number;
  skippedCount: number;
  createdItems: GeoPromptResponse[];
  duplicateRows: DuplicateGeoPromptRow[];
  failedRows: FailedGeoPromptRow[];
};

export type DeleteGeoPromptResponse = {
  id: string;
  deleted: true;
  alreadyDeleted: boolean;
  deletedAt: Date;
};

@Injectable()
export class GeoPromptsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(query: QueryGeoPromptsDto): Promise<GeoPromptListResponse> {
    const page = Math.max(toOptionalInt(query.page) ?? DEFAULT_PAGE, 1);
    const pageSize = Math.min(Math.max(toOptionalInt(query.pageSize) ?? DEFAULT_PAGE_SIZE, 1), 100);
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.geoPrompt.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.geoPrompt.count({
        where
      })
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize
    };
  }

  async create(input: CreateGeoPromptDto): Promise<GeoPromptResponse> {
    const normalized = normalizeCreateGeoPrompt(input);
    await this.assertPromptTextIsUnique(normalized.promptText);
    const createdById = await this.resolveCreatedById(normalized.createdBy);

    const created = await this.prisma.geoPrompt.create({
      data: this.toCreateData(normalized, createdById)
    });

    return this.toResponse(created);
  }

  async update(id: string, input: UpdateGeoPromptDto): Promise<GeoPromptResponse> {
    const existing = await this.prisma.geoPrompt.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new NotFoundException(`GEO prompt not found: ${id}`);
    }

    if (existing.deletedAt) {
      throw new BadRequestException(`Deleted GEO prompt cannot be updated: ${id}`);
    }

    const normalized = normalizeUpdateGeoPrompt(input);

    if (normalized.promptText !== undefined && normalized.promptText !== existing.promptText) {
      await this.assertPromptTextIsUnique(normalized.promptText, id);
    }

    const updateData: Prisma.GeoPromptUpdateInput = {};

    if (normalized.type !== undefined) {
      updateData.type = normalized.type;
    }
    if ("baseWord" in normalized) {
      updateData.baseWord = normalized.baseWord ?? null;
    }
    if (normalized.promptText !== undefined) {
      updateData.promptText = normalized.promptText;
    }
    if ("productLine" in normalized) {
      updateData.productLine = normalized.productLine ?? null;
    }
    if ("scenario" in normalized) {
      updateData.scenario = normalized.scenario ?? null;
    }
    if (normalized.userIntent !== undefined) {
      updateData.userIntent = normalized.userIntent;
    }
    if (normalized.priority !== undefined) {
      updateData.priority = normalized.priority;
    }
    if ("targetModels" in normalized) {
      updateData.targetModels = normalized.targetModels ?? [];
    }
    if ("source" in normalized) {
      updateData.source = normalized.source ?? null;
    }
    if (normalized.trackEnabled !== undefined) {
      updateData.trackEnabled = normalized.trackEnabled;
    }
    if ("latestCoverageStatus" in normalized) {
      updateData.latestCoverageStatus = normalized.latestCoverageStatus ?? null;
    }
    if ("createdBy" in normalized && normalized.createdBy !== undefined) {
      updateData.createdBy = {
        connect: {
          id: await this.resolveCreatedById(normalized.createdBy)
        }
      };
    }

    const updated = await this.prisma.geoPrompt.update({
      where: {
        id
      },
      data: updateData
    });

    return this.toResponse(updated);
  }

  async softDelete(id: string): Promise<DeleteGeoPromptResponse> {
    const existing = await this.prisma.geoPrompt.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new NotFoundException(`GEO prompt not found: ${id}`);
    }

    if (existing.deletedAt) {
      return {
        id,
        deleted: true,
        alreadyDeleted: true,
        deletedAt: existing.deletedAt
      };
    }

    const deleted = await this.prisma.geoPrompt.update({
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

  async bulkImport(input: BulkImportGeoPromptsDto): Promise<BulkImportGeoPromptsResponse> {
    const duplicateRows: DuplicateGeoPromptRow[] = [];
    const failedRows: FailedGeoPromptRow[] = [];
    const candidates: Array<{ rowIndex: number; normalized: NormalizedCreateGeoPrompt }> = [];
    const seenPromptTexts = new Set<string>();

    input.rows.forEach((row, index) => {
      const rowIndex = index + 1;
      const rowValidation = this.validateBulkRow(row, rowIndex);

      if (!rowValidation.normalized) {
        failedRows.push({
          rowIndex,
          row,
          errors: rowValidation.errors
        });
        return;
      }

      const promptText = rowValidation.normalized.promptText;

      if (seenPromptTexts.has(promptText)) {
        duplicateRows.push({
          rowIndex,
          promptText,
          reason: "duplicate_in_batch"
        });
        return;
      }

      seenPromptTexts.add(promptText);
      candidates.push({
        rowIndex,
        normalized: rowValidation.normalized
      });
    });

    const databaseDuplicates = await this.findExistingPromptTexts(
      candidates.map((candidate) => candidate.normalized.promptText)
    );
    const rowsToCreate = candidates.filter((candidate) => {
      if (databaseDuplicates.has(candidate.normalized.promptText)) {
        duplicateRows.push({
          rowIndex: candidate.rowIndex,
          promptText: candidate.normalized.promptText,
          reason: "duplicate_in_database"
        });
        return false;
      }

      return true;
    });

    const createdById = await this.resolveCreatedById(input.createdBy);
    const createdItems: GeoPromptResponse[] = [];

    for (const candidate of rowsToCreate) {
      const created = await this.prisma.geoPrompt.create({
        data: this.toCreateData(candidate.normalized, createdById)
      });
      createdItems.push(this.toResponse(created));
    }

    const duplicateCount = duplicateRows.length;
    const failedCount = failedRows.length;

    return {
      totalRows: input.rows.length,
      successCount: createdItems.length,
      duplicateCount,
      failedCount,
      skippedCount: duplicateCount + failedCount,
      createdItems,
      duplicateRows,
      failedRows
    };
  }

  async exportCsv(query: QueryGeoPromptsDto): Promise<string> {
    const items = await this.prisma.geoPrompt.findMany({
      where: this.buildWhere(query),
      orderBy: {
        createdAt: "desc"
      }
    });

    return buildGeoPromptsCsv(items.map((item) => this.toResponse(item)));
  }

  private buildWhere(query: QueryGeoPromptsDto): Prisma.GeoPromptWhereInput {
    const where: Prisma.GeoPromptWhereInput = {
      deletedAt: null
    };
    const search = trimOptional(query.search);

    if (search) {
      where.OR = [
        {
          promptText: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          baseWord: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          scenario: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          source: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    if (query.type) {
      where.type = query.type;
    }
    if (query.productLine) {
      where.productLine = query.productLine;
    }
    if (query.userIntent) {
      where.userIntent = query.userIntent;
    }
    const priority = toOptionalInt(query.priority);
    const trackEnabled = toOptionalBoolean(query.trackEnabled);

    if (priority !== undefined) {
      where.priority = priority;
    }
    if (trackEnabled !== undefined) {
      where.trackEnabled = trackEnabled;
    }
    if (query.latestCoverageStatus) {
      where.latestCoverageStatus = query.latestCoverageStatus;
    }
    if (query.createdBy) {
      where.createdById = query.createdBy;
    }

    return where;
  }

  private async assertPromptTextIsUnique(promptText: string, excludeId?: string): Promise<void> {
    const duplicate = await this.prisma.geoPrompt.findFirst({
      where: {
        promptText,
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
      throw new BadRequestException(`Active GEO prompt already exists: ${promptText}`);
    }
  }

  private async findExistingPromptTexts(promptTexts: string[]): Promise<Set<string>> {
    if (promptTexts.length === 0) {
      return new Set();
    }

    const existingPrompts = await this.prisma.geoPrompt.findMany({
      where: {
        promptText: {
          in: promptTexts
        },
        deletedAt: null
      },
      select: {
        promptText: true
      }
    });

    return new Set(existingPrompts.map((prompt) => prompt.promptText));
  }

  private validateBulkRow(
    row: BulkImportGeoPromptRow,
    rowIndex: number
  ): { normalized?: NormalizedCreateGeoPrompt; errors: string[] } {
    if (!this.isRecord(row)) {
      return {
        errors: [`row ${rowIndex} must be an object`]
      };
    }

    const dto = plainToInstance(CreateGeoPromptDto, row);
    const validationErrors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: {
        target: false,
        value: false
      }
    });
    const errors = validationErrors.flatMap((error) => Object.values(error.constraints ?? {}));

    if (errors.length > 0) {
      return {
        errors
      };
    }

    return {
      normalized: normalizeCreateGeoPrompt(dto),
      errors: []
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
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

  private toCreateData(
    normalized: NormalizedCreateGeoPrompt,
    createdById: string
  ): Prisma.GeoPromptCreateInput {
    return {
      type: normalized.type,
      baseWord: normalized.baseWord,
      promptText: normalized.promptText,
      productLine: normalized.productLine,
      scenario: normalized.scenario,
      userIntent: normalized.userIntent,
      priority: normalized.priority,
      targetModels: normalized.targetModels,
      source: normalized.source,
      trackEnabled: normalized.trackEnabled,
      latestCoverageStatus: normalized.latestCoverageStatus,
      createdBy: {
        connect: {
          id: createdById
        }
      }
    };
  }

  private toResponse(record: GeoPrompt): GeoPromptResponse {
    return {
      id: record.id,
      type: record.type,
      baseWord: record.baseWord ?? undefined,
      promptText: record.promptText,
      productLine: record.productLine ?? undefined,
      scenario: record.scenario ?? undefined,
      userIntent: record.userIntent,
      priority: record.priority,
      targetModels: Array.isArray(record.targetModels) ? record.targetModels.map(String) : [],
      source: record.source ?? undefined,
      trackEnabled: record.trackEnabled,
      latestCoverageStatus: record.latestCoverageStatus ?? undefined,
      createdBy: record.createdById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}
