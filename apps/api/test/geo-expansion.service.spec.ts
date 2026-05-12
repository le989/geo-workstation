import { BadRequestException } from "@nestjs/common";
import {
  ExpansionMode,
  GeoPromptType,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GeoExpansionService } from "../src/modules/geo-expansion/geo-expansion.service";
import { generateExpansionCombinations } from "../src/modules/geo-expansion/utils/expansion-combination.util";
import { MockAiExpansionProvider } from "../src/modules/geo-expansion/utils/mock-ai-expansion-provider";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoExpansionService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let service: GeoExpansionService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    service = new GeoExpansionService(
      prisma as unknown as PrismaService,
      new MockAiExpansionProvider()
    );

    const user = await prisma.user.create({
      data: {
        email: `geo-expansion-service-${runId}@example.com`,
        name: "Phase 2C GEO Expansion Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function uniqueBase(label: string): string {
    return `激光测距传感器${label}${runId}`;
  }

  it("generates all seven GEO rule-expansion combination categories", () => {
    const combinations = generateExpansionCombinations({
      baseWord: "激光测距传感器",
      prefixes: ["国产"],
      serviceSuffixes: ["厂家推荐"],
      applicationSuffixes: ["怎么选"]
    });

    expect(combinations.map((candidate) => candidate.ruleType)).toEqual([
      "prefix_base",
      "base_application",
      "prefix_base_application",
      "base_service",
      "prefix_base_service",
      "base_service_application",
      "prefix_base_service_application"
    ]);
    expect(combinations.map((candidate) => candidate.promptText)).toEqual([
      "国产激光测距传感器",
      "激光测距传感器怎么选",
      "国产激光测距传感器怎么选",
      "激光测距传感器厂家推荐",
      "国产激光测距传感器厂家推荐",
      "激光测距传感器厂家推荐怎么选",
      "国产激光测距传感器厂家推荐怎么选"
    ]);
  });

  it("rule-generate creates a rule expansion job and marks batch and database duplicates", async () => {
    const baseWord = uniqueBase("规则");
    const databaseDuplicatePrompt = `${baseWord}怎么选`;
    await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord,
        promptText: databaseDuplicatePrompt,
        userIntent: UserIntent.selection,
        priority: 3,
        targetModels: [],
        source: "test",
        trackEnabled: false,
        createdById: createdBy
      }
    });

    const result = await service.ruleGenerate({
      baseWord,
      prefixes: ["国产", "国产"],
      serviceSuffixes: ["厂家推荐"],
      applicationSuffixes: ["怎么选"],
      promptType: GeoPromptType.distilled,
      productLine: "激光测距传感器",
      scenario: "选型",
      userIntent: UserIntent.selection,
      createdBy
    });

    expect(result.job.mode).toBe(ExpansionMode.rule);
    expect(result.job.status).toBe(TaskStatus.succeeded);
    expect(result.candidates.length).toBeGreaterThanOrEqual(8);
    expect(result.candidates.some((candidate) => candidate.duplicateInBatch)).toBe(true);
    expect(
      result.candidates.some(
        (candidate) =>
          candidate.promptText === databaseDuplicatePrompt &&
          candidate.duplicateInDatabase &&
          candidate.duplicateReason === "duplicate_in_database"
      )
    ).toBe(true);
  });

  it("ai-generate uses the Mock AI Provider, creates a job, candidates, and ai_call_logs", async () => {
    const baseWord = uniqueBase("AI");
    const result = await service.aiGenerate({
      baseWord,
      promptType: GeoPromptType.scene,
      userIntent: UserIntent.application_solution,
      productLine: "激光测距传感器",
      scenario: "行车防撞",
      count: 4,
      targetModels: ["deepseek-chat"],
      constraints: "聚焦工业场景",
      createdBy
    });

    expect(result.job.mode).toBe(ExpansionMode.ai);
    expect(result.job.provider).toBe("mock");
    expect(result.job.model).toBe("mock-expansion-v1");
    expect(result.candidates).toHaveLength(4);
    expect(result.candidates[0]?.promptText).toContain(baseWord);
    expect(result.candidates.some((candidate) => candidate.promptText.includes("行车防撞"))).toBe(
      true
    );

    const aiLog = await prisma.aiCallLog.findFirst({
      where: {
        relatedType: "expansion_job",
        relatedId: result.job.id,
        provider: "mock",
        model: "mock-expansion-v1"
      }
    });
    expect(aiLog?.status).toBe("succeeded");
  });

  it("rejects base prompt type for AI expansion output", async () => {
    await expect(
      service.aiGenerate({
        baseWord: uniqueBase("base禁止"),
        promptType: GeoPromptType.base,
        count: 3,
        createdBy
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("gets job details with candidates and save status", async () => {
    const generated = await service.ruleGenerate({
      baseWord: uniqueBase("详情"),
      prefixes: ["国产"],
      applicationSuffixes: ["怎么选"],
      promptType: GeoPromptType.distilled,
      createdBy
    });

    const detail = await service.getJob(generated.job.id);

    expect(detail.job.id).toBe(generated.job.id);
    expect(detail.candidates.length).toBe(generated.candidates.length);
    expect(detail.candidates[0]?.saveStatus).toBe("pending");
  });

  it("save-candidates stores selected candidates into geo_prompts and skips duplicates or invalid selections", async () => {
    const generated = await service.ruleGenerate({
      baseWord: uniqueBase("保存"),
      prefixes: ["国产"],
      serviceSuffixes: ["厂家推荐"],
      applicationSuffixes: ["怎么选"],
      promptType: GeoPromptType.distilled,
      productLine: "激光测距传感器",
      userIntent: UserIntent.selection,
      priority: 2,
      createdBy
    });
    const otherJob = await service.ruleGenerate({
      baseWord: uniqueBase("其他任务"),
      prefixes: ["国产"],
      promptType: GeoPromptType.distilled,
      createdBy
    });
    const firstCandidate = generated.candidates[0];
    const secondCandidate = generated.candidates[1];

    if (!firstCandidate || !secondCandidate || !otherJob.candidates[0]) {
      throw new Error("Expected expansion candidates to be generated.");
    }

    await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: generated.job.baseWord,
        promptText: secondCandidate.promptText,
        userIntent: UserIntent.selection,
        priority: 3,
        targetModels: [],
        source: "test",
        trackEnabled: false,
        createdById: createdBy
      }
    });

    const result = await service.saveCandidates(generated.job.id, {
      candidateIds: [
        firstCandidate.id,
        secondCandidate.id,
        otherJob.candidates[0].id,
        "missing-id"
      ],
      defaultProductLine: "默认产品线",
      defaultPriority: 5,
      defaultTrackEnabled: true,
      createdBy
    });

    expect(result.totalSelected).toBe(4);
    expect(result.savedCount).toBe(1);
    expect(result.skippedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateId: secondCandidate.id,
          reason: "duplicate_in_database"
        })
      ])
    );
    expect(result.failedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateId: otherJob.candidates[0].id,
          reason: "candidate_not_in_job"
        }),
        expect.objectContaining({
          candidateId: "missing-id",
          reason: "candidate_not_found"
        })
      ])
    );

    const savedPrompt = await prisma.geoPrompt.findUnique({
      where: {
        id: result.savedItems[0]?.geoPromptId
      }
    });
    expect(savedPrompt?.promptText).toBe(firstCandidate.promptText);
    expect(savedPrompt?.productLine).toBe("默认产品线");
    expect(savedPrompt?.priority).toBe(5);
    expect(savedPrompt?.trackEnabled).toBe(true);

    const idempotent = await service.saveCandidates(generated.job.id, {
      candidateIds: [firstCandidate.id],
      createdBy
    });
    expect(idempotent.savedCount).toBe(0);
    expect(idempotent.skippedItems[0]?.reason).toBe("already_saved");
  });
});
