import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { GeoPromptType, UserIntent, UserRole, UserStatus } from "@prisma/client";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("GeoPromptsController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `geo-prompts-controller-${runId}@example.com`,
        name: "Phase 2B GEO Prompt API Operator",
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

  function uniquePrompt(label: string): string {
    return `Phase 2B API ${label} ${runId}`;
  }

  it("creates and lists GEO prompts with the unified ApiResponse envelope", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/geo-prompts")
      .send({
        type: GeoPromptType.base,
        promptText: `  ${uniquePrompt("创建")}  `,
        baseWord: " 激光测距传感器 ",
        productLine: " 激光测距传感器 ",
        userIntent: UserIntent.selection,
        priority: "2",
        targetModels: ["deepseek-chat"],
        trackEnabled: "true",
        createdBy
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        promptText: uniquePrompt("创建"),
        type: GeoPromptType.base,
        priority: 2,
        trackEnabled: true
      }
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/geo-prompts")
      .query({
        search: uniquePrompt("创建"),
        page: "1",
        pageSize: "10",
        trackEnabled: "true"
      })
      .expect(200);

    expect(listResponse.body.code).toBe(0);
    expect(listResponse.body.data.total).toBe(1);
    expect(listResponse.body.data.items[0].id).toBe(createResponse.body.data.id);
  });

  it("returns unified errors for duplicate GEO prompt text", async () => {
    const promptText = uniquePrompt("重复响应");
    await request(app.getHttpServer())
      .post("/api/geo-prompts")
      .send({
        type: GeoPromptType.brand,
        promptText,
        userIntent: UserIntent.brand_verification,
        createdBy
      })
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post("/api/geo-prompts")
      .send({
        type: GeoPromptType.scene,
        promptText,
        userIntent: UserIntent.application_solution,
        createdBy
      })
      .expect(400);

    expect(duplicateResponse.body).toEqual({
      code: 400,
      message: `Active GEO prompt already exists: ${promptText}`,
      data: null
    });
  });

  it("bulk imports GEO prompts and exports filtered CSV through ApiResponse", async () => {
    const importedPrompt = uniquePrompt("批量 HTTP");
    const importResponse = await request(app.getHttpServer())
      .post("/api/geo-prompts/bulk-import")
      .send({
        rows: [
          {
            type: GeoPromptType.distilled,
            promptText: importedPrompt,
            userIntent: UserIntent.selection,
            productLine: "HTTP批量导入"
          },
          {
            type: GeoPromptType.scene,
            promptText: importedPrompt,
            userIntent: UserIntent.application_solution
          },
          {
            type: "base",
            promptText: ""
          }
        ]
      })
      .expect(201);

    expect(importResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        totalRows: 3,
        successCount: 1,
        duplicateCount: 1,
        failedCount: 1,
        skippedCount: 2
      }
    });

    const exportResponse = await request(app.getHttpServer())
      .get("/api/geo-prompts/export")
      .query({
        productLine: "HTTP批量导入"
      })
      .expect(200);

    expect(exportResponse.body.code).toBe(0);
    expect(exportResponse.body.data).toContain("id,type,baseWord,promptText");
    expect(exportResponse.body.data).toContain(importedPrompt);
  });

  it("updates and soft deletes GEO prompts through unified responses", async () => {
    const promptText = uniquePrompt("删除 HTTP");
    const created = await request(app.getHttpServer())
      .post("/api/geo-prompts")
      .send({
        type: GeoPromptType.base,
        promptText,
        userIntent: UserIntent.selection,
        createdBy
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/geo-prompts/${created.body.data.id}`)
      .send({
        priority: "5",
        latestCoverageStatus: "mentioned"
      })
      .expect(200);
    expect(updated.body.data.priority).toBe(5);
    expect(updated.body.data.latestCoverageStatus).toBe("mentioned");

    const deleted = await request(app.getHttpServer())
      .delete(`/api/geo-prompts/${created.body.data.id}`)
      .expect(200);
    expect(deleted.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        id: created.body.data.id,
        deleted: true,
        alreadyDeleted: false
      }
    });

    const listAfterDelete = await request(app.getHttpServer())
      .get("/api/geo-prompts")
      .query({
        search: promptText
      })
      .expect(200);
    expect(listAfterDelete.body.data.total).toBe(0);
  });
});
