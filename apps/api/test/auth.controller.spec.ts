import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { hashPassword } from "../src/modules/auth/utils/password-hash.util";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const databaseUrl =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
const runId = `${Date.now()}-${crypto.randomUUID()}`;

describe("AuthController", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaClient>;
  let activeUser: { id: string; email: string; password: string };
  let disabledUser: { email: string; password: string };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= databaseUrl;
    process.env.JWT_SECRET = "phase-4d-auth-controller-test-secret";
    process.env.BYPASS_AUTH_FOR_TESTS = "false";

    prisma = createPrismaClient();
    await prisma.$connect();

    activeUser = {
      id: "",
      email: `auth-active-${runId}@example.com`,
      password: "CorrectPassword123!"
    };
    disabledUser = {
      email: `auth-disabled-${runId}@example.com`,
      password: "DisabledPassword123!"
    };

    const createdActiveUser = await prisma.user.create({
      data: {
        email: activeUser.email,
        name: "Phase 4D Active Admin",
        role: UserRole.admin,
        status: UserStatus.active,
        passwordHash: await hashPassword(activeUser.password)
      }
    });
    activeUser.id = createdActiveUser.id;

    await prisma.user.create({
      data: {
        email: disabledUser.email,
        name: "Phase 4D Disabled User",
        role: UserRole.viewer,
        status: UserStatus.disabled,
        passwordHash: await hashPassword(disabledUser.password)
      }
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    configureApiApp(app);
    await app.init();
  });

  afterAll(async () => {
    process.env.BYPASS_AUTH_FOR_TESTS = "true";
    await app.close();
    await prisma.$disconnect();
  });

  it("logs in active users without returning passwordHash", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: activeUser.email,
        password: activeUser.password
      })
      .expect(201);

    expect(response.body).toMatchObject({
      code: 0,
      message: "ok",
      data: {
        user: {
          id: activeUser.id,
          email: activeUser.email,
          role: UserRole.admin,
          status: UserStatus.active
        }
      }
    });
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects invalid passwords with a generic message", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: activeUser.email,
        password: "wrong-password"
      })
      .expect(401);

    expect(response.body).toEqual({
      code: 401,
      message: "账号或密码错误",
      data: null
    });
  });

  it("rejects disabled users", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: disabledUser.email,
        password: disabledUser.password
      })
      .expect(401);
  });

  it("rejects /api/auth/me without login", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  it("returns the current user after login", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: activeUser.email,
        password: activeUser.password
      })
      .expect(201);

    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(200);

    expect(me.body.data).toEqual({
      id: activeUser.id,
      name: "Phase 4D Active Admin",
      email: activeUser.email,
      role: UserRole.admin,
      status: UserStatus.active
    });
  });

  it("protects business APIs while keeping health public", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);
    await request(app.getHttpServer()).get("/api/geo-prompts").expect(401);
  });

  it("logs out through the unified response shape", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: activeUser.email,
        password: activeUser.password
      })
      .expect(201);

    const logout = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(201);

    expect(logout.body).toEqual({
      code: 0,
      message: "ok",
      data: {
        loggedOut: true
      }
    });
  });
});
