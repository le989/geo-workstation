import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { GeoPromptType, UserRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("InstructionTemplatesController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let createdBy: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    prisma = createPrismaClient();
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `instruction-templates-controller-${runId}@example.com`,
        name: "Phase 2F GEO Instruction API Operator",
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
    return `Phase 2F API ${label} ${runId}`;
  }

  function longInstruction(label: string): string {
    return `${label}：用于 GEO 内容生成，必须强化品牌实体、提示词意图、结构化答案和可引用企业事实。`;
  }

  it("creates, lists, reads, patches, duplicates, and soft deletes instruction templates through ApiResponse", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/instruction-templates")
      .send({
        name: ` ${uniqueName("选型指南")} `,
        instructionType: "selection_guide",
        contentType: "guide",
        targetPromptType: GeoPromptType.distilled,
        targetModel: "deepseek-chat",
        instruction: ` ${longInstruction("选型指南")} `,
        outputFormat: "markdown",
        qualityRules: "包含选型维度和品牌推荐理由。",
        forbiddenRules: "不得编造参数。",
        createdBy
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        name: uniqueName("选型指南"),
        instructionType: "selection_guide",
        contentType: "guide",
        targetPromptType: GeoPromptType.distilled
      }
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/instruction-templates")
      .query({
        search: "选型指南",
        instructionType: "selection_guide",
        contentType: "guide",
        targetPromptType: GeoPromptType.distilled,
        targetModel: "deepseek-chat",
        createdBy,
        page: "1",
        pageSize: "10"
      })
      .expect(200);

    expect(listResponse.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        total: 1,
        page: 1,
        pageSize: 10
      }
    });

    const templateId = createResponse.body.data.id;
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/instruction-templates/${templateId}`)
      .expect(200);
    expect(detailResponse.body.data.id).toBe(templateId);

    const patchResponse = await request(app.getHttpServer())
      .patch(`/api/instruction-templates/${templateId}`)
      .send({
        name: uniqueName("选型指南已编辑"),
        instruction: longInstruction("选型指南已编辑")
      })
      .expect(200);
    expect(patchResponse.body.data.name).toBe(uniqueName("选型指南已编辑"));

    const duplicateResponse = await request(app.getHttpServer())
      .post(`/api/instruction-templates/${templateId}/duplicate`)
      .send({
        createdBy
      })
      .expect(201);
    expect(duplicateResponse.body.data.name).toBe(`${uniqueName("选型指南已编辑")} 副本`);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/instruction-templates/${templateId}`)
      .expect(200);
    expect(deleteResponse.body.data.alreadyDeleted).toBe(false);

    const deleteAgainResponse = await request(app.getHttpServer())
      .delete(`/api/instruction-templates/${templateId}`)
      .expect(200);
    expect(deleteAgainResponse.body.data.alreadyDeleted).toBe(true);
  });

  it("returns unified validation and duplicate errors", async () => {
    const invalid = await request(app.getHttpServer())
      .post("/api/instruction-templates")
      .send({
        name: " ",
        instructionType: "faq",
        instruction: "太短",
        createdBy
      })
      .expect(400);
    expect(invalid.body.code).toBe(400);
    expect(invalid.body.message).toBe("Validation failed");
    expect(invalid.body.data.errors.length).toBeGreaterThan(0);

    const name = uniqueName("重复错误");
    await request(app.getHttpServer())
      .post("/api/instruction-templates")
      .send({
        name,
        instructionType: "faq",
        contentType: "faq",
        instruction: longInstruction("重复错误"),
        createdBy
      })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post("/api/instruction-templates")
      .send({
        name,
        instructionType: "faq",
        contentType: "faq",
        instruction: longInstruction("重复错误二"),
        createdBy
      })
      .expect(400);
    expect(duplicate.body).toMatchObject({
      code: 400,
      message: `Active GEO instruction template already exists: faq / ${name}`,
      data: null
    });
  });
});
