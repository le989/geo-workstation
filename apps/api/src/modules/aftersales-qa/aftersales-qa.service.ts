import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional
} from "@nestjs/common";
import {
  AftersalesAnswerStatus,
  DepartmentStatus,
  KnowledgeMaterialType,
  KnowledgeReviewStatus,
  Prisma,
  type AftersalesQuestionRecord,
  type KnowledgeBase,
  type KnowledgeChunk,
  type KnowledgeFile
} from "@prisma/client";
import {
  getCurrentCompanyId,
  getEffectiveRole,
  type ResourceAccessContext
} from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";
import { AiUsageService } from "../usage/ai-usage.service";
import { OperationLogsService } from "../usage/operation-logs.service";
import type { AskAftersalesQuestionDto } from "./dto/ask-aftersales-question.dto";
import type { QueryAftersalesRecordsDto } from "./dto/query-aftersales-records.dto";

const AFTERSALES_MODULE_KEY = "aftersales-qa";
const NO_RELIABLE_SOURCE_ANSWER =
  "知识库中未找到可靠依据，建议补充售后资料或转人工确认。\n\n以下仅为一般排查方向，当前知识库未找到直接依据：请先收集产品型号、现场工况、故障现象、已尝试操作和相关照片，再由售后负责人确认处理口径。";
const FAILED_ANSWER = "售后问答生成失败，请稍后重试或转人工确认。";
const MAX_RETRIEVED_CHUNKS = 50;
const MAX_CITED_SOURCES = 5;
const MAX_SNIPPET_LENGTH = 180;
const MAX_QUESTION_PREVIEW_LENGTH = 80;

type CandidateChunk = KnowledgeChunk & {
  file: KnowledgeFile;
  knowledgeBase: KnowledgeBase;
};

export type AftersalesCitedSource = {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  fileId: string;
  fileTitle: string;
  chunkId: string;
  materialType: KnowledgeMaterialType;
  snippet: string;
};

export type AftersalesQuestionRecordResponse = {
  id: string;
  companyId: string;
  userId: string;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  question: string;
  answer: string;
  answerStatus: AftersalesAnswerStatus;
  citedSources: AftersalesCitedSource[];
  usedMaterialTypes: KnowledgeMaterialType[];
  isAnswered: boolean;
  hasReliableSource: boolean;
  isMock: boolean;
  aiUsageRecordId?: string | null;
  feedbackStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AskAftersalesQuestionResponse = {
  recordId: string;
  answer: string;
  answerStatus: AftersalesAnswerStatus;
  isAnswered: boolean;
  hasReliableSource: boolean;
  citedSources: AftersalesCitedSource[];
  usedMaterialTypes: KnowledgeMaterialType[];
  isMock: boolean;
  aiUsage?: {
    provider: string;
    model: string;
    isMock: boolean;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requestCount: number;
  };
};

export type AftersalesQuestionRecordListResponse = {
  items: AftersalesQuestionRecordResponse[];
  total: number;
  page: number;
  pageSize: number;
};

type AnswerDraft = {
  answer: string;
  answerStatus: AftersalesAnswerStatus;
  citedSources: AftersalesCitedSource[];
  usedMaterialTypes: KnowledgeMaterialType[];
  isAnswered: boolean;
  hasReliableSource: boolean;
};

type RankedCandidate = {
  chunk: CandidateChunk;
  score: number;
};

@Injectable()
export class AftersalesQaService {
  private readonly logger = new Logger(AftersalesQaService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(AiUsageService)
    private readonly aiUsageService?: AiUsageService,
    @Optional()
    @Inject(OperationLogsService)
    private readonly operationLogsService?: OperationLogsService
  ) {}

  async ask(
    input: AskAftersalesQuestionDto,
    context: ResourceAccessContext
  ): Promise<AskAftersalesQuestionResponse> {
    this.assertCanUseAftersalesQa(context);
    const question = this.normalizeQuestion(input.question);

    try {
      const draft = await this.composeAnswer(question, context);
      const record = await this.createQuestionRecord(question, draft, context);
      const aiUsageRecord = await this.recordAskUsageAndOperation(record, draft, context, true);

      if (aiUsageRecord?.id) {
        await this.prisma.aftersalesQuestionRecord.update({
          where: {
            id: record.id
          },
          data: {
            aiUsageRecordId: aiUsageRecord.id
          }
        });
      }

      return {
        recordId: record.id,
        answer: record.answer,
        answerStatus: record.answerStatus,
        isAnswered: record.isAnswered,
        hasReliableSource: record.hasReliableSource,
        citedSources: draft.citedSources,
        usedMaterialTypes: draft.usedMaterialTypes,
        isMock: record.isMock,
        aiUsage: {
          provider: "mock",
          model: "internal-rule-based",
          isMock: true,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requestCount: 1
        }
      };
    } catch (error) {
      const draft: AnswerDraft = {
        answer: FAILED_ANSWER,
        answerStatus: AftersalesAnswerStatus.failed,
        citedSources: [],
        usedMaterialTypes: [],
        isAnswered: false,
        hasReliableSource: false
      };
      const record = await this.createQuestionRecord(question, draft, context);
      const aiUsageRecord = await this.recordAskUsageAndOperation(record, draft, context, false, error);

      if (aiUsageRecord?.id) {
        await this.prisma.aftersalesQuestionRecord
          .update({
            where: {
              id: record.id
            },
            data: {
              aiUsageRecordId: aiUsageRecord.id
            }
          })
          .catch((updateError) => {
            this.logger.warn(
              `Failed to attach aftersales QA usage record: ${
                updateError instanceof Error ? updateError.message : String(updateError)
              }`
            );
          });
      }

      return {
        recordId: record.id,
        answer: record.answer,
        answerStatus: record.answerStatus,
        isAnswered: record.isAnswered,
        hasReliableSource: record.hasReliableSource,
        citedSources: [],
        usedMaterialTypes: [],
        isMock: true,
        aiUsage: {
          provider: "mock",
          model: "internal-rule-based",
          isMock: true,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requestCount: 1
        }
      };
    }
  }

  async findRecords(
    query: QueryAftersalesRecordsDto,
    context: ResourceAccessContext
  ): Promise<AftersalesQuestionRecordListResponse> {
    this.assertCanUseAftersalesQa(context);
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const where = this.buildRecordWhere(query, context);
    const [total, records] = await this.prisma.$transaction([
      this.prisma.aftersalesQuestionRecord.count({ where }),
      this.prisma.aftersalesQuestionRecord.findMany({
        where,
        include: {
          user: {
            select: {
              name: true
            }
          },
          department: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: records.map((record) => this.toRecordResponse(record)),
      total,
      page,
      pageSize
    };
  }

  async getRecord(
    id: string,
    context: ResourceAccessContext
  ): Promise<AftersalesQuestionRecordResponse> {
    this.assertCanUseAftersalesQa(context);
    const record = await this.prisma.aftersalesQuestionRecord.findFirst({
      where: this.buildRecordWhere({ id } as QueryAftersalesRecordsDto & { id: string }, context),
      include: {
        user: {
          select: {
            name: true
          }
        },
        department: {
          select: {
            name: true
          }
        }
      }
    });

    if (!record) {
      throw new NotFoundException(`Aftersales question record not found: ${id}`);
    }

    return this.toRecordResponse(record);
  }

  private async composeAnswer(
    question: string,
    context: ResourceAccessContext
  ): Promise<AnswerDraft> {
    const aftersalesChunks = await this.findReliableChunks(
      question,
      KnowledgeMaterialType.aftersales_material,
      context
    );
    const selectedChunks =
      aftersalesChunks.length > 0
        ? aftersalesChunks
        : await this.findReliableChunks(question, KnowledgeMaterialType.product_material, context);

    if (selectedChunks.length === 0) {
      return {
        answer: NO_RELIABLE_SOURCE_ANSWER,
        answerStatus: AftersalesAnswerStatus.no_reliable_source,
        citedSources: [],
        usedMaterialTypes: [],
        isAnswered: false,
        hasReliableSource: false
      };
    }

    const citedSources = selectedChunks.map(({ chunk }) => this.toCitedSource(chunk));
    const usedMaterialTypes = [
      ...new Set(citedSources.map((source) => source.materialType))
    ] as KnowledgeMaterialType[];

    return {
      answer: this.composeRuleBasedAnswer(citedSources),
      answerStatus: AftersalesAnswerStatus.answered,
      citedSources,
      usedMaterialTypes,
      isAnswered: true,
      hasReliableSource: true
    };
  }

  private async findReliableChunks(
    question: string,
    materialType: KnowledgeMaterialType,
    context: ResourceAccessContext
  ): Promise<RankedCandidate[]> {
    const companyId = getCurrentCompanyId(context);
    const candidates = await this.prisma.knowledgeChunk.findMany({
      where: {
        companyId,
        deletedAt: null,
        knowledgeBase: {
          companyId,
          deletedAt: null,
          status: "active"
        },
        file: {
          is: {
            companyId,
            deletedAt: null,
            materialType,
            reviewStatus: KnowledgeReviewStatus.approved
          }
        }
      },
      include: {
        file: true,
        knowledgeBase: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: MAX_RETRIEVED_CHUNKS
    });
    const terms = this.extractSearchTerms(question);

    return candidates
      .filter((chunk): chunk is CandidateChunk => {
        if (!chunk.file || !this.isApplicableToAftersalesQa(chunk.file.applicableModules)) {
          return false;
        }

        if (materialType !== KnowledgeMaterialType.aftersales_material || this.isAdminBypass(context)) {
          return true;
        }

        const departmentId = this.getActiveDepartmentId(context);

        return Boolean(
          departmentId && this.jsonStringArrayToArray(chunk.file.allowedDepartmentIds).includes(departmentId)
        );
      })
      .map((chunk) => ({
        chunk,
        score: this.scoreChunk(chunk, terms)
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_CITED_SOURCES);
  }

  private async createQuestionRecord(
    question: string,
    draft: AnswerDraft,
    context: ResourceAccessContext
  ): Promise<AftersalesQuestionRecord> {
    return this.prisma.aftersalesQuestionRecord.create({
      data: {
        companyId: getCurrentCompanyId(context),
        userId: context.user.id,
        departmentId: this.getContextDepartmentId(context),
        question,
        answer: draft.answer,
        answerStatus: draft.answerStatus,
        citedSources: draft.citedSources as unknown as Prisma.InputJsonValue,
        usedMaterialTypes: draft.usedMaterialTypes,
        isAnswered: draft.isAnswered,
        hasReliableSource: draft.hasReliableSource,
        isMock: true
      }
    });
  }

  private async recordAskUsageAndOperation(
    record: AftersalesQuestionRecord,
    draft: AnswerDraft,
    context: ResourceAccessContext,
    success: boolean,
    error?: unknown
  ) {
    const aiUsageRecord = await this.aiUsageService?.recordUsage(
      {
        companyId: record.companyId,
        userId: record.userId,
        departmentId: record.departmentId,
        moduleKey: AFTERSALES_MODULE_KEY,
        action: "ask",
        provider: "mock",
        model: "internal-rule-based",
        isMock: true,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestCount: 1,
        success,
        errorMessage: error,
        metadata: {
          answerStatus: draft.answerStatus,
          hasReliableSource: draft.hasReliableSource,
          citedSourceCount: draft.citedSources.length,
          usedMaterialTypes: draft.usedMaterialTypes
        }
      },
      context
    );

    await this.operationLogsService?.recordOperation(
      {
        companyId: record.companyId,
        userId: record.userId,
        departmentId: record.departmentId,
        moduleKey: AFTERSALES_MODULE_KEY,
        action: "ai_question",
        targetType: "aftersales_question_record",
        targetId: record.id,
        targetTitle: this.truncate(record.question, MAX_QUESTION_PREVIEW_LENGTH),
        success,
        errorMessage: error,
        metadata: {
          answerStatus: draft.answerStatus,
          hasReliableSource: draft.hasReliableSource,
          questionPreview: this.truncate(record.question, MAX_QUESTION_PREVIEW_LENGTH),
          citedSourceCount: draft.citedSources.length,
          citedChunkIds: draft.citedSources.map((source) => source.chunkId),
          citedFileIds: draft.citedSources.map((source) => source.fileId),
          usedMaterialTypes: draft.usedMaterialTypes,
          provider: "mock",
          model: "internal-rule-based",
          isMock: true
        }
      },
      context
    );

    return aiUsageRecord;
  }

  private buildRecordWhere(
    query: QueryAftersalesRecordsDto & { id?: string },
    context: ResourceAccessContext
  ): Prisma.AftersalesQuestionRecordWhereInput {
    const role = getEffectiveRole(context);
    const where: Prisma.AftersalesQuestionRecordWhereInput = {
      companyId: getCurrentCompanyId(context)
    };

    if (query.id) {
      where.id = query.id;
    }
    if (query.answerStatus) {
      where.answerStatus = query.answerStatus as AftersalesAnswerStatus;
    }
    if (query.hasReliableSource !== undefined) {
      where.hasReliableSource = query.hasReliableSource;
    }
    if (role === "platform_admin" || role === "company_admin") {
      if (query.userId) {
        where.userId = query.userId;
      }
      if (query.departmentId) {
        where.departmentId = query.departmentId;
      }
    } else {
      where.userId = context.user.id;
    }

    const createdAt = this.buildDateRange(query.startDate, query.endDate);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private assertCanUseAftersalesQa(context: ResourceAccessContext): void {
    const role = getEffectiveRole(context);

    if (role === "platform_admin" || role === "company_admin") {
      return;
    }

    if (!context.currentCompany.accessibleModules?.includes(AFTERSALES_MODULE_KEY)) {
      throw new ForbiddenException("当前账号无权使用售后问答");
    }
  }

  private normalizeQuestion(question: string): string {
    const normalized = question.replace(/\s+/g, " ").trim();

    if (normalized.length < 2) {
      throw new BadRequestException("售后问题不能为空");
    }

    return normalized;
  }

  private isApplicableToAftersalesQa(value: Prisma.JsonValue | null | undefined): boolean {
    const modules = this.jsonStringArrayToArray(value);

    return modules.length === 0 || modules.includes(AFTERSALES_MODULE_KEY);
  }

  private scoreChunk(chunk: CandidateChunk, terms: string[]): number {
    const text = [
      chunk.title,
      chunk.content,
      chunk.file.title ?? chunk.file.fileName,
      chunk.knowledgeBase.name
    ]
      .join(" ")
      .toLowerCase();

    return terms.reduce((score, term) => {
      if (!text.includes(term)) {
        return score;
      }

      return score + (term.length >= 3 ? 3 : 1);
    }, 0);
  }

  private extractSearchTerms(question: string): string[] {
    const normalized = question.toLowerCase();
    const terms = new Set<string>();
    const asciiTokens = normalized.match(/[a-z0-9][a-z0-9_-]{1,}/g) ?? [];

    for (const token of asciiTokens) {
      terms.add(token);
    }

    for (const match of normalized.matchAll(/[\u4e00-\u9fff]{2,}/g)) {
      const word = match[0];
      const maxLength = Math.min(word.length, 4);

      for (let length = 2; length <= maxLength; length += 1) {
        for (let index = 0; index + length <= word.length; index += 1) {
          terms.add(word.slice(index, index + length));
        }
      }
    }

    return [...terms].slice(0, 60);
  }

  private composeRuleBasedAnswer(sources: AftersalesCitedSource[]): string {
    const lines = sources.map(
      (source, index) =>
        `${index + 1}. ${source.snippet}（依据：${source.knowledgeBaseName} / ${source.fileTitle}）`
    );

    return [
      "根据已通过的知识库资料，建议按以下口径谨慎处理：",
      ...lines,
      "以上回答仅基于当前引用资料，不建议超出资料范围承诺原因、责任或处理结果。"
    ].join("\n");
  }

  private toCitedSource(chunk: CandidateChunk): AftersalesCitedSource {
    return {
      knowledgeBaseId: chunk.knowledgeBaseId,
      knowledgeBaseName: chunk.knowledgeBase.name,
      fileId: chunk.file.id,
      fileTitle: chunk.file.title ?? chunk.file.fileName,
      chunkId: chunk.id,
      materialType: chunk.file.materialType,
      snippet: this.truncate(chunk.content, MAX_SNIPPET_LENGTH)
    };
  }

  private toRecordResponse(
    record: AftersalesQuestionRecord & {
      user?: { name: string } | null;
      department?: { name: string } | null;
    }
  ): AftersalesQuestionRecordResponse {
    return {
      id: record.id,
      companyId: record.companyId,
      userId: record.userId,
      userName: record.user?.name ?? null,
      departmentId: record.departmentId,
      departmentName: record.department?.name ?? null,
      question: record.question,
      answer: record.answer,
      answerStatus: record.answerStatus,
      citedSources: this.jsonCitedSourcesToArray(record.citedSources),
      usedMaterialTypes: this.jsonMaterialTypesToArray(record.usedMaterialTypes),
      isAnswered: record.isAnswered,
      hasReliableSource: record.hasReliableSource,
      isMock: record.isMock,
      aiUsageRecordId: record.aiUsageRecordId,
      feedbackStatus: record.feedbackStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private getContextDepartmentId(context: ResourceAccessContext): string | null {
    return context.currentMembership?.departmentId ?? context.currentCompany.department?.id ?? null;
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

  private jsonMaterialTypesToArray(value: Prisma.JsonValue): KnowledgeMaterialType[] {
    return this.jsonStringArrayToArray(value).filter((item): item is KnowledgeMaterialType =>
      Object.values(KnowledgeMaterialType).includes(item as KnowledgeMaterialType)
    );
  }

  private jsonCitedSourcesToArray(value: Prisma.JsonValue): AftersalesCitedSource[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return (value as unknown[])
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item) => ({
        knowledgeBaseId: String(item.knowledgeBaseId ?? ""),
        knowledgeBaseName: String(item.knowledgeBaseName ?? ""),
        fileId: String(item.fileId ?? ""),
        fileTitle: String(item.fileTitle ?? ""),
        chunkId: String(item.chunkId ?? ""),
        materialType: this.isKnowledgeMaterialType(item.materialType)
          ? item.materialType
          : KnowledgeMaterialType.product_material,
        snippet: this.truncate(String(item.snippet ?? ""), MAX_SNIPPET_LENGTH)
      }))
      .filter((item) => item.knowledgeBaseId && item.fileId && item.chunkId);
  }

  private isKnowledgeMaterialType(value: unknown): value is KnowledgeMaterialType {
    return (
      typeof value === "string" &&
      Object.values(KnowledgeMaterialType).includes(value as KnowledgeMaterialType)
    );
  }

  private buildDateRange(
    startDate?: string,
    endDate?: string
  ): Prisma.DateTimeFilter | undefined {
    const range: Prisma.DateTimeFilter = {};
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if (start && !Number.isNaN(start.getTime())) {
      range.gte = start;
    }
    if (end && !Number.isNaN(end.getTime())) {
      range.lte = end;
    }

    return Object.keys(range).length ? range : undefined;
  }

  private truncate(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, " ").trim();

    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
  }
}
