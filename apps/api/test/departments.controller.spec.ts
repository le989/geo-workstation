import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  MembershipStatus,
  UserIntent,
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

describe("Department module permissions", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let company: { id: string; name: string; code: string };
  let otherCompany: { id: string; name: string; code: string };
  let platformAdmin: { id: string; email: string; password: string };
  let companyAdmin: { id: string; email: string; password: string };
  let otherCompanyAdmin: { id: string; email: string; password: string };
  let operator: { id: string; email: string; password: string };
  let noDepartmentOperator: { id: string; email: string; password: string };
  let viewer: { id: string; email: string; password: string };
  let platformToken: string;
  let companyAdminToken: string;
  let otherCompanyAdminToken: string;
  let operatorToken: string;
  let noDepartmentOperatorToken: string;
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
    process.env.JWT_SECRET = "department-module-permissions-test-secret";
    process.env.BYPASS_AUTH_FOR_TESTS = "false";

    prisma = createPrismaClient();
    await prisma.$connect();

    company = await prisma.company.create({
      data: {
        name: `Departments Company ${runId}`,
        code: `departments-company-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    otherCompany = await prisma.company.create({
      data: {
        name: `Departments Other Company ${runId}`,
        code: `departments-other-company-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });

    platformAdmin = {
      id: "",
      email: `departments-platform-${runId}@example.com`,
      password: "PlatformPassword123!"
    };
    companyAdmin = {
      id: "",
      email: `departments-company-admin-${runId}@example.com`,
      password: "CompanyAdminPassword123!"
    };
    otherCompanyAdmin = {
      id: "",
      email: `departments-other-company-admin-${runId}@example.com`,
      password: "OtherCompanyAdminPassword123!"
    };
    operator = {
      id: "",
      email: `departments-operator-${runId}@example.com`,
      password: "OperatorPassword123!"
    };
    noDepartmentOperator = {
      id: "",
      email: `departments-no-department-operator-${runId}@example.com`,
      password: "NoDepartmentOperatorPassword123!"
    };
    viewer = {
      id: "",
      email: `departments-viewer-${runId}@example.com`,
      password: "ViewerPassword123!"
    };

    for (const account of [
      {
        user: platformAdmin,
        role: UserRole.platform_admin,
        membershipRole: MembershipRole.platform_admin,
        companyId: company.id
      },
      {
        user: companyAdmin,
        role: UserRole.company_admin,
        membershipRole: MembershipRole.company_admin,
        companyId: company.id
      },
      {
        user: otherCompanyAdmin,
        role: UserRole.company_admin,
        membershipRole: MembershipRole.company_admin,
        companyId: otherCompany.id
      },
      {
        user: operator,
        role: UserRole.operator,
        membershipRole: MembershipRole.operator,
        companyId: company.id
      },
      {
        user: noDepartmentOperator,
        role: UserRole.operator,
        membershipRole: MembershipRole.operator,
        companyId: company.id
      },
      {
        user: viewer,
        role: UserRole.viewer,
        membershipRole: MembershipRole.viewer,
        companyId: company.id
      }
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
              companyId: account.companyId,
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
    otherCompanyAdminToken = await login(otherCompanyAdmin.email, otherCompanyAdmin.password);
    operatorToken = await login(operator.email, operator.password);
    noDepartmentOperatorToken = await login(
      noDepartmentOperator.email,
      noDepartmentOperator.password
    );
    viewerToken = await login(viewer.email, viewer.password);
  });

  afterAll(async () => {
    process.env.BYPASS_AUTH_FOR_TESTS = "true";
    await app?.close();
    await prisma?.$disconnect();
  });

  it("allows company admins to create, edit, list, and disable departments without deleting them", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/departments")
      .set(authorized(companyAdminToken))
      .send({
        name: `运营部 ${runId}`,
        code: `ops-${runId}`
      })
      .expect(201);

    expect(createResponse.body.data).toMatchObject({
      companyId: company.id,
      name: `运营部 ${runId}`,
      code: `ops-${runId}`,
      status: "active"
    });

    const departmentId = createResponse.body.data.id as string;
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/departments/${departmentId}`)
      .set(authorized(companyAdminToken))
      .send({
        name: `GEO 运营部 ${runId}`,
        code: `geo-ops-${runId}`
      })
      .expect(200);
    expect(updateResponse.body.data).toMatchObject({
      id: departmentId,
      name: `GEO 运营部 ${runId}`,
      code: `geo-ops-${runId}`
    });

    const statusResponse = await request(app.getHttpServer())
      .patch(`/api/departments/${departmentId}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: "inactive" })
      .expect(200);
    expect(statusResponse.body.data.status).toBe("inactive");

    const listResponse = await request(app.getHttpServer())
      .get("/api/departments")
      .set(authorized(companyAdminToken))
      .expect(200);
    expect(listResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: departmentId,
          status: "inactive"
        })
      ])
    );

    for (const token of [operatorToken, viewerToken]) {
      await request(app.getHttpServer())
        .post("/api/departments")
        .set(authorized(token))
        .send({
          name: `Forbidden Department ${runId}`,
          code: `forbidden-${runId}`
        })
        .expect(403);
    }
  });

  it("saves and returns department module permissions inside the current company", async () => {
    const department = await createDepartment(companyAdminToken, "strategy");

    const saveResponse = await request(app.getHttpServer())
      .put(`/api/departments/${department.id}/module-permissions`)
      .set(authorized(companyAdminToken))
      .send({
        permissions: [
          { moduleKey: "dashboard", canAccess: true },
          { moduleKey: "help", canAccess: true },
          { moduleKey: "geo-prompts", canAccess: true },
          { moduleKey: "geo-reports", canAccess: false },
          { moduleKey: "departments", canAccess: false },
          { moduleKey: "aftersales-qa", canAccess: false }
        ]
      })
      .expect(200);

    expect(saveResponse.body.data.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleKey: "geo-prompts", canAccess: true }),
        expect.objectContaining({ moduleKey: "geo-reports", canAccess: false }),
        expect.objectContaining({ moduleKey: "aftersales-qa", canAccess: false })
      ])
    );

    const readResponse = await request(app.getHttpServer())
      .get(`/api/departments/${department.id}/module-permissions`)
      .set(authorized(companyAdminToken))
      .expect(200);
    expect(readResponse.body.data.permissions).toEqual(saveResponse.body.data.permissions);
  });

  it("returns department context for the current user and blocks denied modules at the API layer", async () => {
    const department = await createDepartment(companyAdminToken, "limited-operator");
    await savePermissions(companyAdminToken, department.id, [
      { moduleKey: "dashboard", canAccess: true },
      { moduleKey: "help", canAccess: true },
      { moduleKey: "geo-prompts", canAccess: true },
      { moduleKey: "geo-reports", canAccess: false }
    ]);
    await updateUserDepartment(operator.id, department.id, MembershipRole.operator);
    operatorToken = await login(operator.email, operator.password);

    const meResponse = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set(authorized(operatorToken))
      .expect(200);
    expect(meResponse.body.data.currentCompany).toMatchObject({
      id: company.id,
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        status: "active"
      }
    });
    expect(meResponse.body.data.currentCompany.accessibleModules).toEqual(
      expect.arrayContaining(["dashboard", "help", "geo-prompts"])
    );
    expect(meResponse.body.data.currentCompany.accessibleModules).not.toContain("geo-reports");

    await request(app.getHttpServer())
      .get("/api/geo-prompts")
      .set(authorized(operatorToken))
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/reports/geo-overview")
      .set(authorized(operatorToken))
      .expect(403);
  });

  it("allows only dashboard and help for operators without a department", async () => {
    const meResponse = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set(authorized(noDepartmentOperatorToken))
      .expect(200);

    expect(meResponse.body.data.currentCompany.department).toBeNull();
    expect(meResponse.body.data.currentCompany.accessibleModules).toEqual(["dashboard", "help"]);

    await request(app.getHttpServer())
      .get("/api/geo-prompts")
      .set(authorized(noDepartmentOperatorToken))
      .expect(403);
  });

  it("keeps viewer write restrictions even when the department allows a module", async () => {
    const department = await createDepartment(companyAdminToken, "viewer-readable");
    await savePermissions(companyAdminToken, department.id, [
      { moduleKey: "dashboard", canAccess: true },
      { moduleKey: "help", canAccess: true },
      { moduleKey: "geo-prompts", canAccess: true }
    ]);
    await updateUserDepartment(viewer.id, department.id, MembershipRole.viewer);
    viewerToken = await login(viewer.email, viewer.password);

    await request(app.getHttpServer())
      .get("/api/geo-prompts")
      .set(authorized(viewerToken))
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/geo-prompts")
      .set(authorized(viewerToken))
      .send({
        promptText: `viewer must not create ${runId}`,
        type: GeoPromptType.base,
        intent: UserIntent.selection
      })
      .expect(403);
  });

  it("does not lock platform or company admins out when department permissions are missing or false", async () => {
    const department = await createDepartment(companyAdminToken, "admin-deny-all");
    await savePermissions(companyAdminToken, department.id, [
      { moduleKey: "dashboard", canAccess: false },
      { moduleKey: "help", canAccess: false },
      { moduleKey: "geo-reports", canAccess: false },
      { moduleKey: "departments", canAccess: false }
    ]);
    await updateUserDepartment(companyAdmin.id, department.id, MembershipRole.company_admin);
    companyAdminToken = await login(companyAdmin.email, companyAdmin.password);

    await request(app.getHttpServer())
      .get("/api/reports/geo-overview")
      .set(authorized(companyAdminToken))
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/departments")
      .set(authorized(companyAdminToken))
      .send({
        name: `Admin Still Manages ${runId}`,
        code: `admin-still-manages-${runId}`
      })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/reports/geo-overview")
      .set(authorized(platformToken))
      .expect(200);
  });

  it("keeps department data isolated by company", async () => {
    const currentDepartment = await createDepartment(companyAdminToken, "current-company");
    const otherDepartment = await createDepartment(
      otherCompanyAdminToken,
      "other-company",
      otherCompany.id
    );

    const listResponse = await request(app.getHttpServer())
      .get("/api/departments")
      .set(authorized(companyAdminToken))
      .expect(200);
    const ids = listResponse.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).toContain(currentDepartment.id);
    expect(ids).not.toContain(otherDepartment.id);

    await request(app.getHttpServer())
      .patch(`/api/departments/${otherDepartment.id}`)
      .set(authorized(companyAdminToken))
      .send({
        name: "Cross Company Edit",
        code: `cross-company-edit-${runId}`
      })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/departments/${otherDepartment.id}/module-permissions`)
      .set(authorized(companyAdminToken))
      .expect(404);
  });

  async function createDepartment(token: string, label: string, companyId = company.id) {
    const response = await request(app.getHttpServer())
      .post("/api/departments")
      .set(authorized(token, companyId))
      .send({
        name: `Department ${label} ${runId}`,
        code: `${label}-${runId}`
      })
      .expect(201);

    return response.body.data as {
      id: string;
      companyId: string;
      name: string;
      code: string;
      status: string;
    };
  }

  async function savePermissions(
    token: string,
    departmentId: string,
    permissions: Array<{ moduleKey: string; canAccess: boolean }>
  ) {
    await request(app.getHttpServer())
      .put(`/api/departments/${departmentId}/module-permissions`)
      .set(authorized(token))
      .send({ permissions })
      .expect(200);
  }

  async function updateUserDepartment(
    userId: string,
    departmentId: string,
    membershipRole: MembershipRole
  ) {
    await request(app.getHttpServer())
      .patch(`/api/users/${userId}/memberships`)
      .set(authorized(platformToken))
      .send({
        companyId: company.id,
        departmentId,
        membershipRole,
        membershipStatus: MembershipStatus.active,
        isDefault: true
      })
      .expect(200);
  }
});

function resolveSafeDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL || readDatabaseUrlFromRootEnv();
  const url = new URL(raw);
  const databaseName = url.pathname.replace(/^\//, "");

  if (databaseName === "geo_workstation_clean") {
    url.pathname = `/${process.env.GEO_TEST_DATABASE_NAME || "geo_workstation_crud_smoke"}`;
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
    throw new Error("DATABASE_URL is required for department tests.");
  }

  return line.slice("DATABASE_URL=".length).replace(/^['"]|['"]$/g, "");
}
