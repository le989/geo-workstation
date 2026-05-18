import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  MembershipRole,
  MembershipStatus,
  ProductLineStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { Test } from "@nestjs/testing";
import { readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { hashPassword } from "../src/modules/auth/utils/password-hash.util";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("Company and product line management", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let company: { id: string; name: string; code: string };
  let otherCompany: { id: string; name: string; code: string };
  let platformAdmin: { id: string; email: string; password: string };
  let companyAdmin: { id: string; email: string; password: string };
  let operator: { id: string; email: string; password: string };
  let viewer: { id: string; email: string; password: string };
  let platformToken: string;
  let companyAdminToken: string;
  let operatorToken: string;
  let viewerToken: string;

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);

    return response.body.data.token as string;
  };

  const authorized = (token: string, companyId = company.id) => ({
    Authorization: `Bearer ${token}`,
    "X-Company-Id": companyId
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = resolveSafeDatabaseUrl();
    process.env.JWT_SECRET = "company-product-line-management-test-secret";
    process.env.BYPASS_AUTH_FOR_TESTS = "false";

    prisma = createPrismaClient();
    await prisma.$connect();

    company = await prisma.company.create({
      data: {
        name: `Management Company ${runId}`,
        code: `management-company-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    otherCompany = await prisma.company.create({
      data: {
        name: `Management Other Company ${runId}`,
        code: `management-other-company-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });

    platformAdmin = {
      id: "",
      email: `company-platform-${runId}@example.com`,
      password: "PlatformPassword123!"
    };
    companyAdmin = {
      id: "",
      email: `company-admin-${runId}@example.com`,
      password: "CompanyAdminPassword123!"
    };
    operator = {
      id: "",
      email: `company-operator-${runId}@example.com`,
      password: "OperatorPassword123!"
    };
    viewer = {
      id: "",
      email: `company-viewer-${runId}@example.com`,
      password: "ViewerPassword123!"
    };

    for (const account of [
      { user: platformAdmin, role: UserRole.platform_admin, membershipRole: MembershipRole.platform_admin },
      { user: companyAdmin, role: UserRole.company_admin, membershipRole: MembershipRole.company_admin },
      { user: operator, role: UserRole.operator, membershipRole: MembershipRole.operator },
      { user: viewer, role: UserRole.viewer, membershipRole: MembershipRole.viewer }
    ]) {
      const created = await prisma.user.create({
        data: {
          email: account.user.email,
          name: account.user.email,
          role: account.role,
          status: UserStatus.active,
          passwordHash: await hashPassword(account.user.password),
          memberships: {
            create: {
              companyId: company.id,
              role: account.membershipRole,
              status: MembershipStatus.active,
              isDefault: true
            }
          }
        }
      });
      account.user.id = created.id;
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    configureApiApp(app);
    await app.init();

    platformToken = await login(platformAdmin.email, platformAdmin.password);
    companyAdminToken = await login(companyAdmin.email, companyAdmin.password);
    operatorToken = await login(operator.email, operator.password);
    viewerToken = await login(viewer.email, viewer.password);
  });

  afterAll(async () => {
    process.env.BYPASS_AUTH_FOR_TESTS = "true";
    await app?.close();
    await prisma?.$disconnect();
  });

  it("allows platform admins to create, edit, access, and disable companies without deleting them", async () => {
    const createdCode = `created-company-${runId}`;
    const createResponse = await request(app.getHttpServer())
      .post("/api/companies")
      .set(authorized(platformToken))
      .send({
        name: `Created Company ${runId}`,
        code: createdCode,
        type: CompanyType.customer
      })
      .expect(201);

    const createdCompany = createResponse.body.data;
    expect(createdCompany).toMatchObject({
      name: `Created Company ${runId}`,
      code: createdCode,
      type: CompanyType.customer,
      status: CompanyStatus.active
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/companies")
      .set(authorized(platformToken))
      .expect(200);
    expect(listResponse.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdCompany.id })])
    );

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set(authorized(platformToken, createdCompany.id))
      .expect(200)
      .expect((response) => {
        expect(response.body.data.currentCompany).toMatchObject({
          id: createdCompany.id,
          role: MembershipRole.platform_admin
        });
      });

    const updatedCode = `updated-company-${runId}`;
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/companies/${createdCompany.id}`)
      .set(authorized(platformToken))
      .send({
        name: `Updated Company ${runId}`,
        code: updatedCode,
        type: CompanyType.internal
      })
      .expect(200);
    expect(updateResponse.body.data).toMatchObject({
      id: createdCompany.id,
      name: `Updated Company ${runId}`,
      code: updatedCode,
      type: CompanyType.internal
    });

    const statusResponse = await request(app.getHttpServer())
      .patch(`/api/companies/${createdCompany.id}/status`)
      .set(authorized(platformToken))
      .send({ status: CompanyStatus.disabled })
      .expect(200);
    expect(statusResponse.body.data.status).toBe(CompanyStatus.disabled);

    const stored = await prisma.company.findUniqueOrThrow({
      where: {
        id: createdCompany.id
      }
    });
    expect(stored.status).toBe(CompanyStatus.disabled);
  });

  it("rejects company writes from non-platform admins and duplicate company codes", async () => {
    for (const token of [companyAdminToken, operatorToken, viewerToken]) {
      await request(app.getHttpServer())
        .post("/api/companies")
        .set(authorized(token))
        .send({
          name: `Forbidden Company ${runId}`,
          code: `forbidden-company-${runId}`,
          type: CompanyType.customer
        })
        .expect(403);
    }

    await request(app.getHttpServer())
      .post("/api/companies")
      .set(authorized(platformToken))
      .send({
        name: "Duplicate Company",
        code: company.code,
        type: CompanyType.customer
      })
      .expect(400);
  });

  it("allows platform and company admins to manage product lines in the current company", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/product-lines")
      .set(authorized(companyAdminToken))
      .send({
        name: `Company Admin Product Line ${runId}`,
        code: `company-admin-product-line-${runId}`
      })
      .expect(201);
    expect(createResponse.body.data).toMatchObject({
      companyId: company.id,
      status: ProductLineStatus.active
    });

    const productLineId = createResponse.body.data.id as string;
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/product-lines/${productLineId}`)
      .set(authorized(platformToken))
      .send({
        name: `Updated Product Line ${runId}`,
        code: `updated-product-line-${runId}`
      })
      .expect(200);
    expect(updateResponse.body.data).toMatchObject({
      id: productLineId,
      name: `Updated Product Line ${runId}`,
      code: `updated-product-line-${runId}`
    });

    const statusResponse = await request(app.getHttpServer())
      .patch(`/api/product-lines/${productLineId}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: ProductLineStatus.disabled })
      .expect(200);
    expect(statusResponse.body.data.status).toBe(ProductLineStatus.disabled);

    const stored = await prisma.productLine.findUniqueOrThrow({
      where: {
        id: productLineId
      }
    });
    expect(stored.status).toBe(ProductLineStatus.disabled);
  });

  it("rejects product line writes from operators and viewers", async () => {
    for (const token of [operatorToken, viewerToken]) {
      await request(app.getHttpServer())
        .post("/api/product-lines")
        .set(authorized(token))
        .send({
          name: `Forbidden Product Line ${runId}`,
          code: `forbidden-product-line-${runId}`
        })
        .expect(403);
    }
  });

  it("keeps product lines isolated by current company and rejects duplicate codes per company", async () => {
    const sharedCode = `shared-product-line-${runId}`;
    const currentCompanyResponse = await request(app.getHttpServer())
      .post("/api/product-lines")
      .set(authorized(platformToken))
      .send({
        name: `Current Company Product Line ${runId}`,
        code: sharedCode
      })
      .expect(201);
    const otherCompanyResponse = await request(app.getHttpServer())
      .post("/api/product-lines")
      .set(authorized(platformToken, otherCompany.id))
      .send({
        name: `Other Company Product Line ${runId}`,
        code: sharedCode
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/product-lines")
      .set(authorized(platformToken))
      .send({
        name: `Duplicate Product Line ${runId}`,
        code: sharedCode
      })
      .expect(400);

    const listResponse = await request(app.getHttpServer())
      .get("/api/product-lines")
      .set(authorized(platformToken))
      .expect(200);

    const ids = listResponse.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).toContain(currentCompanyResponse.body.data.id);
    expect(ids).not.toContain(otherCompanyResponse.body.data.id);
  });
});

function resolveSafeDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL || readDatabaseUrlFromRootEnv();
  const url = new URL(raw);
  const databaseName = url.pathname.replace(/^\//, "");

  if (databaseName === "geo_workstation_clean") {
    url.pathname = `/${process.env.GEO_TEST_DATABASE_NAME || "geo_workstation"}`;
  }

  if (url.pathname.replace(/^\//, "") === "geo_workstation_clean") {
    throw new Error("Refusing to run write tests against geo_workstation_clean.");
  }

  return url.toString();
}

function readDatabaseUrlFromRootEnv(): string {
  const envPath = path.resolve(process.cwd(), "../../.env");
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith("DATABASE_URL="));

  if (!line) {
    throw new Error("DATABASE_URL is required for company/product-line tests.");
  }

  return line.slice("DATABASE_URL=".length).replace(/^['"]|['"]$/g, "");
}
