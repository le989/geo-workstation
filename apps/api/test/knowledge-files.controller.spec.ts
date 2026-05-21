import "reflect-metadata";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ParseStatus, UserRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;
const storageRoot = join(process.cwd(), "storage", `phase-2e-controller-${runId}`);

describe("KnowledgeFilesController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    process.env.LOCAL_STORAGE_ROOT = storageRoot;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `knowledge-files-controller-${runId}@example.com`,
        name: "Phase 2E GEO Knowledge File API Operator",
        role: UserRole.geo_operator,
        status: UserStatus.active
      }
    });
    createdBy = user.id;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    configureApiApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await rm(storageRoot, {
      recursive: true,
      force: true
    });
  });

  async function createKnowledgeBase(label: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/knowledge-bases")
      .send({
        name: `Phase 2E API ${label} ${runId}`,
        productLine: `Phase 2E API 产品线 ${label}`,
        createdBy
      })
      .expect(201);

    return response.body.data.id;
  }

  it("uploads, lists, details, reparses, and soft deletes a knowledge file through ApiResponse", async () => {
    const knowledgeBaseId = await createKnowledgeBase("上传闭环");
    const uploadResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${knowledgeBaseId}/files`)
      .field("materialType", "faq")
      .field("materialTopic", "故障排查")
      .field("tags", "FAQ,GEO素材")
      .field("createdBy", createdBy)
      .attach(
        "file",
        Buffer.from("# FAQ资料\n激光测距传感器常见问题包括量程、安装和干扰处理。"),
        "faq.md"
      )
      .expect(201);

    expect(uploadResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        parseStatus: ParseStatus.succeeded,
        createdChunksCount: 1,
        knowledgeFile: {
          fileName: "faq.md",
          fileType: "md",
          materialTopic: "故障排查",
          parseStatus: ParseStatus.succeeded
        }
      }
    });
    expect(uploadResponse.body.data.createdChunks[0].tags).toEqual(["FAQ", "GEO素材"]);

    const listResponse = await request(app.getHttpServer())
      .get(`/api/knowledge-bases/${knowledgeBaseId}/files`)
      .query({
        parseStatus: ParseStatus.succeeded,
        fileType: "md",
        page: "1",
        pageSize: "10"
      })
      .expect(200);
    expect(listResponse.body.data.total).toBe(1);

    const fileId = uploadResponse.body.data.knowledgeFile.id;
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/knowledge-files/${fileId}`)
      .expect(200);
    expect(detailResponse.body.data.chunksCount).toBe(1);

    const reparseResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-files/${fileId}/reparse`)
      .send({
        materialType: "reparse_api",
        tags: ["重试"]
      })
      .expect(201);
    expect(reparseResponse.body.data.parseStatus).toBe(ParseStatus.succeeded);
    expect(reparseResponse.body.data.createdChunks[0].materialType).toBe("reparse_api");

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/knowledge-files/${fileId}`)
      .expect(200);
    expect(deleteResponse.body.data.alreadyDeleted).toBe(false);

    const listAfterDelete = await request(app.getHttpServer())
      .get(`/api/knowledge-bases/${knowledgeBaseId}/files`)
      .expect(200);
    expect(listAfterDelete.body.data.total).toBe(0);
  });

  it("returns unified errors for unsupported file types and deleted knowledge bases", async () => {
    const knowledgeBaseId = await createKnowledgeBase("错误响应");
    const unsupported = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${knowledgeBaseId}/files`)
      .field("createdBy", createdBy)
      .attach("file", Buffer.from("fake pdf content"), "manual.pdf")
      .expect(400);
    expect(unsupported.body).toEqual({
      code: 400,
      message: "Unsupported GEO knowledge file type: .pdf",
      data: null
    });

    await request(app.getHttpServer())
      .delete(`/api/knowledge-bases/${knowledgeBaseId}`)
      .expect(200);
    const deletedBase = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${knowledgeBaseId}/files`)
      .field("createdBy", createdBy)
      .attach("file", Buffer.from("有效文本内容需要足够长才能解析为知识片段。"), "intro.txt")
      .expect(400);
    expect(deletedBase.body.message).toBe(
      `Deleted GEO knowledge base cannot accept file upload: ${knowledgeBaseId}`
    );
  });
});
