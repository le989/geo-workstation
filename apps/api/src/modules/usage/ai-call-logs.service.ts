import { Inject, Injectable } from "@nestjs/common";
import { AiCallStatus } from "@prisma/client";

import { getCurrentCompanyId, type ResourceAccessContext } from "../auth/auth-policy";
import { PrismaService } from "../../prisma/prisma.service";

export type RecordAiCallLogInput = {
  provider: string;
  model: string;
  purpose: string;
  relatedType?: string | null;
  relatedId?: string | null;
  tokenInput?: number | null;
  tokenOutput?: number | null;
  costEstimate?: number | null;
  status: AiCallStatus;
};

@Injectable()
export class AiCallLogsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async recordAiCallLog(
    input: RecordAiCallLogInput,
    context?: ResourceAccessContext
  ): Promise<void> {
    // AI 调用流水只记录 Provider、模型、关联对象和 token，不接收 prompt、正文或 AI response。
    await this.prisma.aiCallLog.create({
      data: {
        provider: input.provider,
        model: input.model,
        purpose: input.purpose,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        tokenInput: input.tokenInput ?? null,
        tokenOutput: input.tokenOutput ?? null,
        costEstimate: input.costEstimate ?? 0,
        status: input.status,
        ...(context
          ? {
              company: {
                connect: {
                  id: getCurrentCompanyId(context)
                }
              },
              createdBy: {
                connect: {
                  id: context.user.id
                }
              }
            }
          : {})
      }
    });
  }
}
