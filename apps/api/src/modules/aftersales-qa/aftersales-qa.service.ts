import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional
} from "@nestjs/common";
import {
  AftersalesAnswerStatus,
  AftersalesConversationStatus,
  AftersalesFeedbackErrorType,
  AftersalesFeedbackStatus,
  DepartmentStatus,
  KnowledgeMaterialType,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  Prisma,
  type AftersalesAnswerFeedback,
  type AftersalesConversation,
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
import { buildOfficialCitableKnowledgeFileWhere } from "../geo-knowledge/utils/official-citation.util";
import { KnowledgeFilesService, type KnowledgeFileResponse } from "../geo-knowledge/knowledge-files.service";
import { OperationLogsService } from "../usage/operation-logs.service";
import type { AskAftersalesQuestionDto } from "./dto/ask-aftersales-question.dto";
import type { ConvertFeedbackKnowledgeDraftDto } from "./dto/convert-feedback-knowledge-draft.dto";
import type { CreateAftersalesConversationDto } from "./dto/create-aftersales-conversation.dto";
import type { QueryAftersalesConversationsDto } from "./dto/query-aftersales-conversations.dto";
import type { QueryAftersalesFeedbacksDto } from "./dto/query-aftersales-feedbacks.dto";
import type { QueryAftersalesRecordsDto } from "./dto/query-aftersales-records.dto";
import type { SubmitAftersalesFeedbackDto } from "./dto/submit-aftersales-feedback.dto";
import type { UpdateAftersalesConversationDto } from "./dto/update-aftersales-conversation.dto";
import type { UpdateAftersalesConversationStatusDto } from "./dto/update-aftersales-conversation-status.dto";
import type { UpdateAftersalesFeedbackStatusDto } from "./dto/update-aftersales-feedback-status.dto";

const AFTERSALES_MODULE_KEY = "aftersales-qa";
const DEFAULT_CONVERSATION_TITLE = "新售后会话";
const NO_RELIABLE_SOURCE_ANSWER =
  "未找到可引用资料，建议补充资料或转人工确认。";
const CLARIFICATION_ANSWER = [
  "需要补充信息后才能继续排查：",
  "",
  "请补充以下任意信息：",
  "1. 产品型号",
  "2. 输出方式，例如 NPN / PNP / 4-20mA / RS485",
  "3. 现场现象，例如不亮、无输出、误触发",
  "4. 接线情况或供电电压"
].join("\n");
const FAILED_ANSWER = "售后问答生成失败，请稍后重试或转人工确认。";
const MAX_RETRIEVED_CHUNKS = 50;
const MAX_CITED_SOURCES = 3;
const MAX_SNIPPET_LENGTH = 180;
const MAX_QUESTION_PREVIEW_LENGTH = 80;
const MAX_ANSWER_PREVIEW_LENGTH = 120;
const MAX_FEEDBACK_PREVIEW_LENGTH = 120;
const MAX_GENERATED_TITLE_LENGTH = 18;

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
  conversationId?: string | null;
  sequence?: number | null;
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

export type AftersalesConversationResponse = {
  id: string;
  companyId: string;
  userId: string;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  title: string;
  status: AftersalesConversationStatus;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
};

export type AftersalesConversationListResponse = {
  items: AftersalesConversationResponse[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type AftersalesConversationDetailResponse = {
  conversation: AftersalesConversationResponse;
  records: AftersalesQuestionRecordResponse[];
};

export type AskAftersalesConversationResponse = AskAftersalesQuestionResponse & {
  conversationId: string;
  question: string;
  createdAt: Date;
  sequence?: number | null;
};

export type AftersalesQuestionRecordListResponse = {
  items: AftersalesQuestionRecordResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type AftersalesFeedbackListItemResponse = {
  feedbackId: string;
  status: AftersalesFeedbackStatus;
  errorType: AftersalesFeedbackErrorType;
  correctionTextPreview: string;
  descriptionPreview?: string | null;
  questionPreview: string;
  answerPreview: string;
  conversationId?: string | null;
  conversationTitle?: string | null;
  questionRecordId: string;
  userId: string;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  handledAt?: Date | null;
  citedSourcesSummary?: {
    count: number;
    chunkIds: string[];
    fileIds: string[];
  };
  createdAt: Date;
  updatedAt: Date;
};

export type AftersalesFeedbackListResponse = {
  items: AftersalesFeedbackListItemResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type ConvertedKnowledgeDraftSummary = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  materialType: KnowledgeMaterialType;
  materialTopic?: string;
  sourceDescription?: string;
  trustLevel: KnowledgeTrustLevel;
  reviewStatus: KnowledgeReviewStatus;
  createdAt: Date;
};

export type AftersalesFeedbackDetailResponse = AftersalesFeedbackListItemResponse & {
  correctionText: string;
  description?: string | null;
  question: string;
  answer: string;
  citedSources: AftersalesCitedSource[];
  handleNote?: string | null;
  handledById?: string | null;
  handledByName?: string | null;
  convertedKnowledgeDraft?: ConvertedKnowledgeDraftSummary | null;
};

export type SubmitAftersalesFeedbackResponse = {
  feedbackId: string;
  status: AftersalesFeedbackStatus;
  recordId: string;
  feedbackStatus: AftersalesFeedbackStatus;
};

export type UpdateAftersalesFeedbackStatusResponse = SubmitAftersalesFeedbackResponse;

export type ConvertFeedbackKnowledgeDraftResponse = {
  feedbackId: string;
  knowledgeFile: KnowledgeFileResponse;
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

type FeedbackWithRelations = AftersalesAnswerFeedback & {
  questionRecord: AftersalesQuestionRecord;
  conversation?: { title: string } | null;
  user?: { name: string } | null;
  department?: { name: string } | null;
  handledBy?: { name: string } | null;
  convertedKnowledgeFile?: Pick<
    KnowledgeFile,
    | "id"
    | "knowledgeBaseId"
    | "title"
    | "fileName"
    | "materialType"
    | "materialTopic"
    | "sourceDescription"
    | "trustLevel"
    | "reviewStatus"
    | "createdAt"
  > | null;
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
    private readonly operationLogsService?: OperationLogsService,
    @Optional()
    @Inject(KnowledgeFilesService)
    private readonly knowledgeFilesService?: KnowledgeFilesService
  ) {}

  async createConversation(
    input: CreateAftersalesConversationDto,
    context: ResourceAccessContext
  ): Promise<AftersalesConversationResponse> {
    this.assertCanUseAftersalesQa(context);

    const conversation = await this.prisma.aftersalesConversation.create({
      data: {
        companyId: getCurrentCompanyId(context),
        userId: context.user.id,
        departmentId: this.getContextDepartmentId(context),
        title: input.title ?? DEFAULT_CONVERSATION_TITLE,
        status: AftersalesConversationStatus.active
      },
      include: this.conversationInclude()
    });

    return this.toConversationResponse(conversation);
  }

  async findConversations(
    query: QueryAftersalesConversationsDto,
    context: ResourceAccessContext
  ): Promise<AftersalesConversationListResponse> {
    this.assertCanUseAftersalesQa(context);
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
    const where = this.buildConversationWhere(query, context);
    const [total, conversations] = await this.prisma.$transaction([
      this.prisma.aftersalesConversation.count({ where }),
      this.prisma.aftersalesConversation.findMany({
        where,
        include: this.conversationInclude(),
        orderBy: [
          {
            lastMessageAt: "desc"
          },
          {
            updatedAt: "desc"
          }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: conversations.map((conversation) => this.toConversationResponse(conversation)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    };
  }

  async getConversation(
    id: string,
    context: ResourceAccessContext
  ): Promise<AftersalesConversationDetailResponse> {
    this.assertCanUseAftersalesQa(context);
    const conversation = await this.findConversationForAccess(id, context);
    const records = await this.prisma.aftersalesQuestionRecord.findMany({
      where: {
        companyId: getCurrentCompanyId(context),
        conversationId: conversation.id
      },
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
      orderBy: [
        {
          sequence: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return {
      conversation: this.toConversationResponse(conversation),
      records: records.map((record) => this.toRecordResponse(record))
    };
  }

  async updateConversation(
    id: string,
    input: UpdateAftersalesConversationDto,
    context: ResourceAccessContext
  ): Promise<AftersalesConversationResponse> {
    this.assertCanUseAftersalesQa(context);
    await this.findConversationForAccess(id, context);
    const conversation = await this.prisma.aftersalesConversation.update({
      where: {
        id
      },
      data: {
        title: input.title
      },
      include: this.conversationInclude()
    });

    return this.toConversationResponse(conversation);
  }

  async updateConversationStatus(
    id: string,
    input: UpdateAftersalesConversationStatusDto,
    context: ResourceAccessContext
  ): Promise<AftersalesConversationResponse> {
    this.assertCanUseAftersalesQa(context);
    const current = await this.findConversationForAccess(id, context);
    const nextStatus =
      input.status === "archived"
        ? AftersalesConversationStatus.archived
        : AftersalesConversationStatus.active;
    const conversation = await this.prisma.aftersalesConversation.update({
      where: {
        id
      },
      data: {
        status: nextStatus
      },
      include: this.conversationInclude()
    });

    await this.recordConversationStatusOperation(current, nextStatus, context);

    return this.toConversationResponse(conversation);
  }

  async askInConversation(
    id: string,
    input: AskAftersalesQuestionDto,
    context: ResourceAccessContext
  ): Promise<AskAftersalesConversationResponse> {
    this.assertCanUseAftersalesQa(context);
    const conversation = await this.findConversationForAccess(id, context);

    if (conversation.status !== AftersalesConversationStatus.active) {
      throw new ForbiddenException("该会话已归档，恢复后可继续提问");
    }

    const question = this.normalizeQuestion(input.question);
    const previousRecord = await this.prisma.aftersalesQuestionRecord.findFirst({
      where: {
        companyId: getCurrentCompanyId(context),
        conversationId: conversation.id
      },
      orderBy: [
        {
          sequence: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });
    const previousQuestion = previousRecord?.question;
    const latestRecord = await this.prisma.aftersalesQuestionRecord.findFirst({
      where: {
        companyId: getCurrentCompanyId(context),
        conversationId: conversation.id
      },
      orderBy: {
        sequence: "desc"
      },
      select: {
        sequence: true
      }
    });
    const sequence = (latestRecord?.sequence ?? 0) + 1;

    try {
      const retrievalQuestion = previousQuestion ? `${previousQuestion} ${question}` : question;
      const draft =
        this.createSystemGuideDraft(question) ??
        (this.shouldAskForClarification(question, previousQuestion)
          ? this.createClarificationDraft()
          : await this.composeAnswer(retrievalQuestion, context));
      const record = await this.createQuestionRecord(question, draft, context, {
        conversationId: conversation.id,
        sequence
      });
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

      await this.refreshConversationAfterAsk(conversation, question);

      return {
        conversationId: conversation.id,
        recordId: record.id,
        question: record.question,
        answer: record.answer,
        answerStatus: record.answerStatus,
        isAnswered: record.isAnswered,
        hasReliableSource: record.hasReliableSource,
        citedSources: draft.citedSources,
        usedMaterialTypes: draft.usedMaterialTypes,
        isMock: record.isMock,
        createdAt: record.createdAt,
        sequence: record.sequence,
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
      const record = await this.createQuestionRecord(question, draft, context, {
        conversationId: conversation.id,
        sequence
      });
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

      await this.refreshConversationAfterAsk(conversation, question);

      return {
        conversationId: conversation.id,
        recordId: record.id,
        question: record.question,
        answer: record.answer,
        answerStatus: record.answerStatus,
        isAnswered: record.isAnswered,
        hasReliableSource: record.hasReliableSource,
        citedSources: [],
        usedMaterialTypes: [],
        isMock: true,
        createdAt: record.createdAt,
        sequence: record.sequence,
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

  async ask(
    input: AskAftersalesQuestionDto,
    context: ResourceAccessContext
  ): Promise<AskAftersalesQuestionResponse> {
    this.assertCanUseAftersalesQa(context);
    const question = this.normalizeQuestion(input.question);

    try {
      const draft = this.createSystemGuideDraft(question) ?? (await this.composeAnswer(question, context));
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

  async submitFeedback(
    recordId: string,
    input: SubmitAftersalesFeedbackDto,
    context: ResourceAccessContext
  ): Promise<SubmitAftersalesFeedbackResponse> {
    this.assertCanUseAftersalesQa(context);
    const record = await this.findRecordForFeedback(recordId, context);
    const departmentId = this.getContextDepartmentId(context);
    const feedback = await this.prisma.aftersalesAnswerFeedback.upsert({
      where: {
        questionRecordId_userId: {
          questionRecordId: record.id,
          userId: context.user.id
        }
      },
      create: {
        companyId: record.companyId,
        conversationId: record.conversationId,
        questionRecordId: record.id,
        userId: context.user.id,
        departmentId,
        errorType: input.errorType,
        correctionText: input.correctionText,
        description: input.description ?? null,
        status: AftersalesFeedbackStatus.pending
      },
      update: {
        errorType: input.errorType,
        correctionText: input.correctionText,
        description: input.description ?? null,
        status: AftersalesFeedbackStatus.pending,
        handledById: null,
        handledAt: null,
        handleNote: null
      },
      include: this.feedbackInclude()
    });

    await this.prisma.aftersalesQuestionRecord.update({
      where: {
        id: record.id
      },
      data: {
        feedbackStatus: AftersalesFeedbackStatus.pending
      }
    });
    await this.recordFeedbackSubmitOperation(feedback, context);

    return {
      feedbackId: feedback.id,
      status: feedback.status,
      recordId: record.id,
      feedbackStatus: AftersalesFeedbackStatus.pending
    };
  }

  async findFeedbacks(
    query: QueryAftersalesFeedbacksDto,
    context: ResourceAccessContext
  ): Promise<AftersalesFeedbackListResponse> {
    this.assertCanUseAftersalesQa(context);
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const where = this.buildFeedbackWhere(query, context);
    const [total, feedbacks] = await this.prisma.$transaction([
      this.prisma.aftersalesAnswerFeedback.count({ where }),
      this.prisma.aftersalesAnswerFeedback.findMany({
        where,
        include: this.feedbackInclude(),
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: feedbacks.map((feedback) => this.toFeedbackListItem(feedback)),
      total,
      page,
      pageSize
    };
  }

  async getFeedback(
    id: string,
    context: ResourceAccessContext
  ): Promise<AftersalesFeedbackDetailResponse> {
    this.assertCanUseAftersalesQa(context);
    const feedback = await this.findFeedbackForAccess(id, context);

    return this.toFeedbackDetail(feedback);
  }

  async convertFeedbackToKnowledgeDraft(
    id: string,
    input: ConvertFeedbackKnowledgeDraftDto,
    context: ResourceAccessContext
  ): Promise<ConvertFeedbackKnowledgeDraftResponse> {
    this.assertCanUseAftersalesQa(context);
    this.assertCanHandleFeedback(context);
    const feedback = await this.findFeedbackForAccess(id, context);

    if (feedback.convertedKnowledgeFileId) {
      throw new ConflictException("该反馈已转为知识库草稿，不能重复转换。");
    }
    if (!this.knowledgeFilesService) {
      throw new BadRequestException("知识库资料服务不可用，无法转为草稿。");
    }

    const content = input.content.trim();
    if (content === feedback.questionRecord.answer.trim()) {
      throw new BadRequestException("请先整理为标准知识正文，不能直接把原 AI 回答作为知识草稿。");
    }

    const sourceDescription = this.buildConvertedDraftSourceDescription(
      feedback,
      input.sourceDescription
    );
    const knowledgeFileResult = await this.knowledgeFilesService.createManualMaterial(
      input.knowledgeBaseId,
      {
        title: input.title,
        content,
        directoryId: input.directoryId,
        materialType: input.materialType ?? KnowledgeMaterialType.aftersales_material,
        materialTopic: input.materialTopic,
        applicableModules:
          input.applicableModules && input.applicableModules.length > 0
            ? input.applicableModules
            : ["aftersales-qa", "internal-search"],
        sourceDescription,
        trustLevel: KnowledgeTrustLevel.medium,
        reviewStatus: KnowledgeReviewStatus.pending,
        allowedDepartmentIds:
          input.allowedDepartmentIds && input.allowedDepartmentIds.length > 0
            ? input.allowedDepartmentIds
            : feedback.departmentId
              ? [feedback.departmentId]
              : []
      },
      context
    );

    const updateResult = await this.prisma.aftersalesAnswerFeedback.updateMany({
      where: {
        id: feedback.id,
        convertedKnowledgeFileId: null
      },
      data: {
        convertedKnowledgeFileId: knowledgeFileResult.knowledgeFile.id,
        convertedAt: new Date(),
        convertedByUserId: context.user.id
      }
    });

    if (updateResult.count !== 1) {
      await this.prisma.knowledgeFile.update({
        where: {
          id: knowledgeFileResult.knowledgeFile.id
        },
        data: {
          deletedAt: new Date(),
          updatedById: context.user.id
        }
      });
      throw new ConflictException("该反馈已转为知识库草稿，不能重复转换。");
    }

    await this.operationLogsService?.recordOperation(
      {
        moduleKey: AFTERSALES_MODULE_KEY,
        action: "feedback_convert_to_knowledge_draft",
        targetType: "aftersales_answer_feedback",
        targetId: feedback.id,
        targetTitle: "售后反馈记录",
        success: true,
        metadata: {
          questionRecordId: feedback.questionRecordId,
          conversationId: feedback.conversationId,
          knowledgeFileId: knowledgeFileResult.knowledgeFile.id,
          knowledgeBaseId: knowledgeFileResult.knowledgeFile.knowledgeBaseId,
          reviewStatus: knowledgeFileResult.knowledgeFile.reviewStatus,
          trustLevel: knowledgeFileResult.knowledgeFile.trustLevel
        }
      },
      context
    );

    return {
      feedbackId: feedback.id,
      knowledgeFile: knowledgeFileResult.knowledgeFile
    };
  }

  async updateFeedbackStatus(
    id: string,
    input: UpdateAftersalesFeedbackStatusDto,
    context: ResourceAccessContext
  ): Promise<UpdateAftersalesFeedbackStatusResponse> {
    this.assertCanUseAftersalesQa(context);
    this.assertCanHandleFeedback(context);
    const current = await this.findFeedbackForAccess(id, context);
    const nextStatus = input.status as AftersalesFeedbackStatus;
    const feedback = await this.prisma.aftersalesAnswerFeedback.update({
      where: {
        id
      },
      data: {
        status: nextStatus,
        handledById:
          nextStatus === AftersalesFeedbackStatus.pending ? null : context.user.id,
        handledAt:
          nextStatus === AftersalesFeedbackStatus.pending ? null : new Date(),
        handleNote:
          nextStatus === AftersalesFeedbackStatus.pending ? null : input.handleNote ?? null
      },
      include: this.feedbackInclude()
    });

    await this.prisma.aftersalesQuestionRecord.update({
      where: {
        id: feedback.questionRecordId
      },
      data: {
        feedbackStatus: nextStatus
      }
    });
    await this.recordFeedbackStatusOperation(current, feedback, context);

    return {
      feedbackId: feedback.id,
      status: feedback.status,
      recordId: feedback.questionRecordId,
      feedbackStatus: nextStatus
    };
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
          is: buildOfficialCitableKnowledgeFileWhere({
            companyId,
            materialType
          })
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
    context: ResourceAccessContext,
    conversationMeta: {
      conversationId?: string | null;
      sequence?: number | null;
    } = {}
  ): Promise<AftersalesQuestionRecord> {
    return this.prisma.aftersalesQuestionRecord.create({
      data: {
        companyId: getCurrentCompanyId(context),
        userId: context.user.id,
        departmentId: this.getContextDepartmentId(context),
        conversationId: conversationMeta.conversationId ?? null,
        sequence: conversationMeta.sequence ?? null,
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
          conversationId: record.conversationId,
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
        targetTitle: "售后问题记录",
        success,
        errorMessage: error,
        metadata: {
          questionRecordId: record.id,
          conversationId: record.conversationId,
          answerStatus: draft.answerStatus,
          hasReliableSource: draft.hasReliableSource,
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

  private async recordConversationStatusOperation(
    conversation: AftersalesConversation,
    nextStatus: AftersalesConversationStatus,
    context: ResourceAccessContext
  ): Promise<void> {
    const action =
      nextStatus === AftersalesConversationStatus.archived
        ? "archive_conversation"
        : "restore_conversation";

    await this.operationLogsService?.recordOperation(
      {
        companyId: conversation.companyId,
        userId: context.user.id,
        departmentId: this.getContextDepartmentId(context),
        moduleKey: AFTERSALES_MODULE_KEY,
        action,
        targetType: "aftersales_conversation",
        targetId: conversation.id,
        targetTitle: "售后会话记录",
        success: true,
        metadata: {
          conversationId: conversation.id,
          fromStatus: conversation.status,
          toStatus: nextStatus
        }
      },
      context
    );
  }

  private async recordFeedbackSubmitOperation(
    feedback: FeedbackWithRelations,
    context: ResourceAccessContext
  ): Promise<void> {
    await this.operationLogsService?.recordOperation(
      {
        companyId: feedback.companyId,
        userId: context.user.id,
        departmentId: this.getContextDepartmentId(context),
        moduleKey: AFTERSALES_MODULE_KEY,
        action: "feedback_submit",
        targetType: "aftersales_answer_feedback",
        targetId: feedback.id,
        targetTitle: "售后反馈记录",
        success: true,
        metadata: {
          questionRecordId: feedback.questionRecordId,
          conversationId: feedback.conversationId,
          errorType: feedback.errorType,
          status: feedback.status
        }
      },
      context
    );
  }

  private async recordFeedbackStatusOperation(
    previous: FeedbackWithRelations,
    next: FeedbackWithRelations,
    context: ResourceAccessContext
  ): Promise<void> {
    await this.operationLogsService?.recordOperation(
      {
        companyId: next.companyId,
        userId: context.user.id,
        departmentId: this.getContextDepartmentId(context),
        moduleKey: AFTERSALES_MODULE_KEY,
        action: "feedback_update_status",
        targetType: "aftersales_answer_feedback",
        targetId: next.id,
        targetTitle: "售后反馈记录",
        success: true,
        metadata: {
          questionRecordId: next.questionRecordId,
          conversationId: next.conversationId,
          previousStatus: previous.status,
          nextStatus: next.status,
          errorType: next.errorType
        }
      },
      context
    );
  }

  private buildConversationWhere(
    query: QueryAftersalesConversationsDto,
    context: ResourceAccessContext
  ): Prisma.AftersalesConversationWhereInput {
    const role = getEffectiveRole(context);
    const where: Prisma.AftersalesConversationWhereInput = {
      companyId: getCurrentCompanyId(context)
    };

    if (!query.status || query.status === "active") {
      where.status = AftersalesConversationStatus.active;
    } else if (query.status === "archived") {
      where.status = AftersalesConversationStatus.archived;
    }

    if (query.keyword) {
      where.title = {
        contains: query.keyword,
        mode: "insensitive"
      };
    }

    if (role === "platform_admin" || role === "company_admin") {
      if (query.scope === "mine" || query.mineOnly) {
        where.userId = context.user.id;
      }
    } else {
      where.userId = context.user.id;
    }

    return where;
  }

  private async findConversationForAccess(
    id: string,
    context: ResourceAccessContext
  ): Promise<
    AftersalesConversation & {
      user?: { name: string } | null;
      department?: { name: string } | null;
    }
  > {
    const role = getEffectiveRole(context);
    const where: Prisma.AftersalesConversationWhereInput = {
      id,
      companyId: getCurrentCompanyId(context)
    };

    if (role !== "platform_admin" && role !== "company_admin") {
      where.userId = context.user.id;
    }

    const conversation = await this.prisma.aftersalesConversation.findFirst({
      where,
      include: this.conversationInclude()
    });

    if (!conversation) {
      throw new NotFoundException(`Aftersales conversation not found: ${id}`);
    }

    return conversation;
  }

  private conversationInclude() {
    return {
      user: {
        select: {
          name: true
        }
      },
      department: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          records: true
        }
      }
    } satisfies Prisma.AftersalesConversationInclude;
  }

  private async refreshConversationAfterAsk(
    conversation: AftersalesConversation,
    question: string
  ): Promise<void> {
    const shouldGenerateTitle = conversation.title === DEFAULT_CONVERSATION_TITLE;

    await this.prisma.aftersalesConversation.update({
      where: {
        id: conversation.id
      },
      data: {
        lastMessageAt: new Date(),
        ...(shouldGenerateTitle ? { title: this.generateConversationTitle(question) } : {})
      }
    });
  }

  private generateConversationTitle(question: string): string {
    let compact = question
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^(请问|麻烦问下|想问下|为什么|如何|怎么)/g, "")
      .replace(/[?？。！!，,；;：:]+$/g, "")
      .replace(/(怎么办|怎么处理|如何处理|怎么排查|如何排查|是什么原因|什么原因)$/g, "")
      .replace(/[?？。！!，,；;：:]+$/g, "")
      .replace(/没有输出/g, "无输出")
      .replace(/没有信号|没信号|不出信号/g, "信号异常")
      .trim();

    if (/无输出$/.test(compact)) {
      compact += compact.length <= 8 ? "问题" : "排查";
    } else if (/(不亮|故障|报警)$/.test(compact)) {
      compact += "排查";
    } else if (compact.length > 0 && compact.length <= 4 && !/(问题|排查|异常)$/.test(compact)) {
      compact += "问题";
    }

    return this.truncate(compact || DEFAULT_CONVERSATION_TITLE, MAX_GENERATED_TITLE_LENGTH);
  }

  private shouldAskForClarification(question: string, previousQuestion?: string): boolean {
    if (!this.isVagueQuestion(question)) {
      return false;
    }

    return !previousQuestion || !this.hasUsefulQuestionContext(previousQuestion);
  }

  private isVagueQuestion(question: string): boolean {
    const compact = question.replace(/\s+/g, "").replace(/[?？。！!，,；;：:]/g, "");
    const vaguePhrases = new Set([
      "没反应怎么办",
      "不亮怎么办",
      "没有输出",
      "没有输出怎么办",
      "怎么接",
      "继续怎么办"
    ]);

    if (vaguePhrases.has(compact)) {
      return true;
    }

    return compact.length <= 6 && /(没反应|不亮|无输出|没有输出|怎么接)/.test(compact);
  }

  private createSystemGuideDraft(question: string): AnswerDraft | null {
    const normalized = question.replace(/\s+/g, "").toLowerCase();

    if (/(怎么|如何)?补充资料|资料怎么补|补资料/.test(normalized)) {
      return this.createSystemGuideAnswer(
        "可以在「知识库」中上传文件或手动录入资料，选择资料类型、可信度和审核状态。资料审核通过后，才会被售后问答引用。"
      );
    }

    if (/人工确认|怎么转人工|如何转人工|转人工/.test(normalized)) {
      return this.createSystemGuideAnswer(
        "人工确认指当前资料未命中可引用依据，建议由售后、技术或管理员结合现场信息确认，再补充到知识库。"
      );
    }

    if (/售后问答怎么用|怎么使用售后问答|你能做什么|能做什么/.test(normalized)) {
      return this.createSystemGuideAnswer(
        "请尽量提供产品型号、现场现象、输出方式和接线情况。系统会优先依据已审核售后资料回答，未命中时再查产品资料。"
      );
    }

    return null;
  }

  private createSystemGuideAnswer(answer: string): AnswerDraft {
    return {
      answer,
      answerStatus: AftersalesAnswerStatus.answered,
      citedSources: [],
      usedMaterialTypes: [],
      isAnswered: true,
      hasReliableSource: false
    };
  }

  private hasUsefulQuestionContext(question: string): boolean {
    const normalized = question.replace(/\s+/g, " ").trim();

    return (
      /[a-zA-Z0-9]{3,}/.test(normalized) ||
      /(传感器|设备|变频器|控制器|模块|电源|输出|接线|故障|报警|型号)/.test(normalized) ||
      normalized.length >= 12
    );
  }

  private createClarificationDraft(): AnswerDraft {
    return {
      answer: CLARIFICATION_ANSWER,
      answerStatus: AftersalesAnswerStatus.needs_clarification,
      citedSources: [],
      usedMaterialTypes: [],
      isAnswered: false,
      hasReliableSource: false
    };
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

  private buildFeedbackWhere(
    query: QueryAftersalesFeedbacksDto,
    context: ResourceAccessContext
  ): Prisma.AftersalesAnswerFeedbackWhereInput {
    const role = getEffectiveRole(context);
    const where: Prisma.AftersalesAnswerFeedbackWhereInput = {
      companyId: getCurrentCompanyId(context)
    };

    if (query.status) {
      where.status = query.status as AftersalesFeedbackStatus;
    }
    if (query.errorType) {
      where.errorType = query.errorType as AftersalesFeedbackErrorType;
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

  private async findRecordForFeedback(
    id: string,
    context: ResourceAccessContext
  ): Promise<AftersalesQuestionRecord> {
    const record = await this.prisma.aftersalesQuestionRecord.findFirst({
      where: this.buildRecordWhere({ id } as QueryAftersalesRecordsDto & { id: string }, context)
    });

    if (!record) {
      throw new NotFoundException(`Aftersales question record not found: ${id}`);
    }

    return record;
  }

  private async findFeedbackForAccess(
    id: string,
    context: ResourceAccessContext
  ): Promise<FeedbackWithRelations> {
    const role = getEffectiveRole(context);
    const where: Prisma.AftersalesAnswerFeedbackWhereInput = {
      id,
      companyId: getCurrentCompanyId(context)
    };

    if (role !== "platform_admin" && role !== "company_admin") {
      where.userId = context.user.id;
    }

    const feedback = await this.prisma.aftersalesAnswerFeedback.findFirst({
      where,
      include: this.feedbackInclude()
    });

    if (!feedback) {
      throw new NotFoundException(`Aftersales answer feedback not found: ${id}`);
    }

    return feedback;
  }

  private feedbackInclude() {
    return {
      questionRecord: true,
      conversation: {
        select: {
          title: true
        }
      },
      user: {
        select: {
          name: true
        }
      },
      department: {
        select: {
          name: true
        }
      },
      handledBy: {
        select: {
          name: true
        }
      },
      convertedKnowledgeFile: {
        select: {
          id: true,
          knowledgeBaseId: true,
          title: true,
          fileName: true,
          materialType: true,
          materialTopic: true,
          sourceDescription: true,
          trustLevel: true,
          reviewStatus: true,
          createdAt: true
        }
      }
    } satisfies Prisma.AftersalesAnswerFeedbackInclude;
  }

  private buildConvertedDraftSourceDescription(
    feedback: FeedbackWithRelations,
    sourceDescription?: string
  ): string {
    const source = "来源：售后问答反馈";
    const record = "说明：由管理员从售后问答反馈转入知识库草稿，待审核后进入正式知识库。";
    const extra = sourceDescription?.trim();

    return extra ? `${source}；${record}；${extra}` : `${source}；${record}`;
  }

  private assertCanHandleFeedback(context: ResourceAccessContext): void {
    const role = getEffectiveRole(context);

    if (role !== "platform_admin" && role !== "company_admin") {
      throw new ForbiddenException("当前账号无权处理售后问答反馈");
    }
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
    const asciiTerms = terms.filter((term) => /^[a-z0-9][a-z0-9_-]+$/.test(term));

    if (asciiTerms.length > 0 && !asciiTerms.some((term) => text.includes(term))) {
      return 0;
    }

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
      conversationId: record.conversationId,
      sequence: record.sequence,
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

  private toConversationResponse(
    conversation: AftersalesConversation & {
      user?: { name: string } | null;
      department?: { name: string } | null;
      _count?: { records: number };
    }
  ): AftersalesConversationResponse {
    return {
      id: conversation.id,
      companyId: conversation.companyId,
      userId: conversation.userId,
      userName: conversation.user?.name ?? null,
      departmentId: conversation.departmentId,
      departmentName: conversation.department?.name ?? null,
      title: conversation.title,
      status: conversation.status,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation._count?.records ?? 0
    };
  }

  private toFeedbackListItem(feedback: FeedbackWithRelations): AftersalesFeedbackListItemResponse {
    const citedSources = this.jsonCitedSourcesToArray(feedback.questionRecord.citedSources);

    return {
      feedbackId: feedback.id,
      status: feedback.status,
      errorType: feedback.errorType,
      correctionTextPreview: this.truncate(feedback.correctionText, MAX_FEEDBACK_PREVIEW_LENGTH),
      descriptionPreview: feedback.description
        ? this.truncate(feedback.description, MAX_FEEDBACK_PREVIEW_LENGTH)
        : null,
      questionPreview: this.truncate(feedback.questionRecord.question, MAX_QUESTION_PREVIEW_LENGTH),
      answerPreview: this.truncate(feedback.questionRecord.answer, MAX_ANSWER_PREVIEW_LENGTH),
      conversationId: feedback.conversationId,
      conversationTitle: feedback.conversation?.title ?? null,
      questionRecordId: feedback.questionRecordId,
      userId: feedback.userId,
      userName: feedback.user?.name ?? null,
      departmentId: feedback.departmentId,
      departmentName: feedback.department?.name ?? null,
      handledAt: feedback.handledAt,
      citedSourcesSummary: {
        count: citedSources.length,
        chunkIds: citedSources.map((source) => source.chunkId),
        fileIds: citedSources.map((source) => source.fileId)
      },
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt
    };
  }

  private toFeedbackDetail(feedback: FeedbackWithRelations): AftersalesFeedbackDetailResponse {
    return {
      ...this.toFeedbackListItem(feedback),
      correctionText: feedback.correctionText,
      description: feedback.description,
      question: feedback.questionRecord.question,
      answer: feedback.questionRecord.answer,
      citedSources: this.jsonCitedSourcesToArray(feedback.questionRecord.citedSources),
      handleNote: feedback.handleNote,
      handledById: feedback.handledById,
      handledByName: feedback.handledBy?.name ?? null,
      convertedKnowledgeDraft: feedback.convertedKnowledgeFile
        ? {
            id: feedback.convertedKnowledgeFile.id,
            knowledgeBaseId: feedback.convertedKnowledgeFile.knowledgeBaseId,
            title:
              feedback.convertedKnowledgeFile.title ?? feedback.convertedKnowledgeFile.fileName,
            materialType: feedback.convertedKnowledgeFile.materialType,
            materialTopic: feedback.convertedKnowledgeFile.materialTopic ?? undefined,
            sourceDescription: feedback.convertedKnowledgeFile.sourceDescription ?? undefined,
            trustLevel: feedback.convertedKnowledgeFile.trustLevel,
            reviewStatus: feedback.convertedKnowledgeFile.reviewStatus,
            createdAt: feedback.convertedKnowledgeFile.createdAt
          }
        : null
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
