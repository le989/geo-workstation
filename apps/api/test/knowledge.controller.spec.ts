import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { UserRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoKnowledgeController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `knowledge-controller-${runId}@example.com`,
        name: "Phase 2D GEO Knowledge API Operator",
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
  });

  function uniqueName(label: string): string {
    return `Phase 2D API ${label} ${runId}`;
  }

  it("creates, lists, details, updates, imports text, manages chunks, and soft deletes through ApiResponse", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/knowledge-bases")
      .send({
        name: `  ${uniqueName("知识库")}  `,
        productLine: " HTTP知识产品线 ",
        description: "用于 GEO 内容生成和 AI 引用的事实底座",
        createdBy
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        name: uniqueName("知识库"),
        productLine: "HTTP知识产品线",
        status: "active"
      }
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/knowledge-bases")
      .query({
        productLine: "HTTP知识产品线",
        page: "1",
        pageSize: "10"
      })
      .expect(200);
    expect(listResponse.body.data.total).toBe(1);

    const detailBeforeImport = await request(app.getHttpServer())
      .get(`/api/knowledge-bases/${createResponse.body.data.id}`)
      .expect(200);
    expect(detailBeforeImport.body.data.chunksCount).toBe(0);

    const directoriesBeforeCreate = await request(app.getHttpServer())
      .get(`/api/knowledge-bases/${createResponse.body.data.id}/directories`)
      .expect(200);
    expect(directoriesBeforeCreate.body.data.items).toHaveLength(1);
    expect(directoriesBeforeCreate.body.data.items[0]).toMatchObject({
      name: "默认根目录",
      status: "active",
      isDefault: true
    });

    const createdDirectory = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${createResponse.body.data.id}/directories`)
      .send({
        name: "FAQ 目录"
      })
      .expect(201);
    expect(createdDirectory.body.data).toMatchObject({
      name: "FAQ 目录",
      status: "active",
      isDefault: false
    });

    const renamedDirectory = await request(app.getHttpServer())
      .patch(`/api/knowledge-directories/${createdDirectory.body.data.id}`)
      .send({
        name: "售后 FAQ"
      })
      .expect(200);
    expect(renamedDirectory.body.data.name).toBe("售后 FAQ");

    const disabledDirectory = await request(app.getHttpServer())
      .patch(`/api/knowledge-directories/${createdDirectory.body.data.id}/disable`)
      .expect(200);
    expect(disabledDirectory.body.data).toMatchObject({
      id: createdDirectory.body.data.id,
      status: "disabled"
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/knowledge-bases/${createResponse.body.data.id}`)
      .send({
        description: "更新后的 GEO 知识库说明"
      })
      .expect(200);
    expect(updateResponse.body.data.description).toBe("更新后的 GEO 知识库说明");

    const importResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${createResponse.body.data.id}/text-import`)
      .send({
        title: "  FAQ素材  ",
        content: "激光测距传感器常见问题包括量程选择、安装方式和现场干扰处理。",
        materialType: "faq",
        tags: [" FAQ ", "", "选型"],
        createdBy
      })
      .expect(201);
    expect(importResponse.body.data).toMatchObject({
      title: "FAQ素材",
      productLine: "HTTP知识产品线",
      sourceType: "pasted_text",
      materialType: "faq",
      tags: ["FAQ", "选型"]
    });

    const chunksResponse = await request(app.getHttpServer())
      .get(`/api/knowledge-bases/${createResponse.body.data.id}/chunks`)
      .query({
        search: "量程选择",
        tags: "FAQ"
      })
      .expect(200);
    expect(chunksResponse.body.data.total).toBe(1);

    const chunkId = importResponse.body.data.id;
    const patchChunk = await request(app.getHttpServer())
      .patch(`/api/knowledge-chunks/${chunkId}`)
      .send({
        title: "FAQ与选型素材",
        content: "FAQ与选型素材应覆盖量程、精度、安装、干扰处理和应用边界。",
        tags: ["FAQ", "GEO素材"]
      })
      .expect(200);
    expect(patchChunk.body.data.title).toBe("FAQ与选型素材");

    const deleteChunk = await request(app.getHttpServer())
      .delete(`/api/knowledge-chunks/${chunkId}`)
      .expect(200);
    expect(deleteChunk.body.data.alreadyDeleted).toBe(false);

    const chunksAfterDelete = await request(app.getHttpServer())
      .get(`/api/knowledge-bases/${createResponse.body.data.id}/chunks`)
      .query({
        search: "FAQ"
      })
      .expect(200);
    expect(chunksAfterDelete.body.data.total).toBe(0);

    const deleteBase = await request(app.getHttpServer())
      .delete(`/api/knowledge-bases/${createResponse.body.data.id}`)
      .expect(200);
    expect(deleteBase.body.data.alreadyDeleted).toBe(false);

    const listAfterDelete = await request(app.getHttpServer())
      .get("/api/knowledge-bases")
      .query({
        search: uniqueName("知识库")
      })
      .expect(200);
    expect(listAfterDelete.body.data.total).toBe(0);
  });

  it("keeps validation and duplicate-name errors in the unified ApiResponse shape", async () => {
    const invalid = await request(app.getHttpServer())
      .post("/api/knowledge-bases")
      .send({
        name: " "
      })
      .expect(400);
    expect(invalid.body.code).toBe(400);
    expect(invalid.body.message).toBe("Validation failed");

    const name = uniqueName("重复知识库");
    await request(app.getHttpServer())
      .post("/api/knowledge-bases")
      .send({
        name,
        productLine: "重复HTTP产品线",
        createdBy
      })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post("/api/knowledge-bases")
      .send({
        name,
        productLine: "重复HTTP产品线",
        createdBy
      })
      .expect(400);
    expect(duplicate.body).toEqual({
      code: 400,
      message: `Active GEO knowledge base already exists: ${name}`,
      data: null
    });
  });

  it("rejects text import into a deleted knowledge base", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/knowledge-bases")
      .send({
        name: uniqueName("删除后导入"),
        productLine: "删除后导入产品线",
        createdBy
      })
      .expect(201);
    await request(app.getHttpServer()).delete(`/api/knowledge-bases/${created.body.data.id}`);

    const response = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${created.body.data.id}/text-import`)
      .send({
        title: "已删除知识库",
        content: "已删除知识库不能再导入用于 GEO 内容生成的知识片段。",
        createdBy
      })
      .expect(400);

    expect(response.body.message).toBe(
      `Deleted GEO knowledge base cannot accept text import: ${created.body.data.id}`
    );
  });
});
