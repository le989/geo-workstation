import {
  AiCallStatus,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  MembershipRole,
  ProductLineStatus,
  UserRole
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ContentItemsService } from "../src/modules/geo-content/content-items.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";

const context: ResourceAccessContext = {
  user: {
    id: "user-a",
    email: "user-a@example.com",
    name: "User A",
    role: UserRole.company_admin,
    status: "active",
    isPlatformAdmin: false
  },
  currentCompany: {
    id: "company-a",
    name: "Company A",
    code: "company-a",
    role: MembershipRole.company_admin,
    isDefault: true,
    accessibleModules: [],
    department: null
  },
  currentMembership: {
    companyId: "company-a",
    role: MembershipRole.company_admin,
    isDefault: true,
    isPlatformAdmin: false,
    accessibleModules: [],
    departmentId: null
  }
};

function createContentItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-a",
    taskId: "task-a",
    geoPromptId: "prompt-a",
    companyId: "company-a",
    createdById: "user-a",
    title: "KJT-LD18 雷达测距传感器文章",
    body: "KJT-LD18 可用于工业测距，其他参数需结合资料确认。",
    geoOptimizationPoints: [],
    suggestedPublishChannel: null,
    status: "draft",
    errorMessage: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    geoPrompt: {
      id: "prompt-a",
      promptText: "KJT-LD18 雷达测距传感器参数有哪些？"
    },
    task: {
      id: "task-a",
      name: "LD18 指定资料任务",
      companyId: "company-a",
      createdById: "user-a",
      productLine: "雷达测距传感器",
      productLineId: "line-radar",
      knowledgeBaseId: "kb-a",
      knowledgeScope: {
        type: "selected_files",
        selectedKnowledgeFileIds: ["file-ld18"]
      },
      instructionTemplateId: null,
      generationType: "product_intro",
      targetModel: null,
      status: "succeeded",
      provider: "openai_compatible",
      model: "test-real-model",
      knowledgeBase: {
        id: "kb-a",
        name: "凯基特正式资料库"
      },
      instructionTemplate: null,
      ...overrides
    }
  };
}

function createService(item = createContentItem()) {
  const prisma = {
    contentItem: {
      findFirst: vi.fn().mockResolvedValue(item)
    },
    knowledgeChunk: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "chunk-ld18",
          title: "KJT-LD18 雷达测距传感器产品规格书",
          content: "KJT-LD18 雷达测距传感器资料片段。",
          fileId: "file-ld18"
        }
      ])
    },
    productLine: {
      findFirst: vi.fn().mockResolvedValue({
        id: "line-radar",
        name: "雷达测距传感器",
        code: "radar_distance_sensor",
        status: ProductLineStatus.active
      })
    },
    aiCallLog: {
      create: vi.fn().mockResolvedValue({})
    }
  };
  const aiProvider = {
    generateText: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        score: 92,
        level: "good",
        summary: "范围正确。",
        riskItems: [],
        positiveItems: ["只使用指定资料"],
        publishReadiness: {
          canPublish: true,
          needsHumanReview: false,
          suggestedAction: "可发布"
        },
        title: "发布优化版标题",
        body: "发布优化版正文。",
        changes: ["保留资料边界"],
        warnings: []
      }),
      provider: "openai_compatible",
      model: "test-real-model",
      tokenInput: 10,
      tokenOutput: 12
    })
  };
  const aiUsageService = {
    recordUsage: vi.fn().mockResolvedValue({})
  };
  const service = new ContentItemsService(
    prisma as never,
    aiProvider,
    {
      getPromptContext: vi.fn().mockResolvedValue(null)
    },
    aiUsageService as never,
    undefined,
    {
      get: vi.fn((key: string) => {
        if (key === "APP_ENV") {
          return "smoke";
        }
        if (key === "ENABLE_MOCK_PROVIDER") {
          return "true";
        }
        return undefined;
      })
    } as never
  );

  return {
    service,
    prisma,
    aiProvider,
    aiUsageService
  };
}

describe("ContentItemsService real AI guard", () => {
  it("uses selected_files knowledge scope for quality check and records a call log", async () => {
    const { service, prisma } = createService();

    await service.qualityCheck(
      "item-a",
      {
        provider: "openai_compatible",
        model: "test-real-model"
      },
      context
    );

    expect(prisma.knowledgeChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            expect.objectContaining({
              knowledgeBaseId: "kb-a",
              companyId: "company-a",
              file: {
                is: {
                  AND: expect.arrayContaining([
                    expect.objectContaining({
                      reviewStatus: KnowledgeReviewStatus.approved,
                      trustLevel: {
                        not: KnowledgeTrustLevel.low
                      }
                    }),
                    expect.objectContaining({
                      companyId: "company-a"
                    })
                  ])
                }
              }
            }),
            expect.objectContaining({
              fileId: {
                in: ["file-ld18"]
              }
            })
          ])
        }
      })
    );
    expect(prisma.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: "openai_compatible",
          model: "test-real-model",
          purpose: "content_quality_check",
          relatedType: "content_item",
          relatedId: "item-a",
          status: AiCallStatus.succeeded,
          company: {
            connect: {
              id: "company-a"
            }
          },
          createdBy: {
            connect: {
              id: "user-a"
            }
          }
        })
      })
    );
  });

  it("does not fallback to all knowledge when product_line scope has no citable chunks", async () => {
    const { service, prisma, aiProvider } = createService(
      createContentItem({
        knowledgeScope: {
          type: "product_line",
          productLineId: "line-empty"
        },
        productLineId: "line-empty",
        productLine: "无资料产品线"
      })
    );
    prisma.productLine.findFirst.mockResolvedValueOnce({
      id: "line-empty",
      name: "无资料产品线",
      code: "empty_line",
      status: ProductLineStatus.active
    });
    prisma.knowledgeChunk.findMany.mockResolvedValueOnce([]);

    await expect(
      service.optimizeForPublish(
        "item-a",
        {
          provider: "openai_compatible",
          model: "test-real-model"
        },
        context
      )
    ).rejects.toThrow("当前资料范围内没有可引用资料");
    expect(aiProvider.generateText).not.toHaveBeenCalled();
  });

  it("uses selected_files knowledge scope for publish optimization and records a call log", async () => {
    const { service, prisma } = createService();

    await service.optimizeForPublish(
      "item-a",
      {
        provider: "openai_compatible",
        model: "test-real-model"
      },
      context
    );

    expect(prisma.knowledgeChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            expect.objectContaining({
              knowledgeBaseId: "kb-a",
              companyId: "company-a"
            }),
            expect.objectContaining({
              fileId: {
                in: ["file-ld18"]
              }
            })
          ])
        }
      })
    );
    expect(prisma.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: "openai_compatible",
          model: "test-real-model",
          purpose: "content_publish_optimization",
          relatedType: "content_item",
          relatedId: "item-a",
          status: AiCallStatus.succeeded
        })
      })
    );
  });
});
