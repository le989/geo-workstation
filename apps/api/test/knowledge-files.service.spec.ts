import { rm, unlink } from "node:fs/promises";
import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { ParseStatus, UserRole, UserStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { KnowledgeFileParserService } from "../src/modules/geo-knowledge/knowledge-file-parser.service";
import { KnowledgeFilesService } from "../src/modules/geo-knowledge/knowledge-files.service";
import { KnowledgeBasesService } from "../src/modules/geo-knowledge/knowledge-bases.service";
import { LocalFileStorageService } from "../src/modules/geo-knowledge/local-file-storage.service";
import { createPrismaClient } from "../src/prisma/create-prisma-client";
import type { PrismaService } from "../src/prisma/prisma.service";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;
const storageRoot = join(process.cwd(), "storage", `phase-2e-service-${runId}`);

describe("KnowledgeFilesService", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let knowledgeBasesService: KnowledgeBasesService;
  let knowledgeFilesService: KnowledgeFilesService;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const configService = new ConfigService({
      LOCAL_STORAGE_ROOT: storageRoot
    });
    const storage = new LocalFileStorageService(configService);
    const parser = new KnowledgeFileParserService();

    knowledgeBasesService = new KnowledgeBasesService(prisma as unknown as PrismaService);
    knowledgeFilesService = new KnowledgeFilesService(
      prisma as unknown as PrismaService,
      storage,
      parser
    );

    const user = await prisma.user.create({
      data: {
        email: `knowledge-files-service-${runId}@example.com`,
        name: "Phase 2E GEO Knowledge File Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await rm(storageRoot, {
      recursive: true,
      force: true
    });
  });

  function uploadFile(fileName: string, content: string) {
    return {
      originalname: fileName,
      mimetype: "text/plain",
      size: Buffer.byteLength(content),
      buffer: Buffer.from(content)
    };
  }

  async function createKnowledgeBase(label: string) {
    return knowledgeBasesService.create({
      name: `Phase 2E ${label} ${runId}`,
      productLine: `Phase 2E 产品线 ${label}`,
      createdBy
    });
  }

  it("uploads txt, md, and csv files, creates knowledge_file records, and parses chunks", async () => {
    const knowledgeBase = await createKnowledgeBase("基础上传");

    const txt = await knowledgeFilesService.upload(
      knowledgeBase.id,
      uploadFile("intro.txt", "激光测距传感器适合高精度检测。\n\n选型需要关注量程精度响应速度。"),
      {
        materialType: "product_info",
        tags: "产品,选型",
        createdBy
      }
    );
    const md = await knowledgeFilesService.upload(
      knowledgeBase.id,
      uploadFile("guide.md", "# 选型指南\n激光测距传感器选型要关注量程、精度和安装方式。"),
      {
        createdBy
      }
    );
    const csv = await knowledgeFilesService.upload(
      knowledgeBase.id,
      uploadFile("faq.csv", "title,content\nFAQ,激光测距传感器常见问题包括安装方式和干扰处理。"),
      {
        materialType: "faq",
        tags: '["FAQ","GEO素材"]',
        createdBy
      }
    );

    expect(txt.parseStatus).toBe(ParseStatus.succeeded);
    expect(txt.createdChunksCount).toBeGreaterThan(0);
    expect(txt.knowledgeFile.fileType).toBe("txt");
    expect(txt.createdChunks[0]).toMatchObject({
      sourceType: "uploaded_file",
      materialType: "product_info",
      productLine: knowledgeBase.productLine,
      tags: ["产品", "选型"]
    });
    expect(md.parseStatus).toBe(ParseStatus.succeeded);
    expect(csv.parseStatus).toBe(ParseStatus.succeeded);
    expect(csv.createdChunks[0]?.tags).toEqual(["FAQ", "GEO素材"]);
  });

  it("rejects unsupported files, missing knowledge bases, deleted knowledge bases, and empty uploads", async () => {
    const knowledgeBase = await createKnowledgeBase("校验");

    await expect(
      knowledgeFilesService.upload(knowledgeBase.id, uploadFile("manual.pdf", "fake pdf"), {
        createdBy
      })
    ).rejects.toThrow("Unsupported GEO knowledge file type: .pdf");

    await expect(
      knowledgeFilesService.upload(
        "missing-knowledge-base",
        uploadFile("intro.txt", "有效文本内容需要足够长。"),
        {
          createdBy
        }
      )
    ).rejects.toThrow("GEO knowledge base not found: missing-knowledge-base");

    await knowledgeBasesService.softDelete(knowledgeBase.id);
    await expect(
      knowledgeFilesService.upload(
        knowledgeBase.id,
        uploadFile("intro.txt", "有效文本内容需要足够长。"),
        {
          createdBy
        }
      )
    ).rejects.toThrow(`Deleted GEO knowledge base cannot accept file upload: ${knowledgeBase.id}`);

    const activeBase = await createKnowledgeBase("空文件");
    await expect(
      knowledgeFilesService.upload(activeBase.id, uploadFile("empty.txt", ""), {
        createdBy
      })
    ).rejects.toThrow("Uploaded GEO knowledge file cannot be empty.");
  });

  it("keeps a failed knowledge_file when parsing fails", async () => {
    const knowledgeBase = await createKnowledgeBase("解析失败");
    const result = await knowledgeFilesService.upload(
      knowledgeBase.id,
      uploadFile("broken.csv", 'title,content\n"未闭合标题,内容'),
      {
        createdBy
      }
    );

    expect(result.parseStatus).toBe(ParseStatus.failed);
    expect(result.createdChunksCount).toBe(0);
    expect(result.errorMessage).toContain("CSV parse failed");

    const stored = await prisma.knowledgeFile.findUnique({
      where: {
        id: result.knowledgeFile.id
      }
    });
    expect(stored?.parseStatus).toBe(ParseStatus.failed);
    expect(stored?.errorMessage).toContain("CSV parse failed");
  });

  it("lists files, returns file details, reparses successfully, and records missing-file failures", async () => {
    const knowledgeBase = await createKnowledgeBase("列表详情重试");
    const uploaded = await knowledgeFilesService.upload(
      knowledgeBase.id,
      uploadFile("guide.md", "# 资料标题\n激光测距传感器资料可用于 GEO 内容生成和 AI 引用。"),
      {
        createdBy
      }
    );

    const list = await knowledgeFilesService.findMany(knowledgeBase.id, {
      page: 1,
      pageSize: 10,
      parseStatus: ParseStatus.succeeded
    });
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(uploaded.knowledgeFile.id);

    const detail = await knowledgeFilesService.getDetail(uploaded.knowledgeFile.id);
    expect(detail.chunksCount).toBe(uploaded.createdChunksCount);
    expect(detail.latestChunks[0]?.fileId).toBe(uploaded.knowledgeFile.id);

    const reparsed = await knowledgeFilesService.reparse(uploaded.knowledgeFile.id, {
      materialType: "reparsed_file",
      tags: ["重试"]
    });
    expect(reparsed.parseStatus).toBe(ParseStatus.succeeded);
    expect(reparsed.createdChunks[0]?.materialType).toBe("reparsed_file");
    expect(reparsed.createdChunks[0]?.tags).toEqual(["重试"]);

    await unlink(uploaded.knowledgeFile.storagePath ?? "");
    const missing = await knowledgeFilesService.reparse(uploaded.knowledgeFile.id, {
      materialType: "missing_file"
    });
    expect(missing.parseStatus).toBe(ParseStatus.failed);
    expect(missing.errorMessage).toContain("Stored GEO knowledge file does not exist");
  });

  it("soft deletes files and linked chunks, excluding them from lists", async () => {
    const knowledgeBase = await createKnowledgeBase("删除文件");
    const uploaded = await knowledgeFilesService.upload(
      knowledgeBase.id,
      uploadFile("delete-me.txt", "删除文件测试内容会先解析为一个有效知识片段。"),
      {
        createdBy
      }
    );

    const deleted = await knowledgeFilesService.softDelete(uploaded.knowledgeFile.id);
    expect(deleted.alreadyDeleted).toBe(false);

    const idempotent = await knowledgeFilesService.softDelete(uploaded.knowledgeFile.id);
    expect(idempotent.alreadyDeleted).toBe(true);

    const list = await knowledgeFilesService.findMany(knowledgeBase.id, {});
    expect(list.total).toBe(0);

    const activeChunks = await prisma.knowledgeChunk.count({
      where: {
        fileId: uploaded.knowledgeFile.id,
        deletedAt: null
      }
    });
    expect(activeChunks).toBe(0);
  });
});
