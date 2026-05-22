import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  DepartmentStatus,
  MembershipRole,
  MembershipStatus,
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
import { hashPassword, verifyPassword } from "../src/modules/auth/utils/password-hash.util";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const runId = `${Date.now()}-${crypto.randomUUID()}`;

type TestCompany = { id: string; name: string; code: string };
type TestDepartment = { id: string; name: string; code: string };
type TestAccount = { id: string; email: string; password: string };

describe("company admin user scope", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let companyA: TestCompany;
  let companyB: TestCompany;
  let departmentA: TestDepartment;
  let anotherDepartmentA: TestDepartment;
  let departmentB: TestDepartment;
  let platformAdmin: TestAccount;
  let companyAdminA: TestAccount;
  let peerCompanyAdminA: TestAccount;
  let companyAdminB: TestAccount;
  let operatorA: TestAccount;
  let viewerA: TestAccount;
  let operatorB: TestAccount;
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

  const authorized = (token: string, companyId = companyA.id) => ({
    Authorization: `Bearer ${token}`,
    "X-Company-Id": companyId
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = resolveSafeDatabaseUrl();
    process.env.JWT_SECRET = "test_only_jwt_secret";
    process.env.BYPASS_AUTH_FOR_TESTS = "false";

    prisma = createPrismaClient();
    await prisma.$connect();

    companyA = await prisma.company.create({
      data: {
        name: `User Scope Company A ${runId}`,
        code: `user-scope-company-a-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    companyB = await prisma.company.create({
      data: {
        name: `User Scope Company B ${runId}`,
        code: `user-scope-company-b-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    departmentA = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `User Scope Department A ${runId}`,
        code: `user-scope-dept-a-${runId}`,
        status: DepartmentStatus.active
      }
    });
    anotherDepartmentA = await prisma.department.create({
      data: {
        companyId: companyA.id,
        name: `User Scope Department A2 ${runId}`,
        code: `user-scope-dept-a2-${runId}`,
        status: DepartmentStatus.active
      }
    });
    departmentB = await prisma.department.create({
      data: {
        companyId: companyB.id,
        name: `User Scope Department B ${runId}`,
        code: `user-scope-dept-b-${runId}`,
        status: DepartmentStatus.active
      }
    });

    platformAdmin = await createAccount(
      "platform",
      UserRole.platform_admin,
      MembershipRole.platform_admin,
      companyA.id
    );
    companyAdminA = await createAccount(
      "company-admin-a",
      UserRole.company_admin,
      MembershipRole.company_admin,
      companyA.id
    );
    peerCompanyAdminA = await createAccount(
      "company-admin-a-peer",
      UserRole.company_admin,
      MembershipRole.company_admin,
      companyA.id
    );
    companyAdminB = await createAccount(
      "company-admin-b",
      UserRole.company_admin,
      MembershipRole.company_admin,
      companyB.id
    );
    operatorA = await createAccount("operator-a", UserRole.operator, MembershipRole.operator, companyA.id);
    viewerA = await createAccount("viewer-a", UserRole.viewer, MembershipRole.viewer, companyA.id);
    operatorB = await createAccount("operator-b", UserRole.operator, MembershipRole.operator, companyB.id);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    configureApiApp(app);
    await app.init();

    companyAdminToken = await login(companyAdminA.email, companyAdminA.password);
    operatorToken = await login(operatorA.email, operatorA.password);
    viewerToken = await login(viewerA.email, viewerA.password);
  });

  afterAll(async () => {
    process.env.BYPASS_AUTH_FOR_TESTS = "true";
    await app?.close();
    await prisma?.$disconnect();
  });

  it("returns only current-company users to company admins", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/users")
      .query({ companyId: companyB.id, pageSize: 100 })
      .set(authorized(companyAdminToken))
      .expect(200);

    const emails = response.body.data.items.map((user: { email: string }) => user.email);
    expect(emails).toContain(operatorA.email);
    expect(emails).toContain(viewerA.email);
    expect(emails).not.toContain(operatorB.email);
    expect(JSON.stringify(response.body.data)).not.toContain(companyB.id);
    expect(JSON.stringify(response.body.data)).not.toContain("passwordHash");
  });

  it("creates only current-company operator or viewer users for company admins", async () => {
    const operatorEmail = `ca-op-${crypto.randomUUID()}@example.com`;
    const operatorResponse = await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(companyAdminToken))
      .send({
        name: "Company Admin Created Operator",
        email: operatorEmail,
        initialPassword: "CreatedOperator123!",
        role: UserRole.operator,
        companyId: companyB.id,
        membershipRole: MembershipRole.operator,
        departmentId: departmentA.id,
        status: UserStatus.disabled
      })
      .expect(201);

    expect(operatorResponse.body.data).toMatchObject({
      email: operatorEmail,
      role: UserRole.operator,
      status: UserStatus.active,
      memberships: [
        expect.objectContaining({
          companyId: companyA.id,
          departmentId: departmentA.id,
          role: MembershipRole.operator
        })
      ]
    });

    const viewerEmail = `ca-vw-${crypto.randomUUID()}@example.com`;
    await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(companyAdminToken))
      .send({
        name: "Company Admin Created Viewer",
        email: viewerEmail,
        initialPassword: "CreatedViewer123!",
        role: UserRole.viewer,
        companyId: companyA.id,
        membershipRole: MembershipRole.viewer,
        departmentId: anotherDepartmentA.id
      })
      .expect(201);

    for (const role of [UserRole.company_admin, UserRole.platform_admin]) {
      await request(app.getHttpServer())
        .post("/api/users")
        .set(authorized(companyAdminToken))
        .send({
          name: `Forbidden ${role}`,
          email: `ca-bad-${crypto.randomUUID()}@example.com`,
          initialPassword: "ForbiddenRole123!",
          role,
          companyId: companyA.id,
          membershipRole:
            role === UserRole.platform_admin
              ? MembershipRole.platform_admin
              : MembershipRole.company_admin,
          departmentId: departmentA.id
        })
        .expect(403);
    }

    await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(companyAdminToken))
      .send({
        name: "Forbidden Department",
        email: `ca-dept-${crypto.randomUUID()}@example.com`,
        initialPassword: "ForbiddenDepartment123!",
        role: UserRole.operator,
        companyId: companyA.id,
        membershipRole: MembershipRole.operator,
        departmentId: departmentB.id
      })
      .expect(400);
  });

  it("prevents company admins from editing protected users or escalating roles", async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${operatorB.id}/memberships`)
      .set(authorized(companyAdminToken))
      .send({
        companyId: companyA.id,
        membershipRole: MembershipRole.viewer,
        departmentId: departmentA.id
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${platformAdmin.id}/memberships`)
      .set(authorized(companyAdminToken))
      .send({
        companyId: companyA.id,
        membershipRole: MembershipRole.viewer,
        departmentId: departmentA.id
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${companyAdminA.id}/memberships`)
      .set(authorized(companyAdminToken))
      .send({
        companyId: companyA.id,
        membershipRole: MembershipRole.operator,
        departmentId: departmentA.id
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${peerCompanyAdminA.id}/memberships`)
      .set(authorized(companyAdminToken))
      .send({
        companyId: companyA.id,
        membershipRole: MembershipRole.operator,
        departmentId: departmentA.id
      })
      .expect(403);

    for (const membershipRole of [MembershipRole.company_admin, MembershipRole.platform_admin]) {
      await request(app.getHttpServer())
        .patch(`/api/users/${operatorA.id}/memberships`)
        .set(authorized(companyAdminToken))
        .send({
          companyId: companyA.id,
          membershipRole,
          departmentId: departmentA.id
        })
        .expect(403);
    }
  });

  it("allows company admins to bind current-company departments and switch ordinary roles", async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${operatorA.id}/memberships`)
      .set(authorized(companyAdminToken))
      .send({
        companyId: companyA.id,
        membershipRole: MembershipRole.viewer,
        departmentId: departmentB.id
      })
      .expect(400);

    const response = await request(app.getHttpServer())
      .patch(`/api/users/${operatorA.id}/memberships`)
      .set(authorized(companyAdminToken))
      .send({
        companyId: companyA.id,
        membershipRole: MembershipRole.viewer,
        departmentId: anotherDepartmentA.id,
        membershipStatus: MembershipStatus.active,
        isDefault: true
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: operatorA.id,
      role: UserRole.viewer,
      memberships: [
        expect.objectContaining({
          companyId: companyA.id,
          departmentId: anotherDepartmentA.id,
          role: MembershipRole.viewer
        })
      ]
    });

    const switchedBackResponse = await request(app.getHttpServer())
      .patch(`/api/users/${operatorA.id}/memberships`)
      .set(authorized(companyAdminToken))
      .send({
        companyId: companyA.id,
        membershipRole: MembershipRole.operator,
        departmentId: departmentA.id,
        membershipStatus: MembershipStatus.active,
        isDefault: true
      })
      .expect(200);

    expect(switchedBackResponse.body.data).toMatchObject({
      id: operatorA.id,
      role: UserRole.operator,
      memberships: [
        expect.objectContaining({
          companyId: companyA.id,
          departmentId: departmentA.id,
          role: MembershipRole.operator
        })
      ]
    });
  });

  it("allows company admins to disable, enable, and reset ordinary current-company users only", async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${companyAdminA.id}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: UserStatus.disabled })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${companyAdminB.id}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: UserStatus.disabled })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${peerCompanyAdminA.id}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: UserStatus.disabled })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${operatorB.id}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: UserStatus.disabled })
      .expect(403);

    const disabledResponse = await request(app.getHttpServer())
      .patch(`/api/users/${viewerA.id}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: UserStatus.disabled })
      .expect(200);
    expect(disabledResponse.body.data.status).toBe(UserStatus.disabled);

    const enabledResponse = await request(app.getHttpServer())
      .patch(`/api/users/${viewerA.id}/status`)
      .set(authorized(companyAdminToken))
      .send({ status: UserStatus.active })
      .expect(200);
    expect(enabledResponse.body.data.status).toBe(UserStatus.active);

    const before = await prisma.user.findUniqueOrThrow({ where: { id: viewerA.id } });
    const resetResponse = await request(app.getHttpServer())
      .post(`/api/users/${viewerA.id}/reset-password`)
      .set(authorized(companyAdminToken))
      .send({ newPassword: "ViewerScopedReset123!" })
      .expect(201);
    expect(JSON.stringify(resetResponse.body.data)).not.toContain("ViewerScopedReset123!");
    expect(JSON.stringify(resetResponse.body.data)).not.toContain("passwordHash");

    const after = await prisma.user.findUniqueOrThrow({ where: { id: viewerA.id } });
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(await verifyPassword("ViewerScopedReset123!", after.passwordHash)).toBe(true);

    for (const user of [
      platformAdmin,
      companyAdminA,
      peerCompanyAdminA,
      companyAdminB,
      operatorB
    ]) {
      await request(app.getHttpServer())
        .post(`/api/users/${user.id}/reset-password`)
        .set(authorized(companyAdminToken))
        .send({ newPassword: "ForbiddenReset123!" })
        .expect(403);
    }
  });

  it("keeps operator and viewer out of company-admin user management", async () => {
    for (const token of [operatorToken, viewerToken]) {
      await request(app.getHttpServer()).get("/api/users").set(authorized(token)).expect(403);

      await request(app.getHttpServer())
        .post("/api/users")
        .set(authorized(token))
        .send({
          name: "Forbidden User",
          email: `forbidden-user-${crypto.randomUUID()}-${runId}@example.com`,
          initialPassword: "ForbiddenUser123!",
          role: UserRole.operator,
          companyId: companyA.id,
          membershipRole: MembershipRole.operator
        })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/users/${viewerA.id}/memberships`)
        .set(authorized(token))
        .send({
          companyId: companyA.id,
          membershipRole: MembershipRole.operator,
          departmentId: departmentA.id
        })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/users/${viewerA.id}/status`)
        .set(authorized(token))
        .send({ status: UserStatus.disabled })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/users/${viewerA.id}/reset-password`)
        .set(authorized(token))
        .send({ newPassword: "ForbiddenReset123!" })
        .expect(403);
    }
  });

  async function createAccount(
    label: string,
    role: UserRole,
    membershipRole: MembershipRole,
    companyId: string
  ): Promise<TestAccount> {
    const password = `${label.replace(/[^a-z0-9]/gi, "")}Password123!`;
    const created = await prisma.user.create({
      data: {
        email: `user-scope-${label}-${runId}@example.com`,
        name: `User Scope ${label}`,
        role,
        status: UserStatus.active,
        passwordHash: await hashPassword(password),
        memberships: {
          create: {
            companyId,
            role: membershipRole,
            status: MembershipStatus.active,
            isDefault: true
          }
        }
      }
    });

    return {
      id: created.id,
      email: created.email,
      password
    };
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
    throw new Error("DATABASE_URL is required for user-scope tests.");
  }

  return line.slice("DATABASE_URL=".length).replace(/^['"]|['"]$/g, "");
}
