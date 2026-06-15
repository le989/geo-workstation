import {
  CompanyStatus,
  CompanyType,
  UserRole,
  UserStatus,
  Visibility
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { KnowledgeChunksService } from "../src/modules/geo-knowledge/knowledge-chunks.service";
import type { OperationLogsService } from "../src/modules/usage/operation-logs.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("KnowledgeChunksService audit logs", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let knowledgeChunksService: KnowledgeChunksService;
  let operationLogsService: { recordOperation: ReturnType<typeof vi.fn> };
  let companyId: string;
  let createdById: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    operationLogsService = {
      recordOperation: vi.fn().mockResolvedValue(undefined)
    };
    knowledgeChunksService = new KnowledgeChunksService(
      prisma as unknown as PrismaService,
      operationLogsService as unknown as OperationLogsService
    );

    const company = await prisma.company.create({
      data: {
        name: `Knowledge Chunk Audit Company ${runId}`,
        code: `knowledge-chunk-audit-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyId = company.id;

    const user = await prisma.user.create({
      data: {
        email: `knowledge-chunk-audit-${runId}@example.com`,
        name: "Knowledge Chunk Audit User",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdById = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("records safe operation logs when knowledge chunk is updated and deleted", async () => {
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        companyId,
        visibility: Visibility.COMPANY,
        name: `知识片段审计知识库 ${runId}`,
        status: "active",
        createdById
      }
    });
    const chunk = await prisma.knowledgeChunk.create({
      data: {
        companyId,
        knowledgeBaseId: knowledgeBase.id,
        title: "片段审计资料",
        content: "原始片段正文包含客户联系方式 13812345678 和内部处理细节。",
        sourceType: "pasted_text",
        tags: ["原始标签"]
      }
    });

    operationLogsService.recordOperation.mockClear();

    await knowledgeChunksService.update(chunk.id, {
      title: "片段审计资料更新",
      content: "更新后的片段正文包含客户微信 wxabcdef 和正文细节。",
      tags: ["选型", "FAQ"]
    });
    await knowledgeChunksService.softDelete(chunk.id);

    const actions = operationLogsService.recordOperation.mock.calls.map(
      ([input]) => input.action
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        "chunk_update",
        "knowledge_base.chunk.updated",
        "knowledge_base.chunk.deleted"
      ])
    );

    const updatedLog = operationLogsService.recordOperation.mock.calls.find(
      ([input]) => input.action === "knowledge_base.chunk.updated"
    )?.[0];
    const deletedLog = operationLogsService.recordOperation.mock.calls.find(
      ([input]) => input.action === "knowledge_base.chunk.deleted"
    )?.[0];

    expect(updatedLog?.metadata).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      fileId: null,
      chunkId: chunk.id,
      changedFields: ["title", "content", "tags"],
      contentUpdated: true,
      tagCount: 2,
      tagsBeforeCount: 1,
      tagsAfterCount: 2
    });
    expect(deletedLog?.metadata).toMatchObject({
      knowledgeBaseId: knowledgeBase.id,
      fileId: null,
      chunkId: chunk.id,
      statusBefore: "active",
      statusAfter: "deleted"
    });

    const serializedCalls = JSON.stringify(operationLogsService.recordOperation.mock.calls);
    expect(serializedCalls).not.toContain("原始片段正文包含客户联系方式");
    expect(serializedCalls).not.toContain("更新后的片段正文包含客户微信");
    expect(serializedCalls).not.toContain("13812345678");
    expect(serializedCalls).not.toContain("wxabcdef");
    expect(serializedCalls).not.toContain("选型");
    expect(serializedCalls).not.toContain("FAQ");
  });
});
