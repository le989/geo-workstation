import { rm, unlink } from "node:fs/promises";
import { join } from "node:path";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CompanyStatus,
  CompanyType,
  DepartmentStatus,
  KnowledgeMaterialType,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  MembershipRole,
  ParseStatus,
  UserRole,
  UserStatus,
  Visibility,
  type Company,
  type Department,
  type User
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { KnowledgeFileParserService } from "../src/modules/geo-knowledge/knowledge-file-parser.service";
import { KnowledgeFilesService } from "../src/modules/geo-knowledge/knowledge-files.service";
import { KnowledgeBasesService } from "../src/modules/geo-knowledge/knowledge-bases.service";
import { KnowledgeChunksService } from "../src/modules/geo-knowledge/knowledge-chunks.service";
import { LocalFileStorageService } from "../src/modules/geo-knowledge/local-file-storage.service";
import type { ResourceAccessContext } from "../src/modules/auth/auth-policy";
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
  let knowledgeChunksService: KnowledgeChunksService;
  let createdBy: string;
  let companyA: Company;
  let companyB: Company;
  let companyAdmin: User;
  let operatorA: User;
  let operatorB: User;
  let viewerA: User;
  let allowedDepartment: Department;
  let blockedDepartment: Department;
  let otherCompanyDepartment: Department;

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
    knowledgeChunksService = new KnowledgeChunksService(prisma as unknown as PrismaService);
    knowledgeFilesService = new KnowledgeFilesService(
      prisma as unknown as PrismaService,
      storage,
      parser
    );

    companyA = await prisma.company.create({
      data: {
        name: `Knowledge File Company A ${runId}`,
        code: `knowledge-file-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `Knowledge File Company B ${runId}`,
        code: `knowledge-file-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyAdmin = await prisma.user.create({
      data: {
        email: `knowledge-file-company-admin-${runId}@example.com`,
        name: "Auth 4B Knowledge File Company Admin",
        role: UserRole.company_admin,
        status: UserStatus.active
      }
    });
    operatorA = await prisma.user.create({
      data: {
        email: `knowledge-file-operator-a-${runId}@example.com`,
        name: "Auth 4B Knowledge File Operator A",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    operatorB = await prisma.user.create({
      data: {
        email: `knowledge-file-operator-b-${runId}@example.com`,
        name: "Auth 4B Knowledge File Operator B",
        role: UserRole.operator,
        status: UserStatus.active
      }
    });
    viewerA = await prisma.user.create({
      data: {
        email: `knowledge-file-viewer-a-${runId}@example.com`,
        name: "KB-1 Knowledge File Viewer A",
        role: UserRole.viewer,
        status: UserStatus.active
      }
    });
    allowedDepartment = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `KB-1 Allowed Department ${runId}`,
        code: `kb1-allowed-${runId}`,
        status: DepartmentStatus.active
      }
    });
    blockedDepartment = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `KB-1 Blocked Department ${runId}`,
        code: `kb1-blocked-${runId}`,
        status: DepartmentStatus.active
      }
    });
    otherCompanyDepartment = await prisma.department.create({
      data: {
        companyId: companyB.id,
        name: `KB-1 Other Department ${runId}`,
        code: `kb1-other-${runId}`,
        status: DepartmentStatus.active
      }
    });

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

  function contextFor(
    user: User,
    company: Company,
    role: MembershipRole,
    isPlatformAdmin = false,
    department?: Department | null
  ): ResourceAccessContext {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isPlatformAdmin
      },
      currentCompany: {
        id: company.id,
        name: company.name,
        code: company.code,
        role,
        isDefault: true,
        status: company.status,
        department: department
          ? {
              id: department.id,
              name: department.name,
              code: department.code,
              status: department.status
            }
          : null,
        accessibleModules: ["knowledge-bases"]
      },
      currentMembership: {
        companyId: company.id,
        role,
        isDefault: true,
        isPlatformAdmin,
        departmentId: department?.id ?? null,
        accessibleModules: ["knowledge-bases"]
      }
    };
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
    expect(txt.knowledgeFile).not.toHaveProperty("storagePath");
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
    expect(result.errorMessage).toBe("资料解析失败，请检查文件内容后重试。");
    expect(result.knowledgeFile).not.toHaveProperty("storagePath");
    expect(result.knowledgeFile.errorMessage).toBe("资料解析失败，请检查文件内容后重试。");

    const stored = await prisma.knowledgeFile.findUnique({
      where: {
        id: result.knowledgeFile.id
      }
    });
    expect(stored?.parseStatus).toBe(ParseStatus.failed);
    expect(stored?.errorMessage).toBe("资料解析失败，请检查文件内容后重试。");
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
    expect(list.items[0]).not.toHaveProperty("storagePath");

    const detail = await knowledgeFilesService.getDetail(uploaded.knowledgeFile.id);
    expect(detail.chunksCount).toBe(uploaded.createdChunksCount);
    expect(detail.latestChunks[0]?.fileId).toBe(uploaded.knowledgeFile.id);
    expect(detail.knowledgeFile).not.toHaveProperty("storagePath");

    const reparsed = await knowledgeFilesService.reparse(uploaded.knowledgeFile.id, {
      materialType: "reparsed_file",
      tags: ["重试"]
    });
    expect(reparsed.parseStatus).toBe(ParseStatus.succeeded);
    expect(reparsed.knowledgeFile).not.toHaveProperty("storagePath");
    expect(reparsed.createdChunks[0]?.materialType).toBe("reparsed_file");
    expect(reparsed.createdChunks[0]?.tags).toEqual(["重试"]);

    const storedUploaded = await prisma.knowledgeFile.findUniqueOrThrow({
      where: {
        id: uploaded.knowledgeFile.id
      }
    });
    await unlink(storedUploaded.storagePath ?? "");
    const missing = await knowledgeFilesService.reparse(uploaded.knowledgeFile.id, {
      materialType: "missing_file"
    });
    expect(missing.parseStatus).toBe(ParseStatus.failed);
    expect(missing.knowledgeFile).not.toHaveProperty("storagePath");
    expect(missing.errorMessage).toBe("文件不存在或无法读取，请重新上传资料。");
    expect(missing.errorMessage).not.toContain(storageRoot);
    expect(missing.errorMessage).not.toContain("storagePath");

    const storedMissing = await prisma.knowledgeFile.findUniqueOrThrow({
      where: {
        id: uploaded.knowledgeFile.id
      }
    });
    expect(storedMissing.errorMessage).toBe("文件不存在或无法读取，请重新上传资料。");
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

  it("stores material metadata, filters files, and creates manual material records", async () => {
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const companyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: `KB-1 Metadata Base ${runId}`,
        status: "active",
        createdById: companyAdmin.id
      }
    });

    const uploaded = await knowledgeFilesService.upload(
      companyBase.id,
      uploadFile("product.txt", "产品资料正文包含产品能力、选型参数和 GEO 内容引用事实。"),
      {
        title: "产品资料标题",
        materialType: KnowledgeMaterialType.product_material,
        applicableModules: ["geo-content", "internal-search"],
        sourceDescription: "官网产品资料",
        trustLevel: KnowledgeTrustLevel.high,
        reviewStatus: KnowledgeReviewStatus.approved,
        tags: ["产品", "GEO"]
      },
      companyAdminContext
    );

    expect(uploaded.knowledgeFile).toMatchObject({
      title: "产品资料标题",
      materialType: KnowledgeMaterialType.product_material,
      applicableModules: ["geo-content", "internal-search"],
      sourceDescription: "官网产品资料",
      trustLevel: KnowledgeTrustLevel.high,
      reviewStatus: KnowledgeReviewStatus.approved,
      sourceType: "upload"
    });
    expect(uploaded.knowledgeFile).not.toHaveProperty("storagePath");
    expect(uploaded.createdChunks[0]).toMatchObject({
      fileId: uploaded.knowledgeFile.id,
      materialType: KnowledgeMaterialType.product_material,
      tags: ["产品", "GEO"]
    });

    const manual = await knowledgeFilesService.createManualMaterial(
      companyBase.id,
      {
        title: "手动售后资料",
        materialType: KnowledgeMaterialType.aftersales_material,
        applicableModules: ["aftersales-qa", "internal-search"],
        sourceDescription: "售后工程师整理",
        trustLevel: KnowledgeTrustLevel.medium,
        reviewStatus: KnowledgeReviewStatus.pending,
        allowedDepartmentIds: [allowedDepartment.id],
        content: "手动录入的售后资料会生成资料记录，并同步生成可查看和编辑的知识片段。"
      },
      companyAdminContext
    );

    expect(manual.parseStatus).toBe(ParseStatus.succeeded);
    expect(manual.knowledgeFile).toMatchObject({
      fileType: "manual",
      sourceType: "manual",
      title: "手动售后资料",
      materialType: KnowledgeMaterialType.aftersales_material,
      reviewStatus: KnowledgeReviewStatus.pending,
      allowedDepartmentIds: [allowedDepartment.id]
    });
    expect(manual.knowledgeFile).not.toHaveProperty("storagePath");
    expect(manual.createdChunksCount).toBe(1);
    expect(manual.createdChunks[0]?.fileId).toBe(manual.knowledgeFile.id);

    const filtered = await knowledgeFilesService.findMany(
      companyBase.id,
      {
        materialType: KnowledgeMaterialType.product_material,
        reviewStatus: KnowledgeReviewStatus.approved,
        trustLevel: KnowledgeTrustLevel.high,
        applicableModule: "geo-content"
      },
      companyAdminContext
    );
    expect(filtered.total).toBe(1);
    expect(filtered.items[0]?.id).toBe(uploaded.knowledgeFile.id);

    const updated = await knowledgeFilesService.updateMetadata(
      uploaded.knowledgeFile.id,
      {
        title: "更新后的产品资料标题",
        reviewStatus: KnowledgeReviewStatus.disabled,
        applicableModules: ["geo-analysis"]
      },
      companyAdminContext
    );
    expect(updated).toMatchObject({
      title: "更新后的产品资料标题",
      reviewStatus: KnowledgeReviewStatus.disabled,
      applicableModules: ["geo-analysis"]
    });

    await expect(
      knowledgeFilesService.updateMetadata(
        uploaded.knowledgeFile.id,
        {
          allowedDepartmentIds: [otherCompanyDepartment.id],
          materialType: KnowledgeMaterialType.aftersales_material
        },
        companyAdminContext
      )
    ).rejects.toThrow("allowedDepartmentIds must belong to current company");
  });

  it("limits aftersales materials by allowed departments while keeping admin bypass", async () => {
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);
    const allowedOperatorContext = contextFor(
      operatorA,
      companyA,
      MembershipRole.operator,
      false,
      allowedDepartment
    );
    const blockedOperatorContext = contextFor(
      operatorA,
      companyA,
      MembershipRole.operator,
      false,
      blockedDepartment
    );
    const companyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: `KB-1 Aftersales Base ${runId}`,
        status: "active",
        createdById: companyAdmin.id
      }
    });
    const aftersales = await knowledgeFilesService.createManualMaterial(
      companyBase.id,
      {
        title: "受限售后资料",
        materialType: KnowledgeMaterialType.aftersales_material,
        applicableModules: ["aftersales-qa"],
        trustLevel: KnowledgeTrustLevel.high,
        reviewStatus: KnowledgeReviewStatus.approved,
        allowedDepartmentIds: [allowedDepartment.id],
        content: "仅允许指定售后部门查看的售后资料，普通部门不应看到这条资料。"
      },
      companyAdminContext
    );

    await expect(
      knowledgeFilesService.getDetail(aftersales.knowledgeFile.id, companyAdminContext)
    ).resolves.toMatchObject({
      knowledgeFile: {
        id: aftersales.knowledgeFile.id
      }
    });
    await expect(
      knowledgeFilesService.getDetail(aftersales.knowledgeFile.id, allowedOperatorContext)
    ).resolves.toMatchObject({
      knowledgeFile: {
        id: aftersales.knowledgeFile.id
      }
    });
    await expect(
      knowledgeFilesService.getDetail(aftersales.knowledgeFile.id, blockedOperatorContext)
    ).rejects.toBeInstanceOf(NotFoundException);

    const allowedFiles = await knowledgeFilesService.findMany(
      companyBase.id,
      {
        materialType: KnowledgeMaterialType.aftersales_material
      },
      allowedOperatorContext
    );
    const blockedFiles = await knowledgeFilesService.findMany(
      companyBase.id,
      {
        materialType: KnowledgeMaterialType.aftersales_material
      },
      blockedOperatorContext
    );
    expect(allowedFiles.total).toBe(1);
    expect(blockedFiles.total).toBe(0);

    const allowedChunks = await knowledgeChunksService.findMany(
      companyBase.id,
      {},
      allowedOperatorContext
    );
    const blockedChunks = await knowledgeChunksService.findMany(
      companyBase.id,
      {},
      blockedOperatorContext
    );
    expect(allowedChunks.items.some((chunk) => chunk.fileId === aftersales.knowledgeFile.id)).toBe(
      true
    );
    expect(blockedChunks.items.some((chunk) => chunk.fileId === aftersales.knowledgeFile.id)).toBe(
      false
    );
  });

  it("keeps operator-created materials pending and prevents viewer writes", async () => {
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const viewerContext = contextFor(viewerA, companyA, MembershipRole.viewer);
    const privateBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `KB-1 Operator Private Base ${runId}`,
        status: "active",
        createdById: operatorA.id
      }
    });

    await expect(
      knowledgeFilesService.upload(
        privateBase.id,
        uploadFile("operator.txt", "运营人员不能直接把资料审核为已通过。"),
        {
          reviewStatus: KnowledgeReviewStatus.approved
        },
        operatorContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    const created = await knowledgeFilesService.upload(
      privateBase.id,
      uploadFile("operator-pending.txt", "运营人员上传资料默认进入待审核状态。"),
      {},
      operatorContext
    );
    expect(created.knowledgeFile.reviewStatus).toBe(KnowledgeReviewStatus.pending);

    const platformBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PLATFORM,
        name: `KB-1 Viewer Readonly Base ${runId}`,
        status: "active",
        createdById: companyAdmin.id,
        chunks: {
          create: {
            companyId: companyA.id,
            title: "Viewer Readonly Chunk",
            content: "viewer 即使可以看到资料，也不能编辑知识片段内容。",
            sourceType: "manual"
          }
        }
      },
      include: {
        chunks: true
      }
    });

    await expect(
      knowledgeChunksService.update(
        platformBase.chunks[0].id,
        {
          content: "viewer 尝试写入的新内容应该被拒绝。"
        },
        viewerContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("enforces knowledge file permissions through parent knowledge base access", async () => {
    const operatorContext = contextFor(operatorA, companyA, MembershipRole.operator);
    const companyAdminContext = contextFor(companyAdmin, companyA, MembershipRole.company_admin);

    const companyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.COMPANY,
        name: `Auth 4B File Company Base ${runId}`,
        status: "active",
        createdById: companyAdmin.id
      }
    });
    const privateBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyA.id,
        visibility: Visibility.PRIVATE,
        name: `Auth 4B File Private Base ${runId}`,
        status: "active",
        createdById: operatorA.id
      }
    });
    const otherCompanyBase = await prisma.knowledgeBase.create({
      data: {
        companyId: companyB.id,
        visibility: Visibility.COMPANY,
        name: `Auth 4B File Other Company Base ${runId}`,
        status: "active",
        createdById: operatorB.id
      }
    });
    const otherCompanyFile = await prisma.knowledgeFile.create({
      data: {
        companyId: companyB.id,
        knowledgeBaseId: otherCompanyBase.id,
        fileName: "other.txt",
        fileType: "txt",
        parseStatus: ParseStatus.succeeded,
        createdById: operatorB.id
      }
    });

    await expect(
      knowledgeFilesService.upload(
        companyBase.id,
        uploadFile("public.txt", "公共知识库不允许运营人员直接上传文件。"),
        {},
        operatorContext
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    const uploaded = await knowledgeFilesService.upload(
      privateBase.id,
      uploadFile("private.txt", "私有知识库允许运营人员上传自己的 GEO 资料。"),
      {
        createdBy: operatorB.id
      },
      operatorContext
    );
    const uploadedRecord = await prisma.knowledgeFile.findUniqueOrThrow({
      where: {
        id: uploaded.knowledgeFile.id
      }
    });
    expect(uploadedRecord.companyId).toBe(companyA.id);
    expect(uploadedRecord.createdById).toBe(operatorA.id);

    await expect(
      knowledgeFilesService.getDetail(otherCompanyFile.id, operatorContext)
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      knowledgeFilesService.reparse(otherCompanyFile.id, {}, operatorContext)
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      knowledgeFilesService.reparse(uploaded.knowledgeFile.id, {}, operatorContext)
    ).resolves.toMatchObject({
      parseStatus: ParseStatus.succeeded
    });

    await expect(
      knowledgeFilesService.softDelete(uploaded.knowledgeFile.id, companyAdminContext)
    ).resolves.toMatchObject({
      deleted: true,
      alreadyDeleted: false
    });
  });
});
