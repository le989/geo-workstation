import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import {
  CompanyStatus,
  CompanyType,
  MembershipRole,
  MembershipStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { hashPassword, verifyPassword } from "../src/modules/auth/utils/password-hash.util";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("UsersController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let company: { id: string; name: string; code: string };
  let disabledCompany: { id: string; name: string; code: string };
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

  const authorized = (token: string) => ({
    Authorization: `Bearer ${token}`,
    "X-Company-Id": company.id
  });

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    process.env.JWT_SECRET = "user-management-test-secret";
    process.env.BYPASS_AUTH_FOR_TESTS = "false";

    prisma = createPrismaClient();
    await prisma.$connect();
    company = await prisma.company.create({
      data: {
        name: `Users Company ${runId}`,
        code: `users-company-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    disabledCompany = await prisma.company.create({
      data: {
        name: `Users Disabled Company ${runId}`,
        code: `users-disabled-company-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.disabled
      }
    });

    platformAdmin = {
      id: "",
      email: `users-platform-${runId}@example.com`,
      password: "PlatformPassword123!"
    };
    companyAdmin = {
      id: "",
      email: `users-company-admin-${runId}@example.com`,
      password: "CompanyAdminPassword123!"
    };
    operator = {
      id: "",
      email: `users-operator-${runId}@example.com`,
      password: "OperatorPassword123!"
    };
    viewer = {
      id: "",
      email: `users-viewer-${runId}@example.com`,
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
    await app.close();
    await prisma.$disconnect();
  });

  it("allows platform and company admins to list scoped users without leaking password hashes", async () => {
    const forbiddenTokens = [operatorToken, viewerToken];

    for (const token of forbiddenTokens) {
      await request(app.getHttpServer())
        .get("/api/users")
        .set(authorized(token))
        .expect(403);
    }

    const response = await request(app.getHttpServer())
      .get("/api/users")
      .query({ keyword: "users-", companyId: company.id })
      .set(authorized(platformToken))
      .expect(200);

    expect(response.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: operator.email,
          memberships: expect.arrayContaining([
            expect.objectContaining({
              companyId: company.id,
              companyName: company.name,
              role: MembershipRole.operator,
              isDefault: true
            })
          ])
        })
      ])
    );
    expect(JSON.stringify(response.body.data)).not.toContain("passwordHash");

    const companyAdminResponse = await request(app.getHttpServer())
      .get("/api/users")
      .query({ keyword: "users-", companyId: disabledCompany.id })
      .set(authorized(companyAdminToken))
      .expect(200);

    expect(companyAdminResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: operator.email,
          memberships: expect.arrayContaining([
            expect.objectContaining({
              companyId: company.id,
              role: MembershipRole.operator
            })
          ])
        })
      ])
    );
    expect(JSON.stringify(companyAdminResponse.body.data)).not.toContain(disabledCompany.id);
    expect(JSON.stringify(companyAdminResponse.body.data)).not.toContain("passwordHash");
  });

  it("creates users with passwordHash and active default membership", async () => {
    const email = `created-user-${runId}@example.com`;
    const response = await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(platformToken))
      .send({
        name: "Created User",
        email,
        initialPassword: "CreatedPassword123!",
        role: UserRole.operator,
        companyId: company.id,
        membershipRole: MembershipRole.operator,
        status: UserStatus.active,
        isDefaultCompany: true
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      email,
      role: UserRole.operator,
      status: UserStatus.active,
      memberships: [
        expect.objectContaining({
          companyId: company.id,
          role: MembershipRole.operator,
          status: MembershipStatus.active,
          isDefault: true
        })
      ]
    });
    expect(JSON.stringify(response.body.data)).not.toContain("passwordHash");
    expect(JSON.stringify(response.body.data)).not.toContain("CreatedPassword123!");

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).toEqual(expect.any(String));
    expect(await verifyPassword("CreatedPassword123!", user.passwordHash)).toBe(true);
  });

  it("rejects duplicate emails, disabled companies, short passwords, and role mismatches", async () => {
    await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(platformToken))
      .send({
        name: "Duplicate",
        email: operator.email,
        initialPassword: "DuplicatePassword123!",
        role: UserRole.operator,
        companyId: company.id,
        membershipRole: MembershipRole.operator,
        status: UserStatus.active
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(platformToken))
      .send({
        name: "Disabled Company",
        email: `disabled-company-user-${runId}@example.com`,
        initialPassword: "DisabledCompanyPassword123!",
        role: UserRole.operator,
        companyId: disabledCompany.id,
        membershipRole: MembershipRole.operator,
        status: UserStatus.active
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(platformToken))
      .send({
        name: "Short Password",
        email: `short-password-user-${runId}@example.com`,
        initialPassword: "short",
        role: UserRole.operator,
        companyId: company.id,
        membershipRole: MembershipRole.operator,
        status: UserStatus.active
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/users")
      .set(authorized(platformToken))
      .send({
        name: "Mismatch",
        email: `mismatch-user-${runId}@example.com`,
        initialPassword: "MismatchPassword123!",
        role: UserRole.operator,
        companyId: company.id,
        membershipRole: MembershipRole.company_admin,
        status: UserStatus.active
      })
      .expect(400);
  });

  it("resets passwords without returning passwordHash or plaintext", async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: {
        id: viewer.id
      }
    });

    const response = await request(app.getHttpServer())
      .post(`/api/users/${viewer.id}/reset-password`)
      .set(authorized(platformToken))
      .send({ newPassword: "ViewerResetPassword123!" })
      .expect(201);

    expect(JSON.stringify(response.body.data)).not.toContain("passwordHash");
    expect(JSON.stringify(response.body.data)).not.toContain("ViewerResetPassword123!");

    const after = await prisma.user.findUniqueOrThrow({
      where: {
        id: viewer.id
      }
    });
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(await verifyPassword("ViewerResetPassword123!", after.passwordHash)).toBe(true);
  });

  it("updates user status and rejects disabled users during login", async () => {
    const email = `disable-user-${runId}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: "Disable User",
        role: UserRole.operator,
        status: UserStatus.active,
        passwordHash: await hashPassword("DisablePassword123!"),
        memberships: {
          create: {
            companyId: company.id,
            role: MembershipRole.operator,
            status: MembershipStatus.active,
            isDefault: true
          }
        }
      }
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/users/${user.id}/status`)
      .set(authorized(platformToken))
      .send({ status: UserStatus.disabled })
      .expect(200);

    expect(response.body.data.status).toBe(UserStatus.disabled);
    expect(JSON.stringify(response.body.data)).not.toContain("passwordHash");

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password: "DisablePassword123!" })
      .expect(401);
  });

  it("updates the default membership and keeps user role aligned", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/users/${operator.id}/memberships`)
      .set(authorized(platformToken))
      .send({
        companyId: company.id,
        membershipRole: MembershipRole.company_admin,
        membershipStatus: MembershipStatus.active,
        isDefault: true
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: operator.id,
      role: UserRole.company_admin,
      memberships: [
        expect.objectContaining({
          companyId: company.id,
          role: MembershipRole.company_admin,
          status: MembershipStatus.active,
          isDefault: true
        })
      ]
    });
    expect(JSON.stringify(response.body.data)).not.toContain("passwordHash");
  });

  it("protects the last active platform admin membership from disable or downgrade", async () => {
    const soloCompany = await prisma.company.create({
      data: {
        name: `Solo Platform Company ${runId}`,
        code: `solo-platform-${runId}`,
        type: CompanyType.customer,
        status: CompanyStatus.active
      }
    });
    const soloAdmin = await prisma.user.create({
      data: {
        email: `solo-platform-${runId}@example.com`,
        name: "Solo Platform Admin",
        role: UserRole.platform_admin,
        status: UserStatus.active,
        passwordHash: await hashPassword("SoloPlatformPassword123!"),
        memberships: {
          create: {
            companyId: soloCompany.id,
            role: MembershipRole.platform_admin,
            status: MembershipStatus.active,
            isDefault: true
          }
        }
      }
    });

    await request(app.getHttpServer())
      .patch(`/api/users/${soloAdmin.id}/status`)
      .set({ Authorization: `Bearer ${platformToken}`, "X-Company-Id": soloCompany.id })
      .send({ status: UserStatus.disabled })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/users/${soloAdmin.id}/memberships`)
      .set({ Authorization: `Bearer ${platformToken}`, "X-Company-Id": soloCompany.id })
      .send({
        companyId: soloCompany.id,
        membershipRole: MembershipRole.operator,
        membershipStatus: MembershipStatus.active,
        isDefault: true
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/users/${soloAdmin.id}/memberships`)
      .set({ Authorization: `Bearer ${platformToken}`, "X-Company-Id": soloCompany.id })
      .send({
        companyId: company.id,
        membershipRole: MembershipRole.operator,
        membershipStatus: MembershipStatus.active,
        isDefault: true
      })
      .expect(400);
  });
});
