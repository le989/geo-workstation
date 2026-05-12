import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { GeoPromptType, UserIntent, UserRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoContentController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `content-controller-${runId}@example.com`,
        name: "Phase 2G GEO Content API Operator",
        role: UserRole.content_editor,
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

  function unique(label: string): string {
    return `Phase 2G API ${label} ${runId}`;
  }

  async function createGeoPrompt(label: string): Promise<string> {
    const prompt = await prisma.geoPrompt.create({
      data: {
        type: GeoPromptType.distilled,
        baseWord: "激光测距传感器",
        promptText: unique(label),
        productLine: "激光测距传感器",
        scenario: "选型",
        userIntent: UserIntent.selection,
        priority: 3,
        createdBy: {
          connect: {
            id: createdBy
          }
        }
      }
    });

    return prompt.id;
  }

  it("runs the content task and content item API loop through ApiResponse", async () => {
    const promptId = await createGeoPrompt("内容闭环提示词");

    const createResponse = await request(app.getHttpServer())
      .post("/api/content-tasks")
      .send({
        name: ` ${unique("内容任务")} `,
        productLine: "激光测距传感器",
        generationType: "faq",
        targetModel: "deepseek-chat",
        geoPromptIds: [promptId],
        createdBy
      })
      .expect(201);
    expect(createResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        task: {
          name: unique("内容任务"),
          status: "succeeded",
          provider: "mock",
          model: "mock-content-v1"
        }
      }
    });
    expect(createResponse.body.data.items).toHaveLength(1);

    const taskId = createResponse.body.data.task.id;
    const itemId = createResponse.body.data.items[0].id;
    const listTasks = await request(app.getHttpServer())
      .get("/api/content-tasks")
      .query({
        status: "succeeded",
        generationType: "faq",
        page: "1",
        pageSize: "10"
      })
      .expect(200);
    expect(listTasks.body.data.total).toBeGreaterThan(0);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/content-tasks/${taskId}`)
      .expect(200);
    expect(detailResponse.body.data.items).toHaveLength(1);
    expect(detailResponse.body.data.prompts[0].id).toBe(promptId);

    const listItems = await request(app.getHttpServer())
      .get("/api/content-items")
      .query({
        taskId,
        status: "draft",
        page: "1",
        pageSize: "10"
      })
      .expect(200);
    expect(listItems.body.data.total).toBe(1);

    const patchResponse = await request(app.getHttpServer())
      .patch(`/api/content-items/${itemId}`)
      .send({
        title: "API 编辑后的 GEO FAQ",
        body: "API 编辑后的 GEO FAQ 内容，保留提示词、产品能力和可被 AI 摘取的结构化答案。",
        status: "published_ready"
      })
      .expect(200);
    expect(patchResponse.body.data.status).toBe("published_ready");

    const markdownResponse = await request(app.getHttpServer())
      .get(`/api/content-items/${itemId}/export`)
      .expect(200);
    expect(markdownResponse.body).toMatchObject({
      code: 0,
      message: "ok"
    });
    expect(markdownResponse.body.data).toContain("# API 编辑后的 GEO FAQ");

    const retryResponse = await request(app.getHttpServer())
      .post(`/api/content-tasks/${taskId}/retry`)
      .send({})
      .expect(201);
    expect(retryResponse.body.data.items).toHaveLength(1);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/content-items/${itemId}`)
      .expect(200);
    expect(deleteResponse.body.data.alreadyDeleted).toBe(false);
  });

  it("keeps validation errors in the unified ApiResponse shape", async () => {
    const invalid = await request(app.getHttpServer())
      .post("/api/content-tasks")
      .send({
        name: " ",
        generationType: "faq",
        geoPromptIds: []
      })
      .expect(400);
    expect(invalid.body.code).toBe(400);
    expect(invalid.body.message).toBe("Validation failed");
    expect(invalid.body.data.errors.length).toBeGreaterThan(0);
  });
});
