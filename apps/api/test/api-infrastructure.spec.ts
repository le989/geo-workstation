import "reflect-metadata";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Post,
  type INestApplication
} from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { IsNotEmpty, IsString } from "class-validator";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { configureApiApp, resolveCorsOrigin } from "../src/common/bootstrap/configure-api-app";
import { createValidationPipe } from "../src/common/validation/create-validation-pipe";
import { DEFAULT_LOCAL_DATABASE_URL, validateApiEnvironment } from "../src/config/api-environment";
import { GeoAnalysisModule } from "../src/modules/geo-analysis/geo-analysis.module";
import { GeoContentModule } from "../src/modules/geo-content/geo-content.module";
import { GeoExpansionModule } from "../src/modules/geo-expansion/geo-expansion.module";
import { GeoInstructionsModule } from "../src/modules/geo-instructions/geo-instructions.module";
import { GeoKnowledgeModule } from "../src/modules/geo-knowledge/geo-knowledge.module";
import { GeoPromptsModule } from "../src/modules/geo-prompts/geo-prompts.module";
import { GeoReportsModule } from "../src/modules/geo-reports/geo-reports.module";
import { ModelInclusionModule } from "../src/modules/model-inclusion/model-inclusion.module";

class ValidationProbeDto {
  @IsString()
  @IsNotEmpty()
  geoPrompt!: string;
}

@Controller("probe")
class ProbeController {
  @Get("raw")
  rawPayload() {
    return {
      geoLoop:
        "GEO diagnosis -> prompt strategy -> knowledge base -> content generation -> model inclusion"
    };
  }

  @Get("error")
  throwGeoError() {
    throw new BadRequestException("GEO prompt type is required");
  }

  @Post("validation")
  validateGeoPayload(@Body() body: ValidationProbeDto) {
    return {
      geoPrompt: body.geoPrompt
    };
  }
}

@Module({
  controllers: [ProbeController]
})
class ProbeModule {}

async function createConfiguredApp(
  moduleClass: Parameters<typeof Test.createTestingModule>[0]
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule(moduleClass).compile();
  const app = moduleRef.createNestApplication();
  configureApiApp(app);
  await app.init();
  return app;
}

describe("Phase 2A API infrastructure", () => {
  beforeAll(() => {
    process.env.DATABASE_URL ??=
      "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";
  });

  it("wraps health checks in the GEO API response envelope", async () => {
    const app = await createConfiguredApp({
      imports: [AppModule]
    });

    try {
      const response = await request(app.getHttpServer()).get("/health").expect(200);

      expect(response.body).toMatchObject({
        code: 0,
        message: "ok",
        data: {
          service: "GEO Marketing Operations System",
          status: "ok",
          phase: "phase-2a"
        }
      });
      expect(typeof response.body.data.timestamp).toBe("string");
      expect(typeof response.body.data.uptimeMs).toBe("number");
    } finally {
      await app.close();
    }
  });

  it("wraps raw controller payloads in the unified API response", async () => {
    const app = await createConfiguredApp({
      imports: [ProbeModule]
    });

    try {
      const response = await request(app.getHttpServer()).get("/probe/raw").expect(200);

      expect(response.body).toEqual({
        code: 0,
        message: "ok",
        data: {
          geoLoop:
            "GEO diagnosis -> prompt strategy -> knowledge base -> content generation -> model inclusion"
        }
      });
    } finally {
      await app.close();
    }
  });

  it("formats exceptions without leaking framework response shapes", async () => {
    const app = await createConfiguredApp({
      imports: [ProbeModule]
    });

    try {
      const response = await request(app.getHttpServer()).get("/probe/error").expect(400);

      expect(response.body).toEqual({
        code: 400,
        message: "GEO prompt type is required",
        data: null
      });
    } finally {
      await app.close();
    }
  });

  it("rejects invalid DTO payloads through the validation pipe used globally", async () => {
    const pipe = createValidationPipe();

    await expect(
      pipe.transform(
        {
          geoPrompt: "",
          genericCmsField: "should be rejected"
        },
        {
          type: "body",
          metatype: ValidationProbeDto
        }
      )
    ).rejects.toMatchObject({
      response: {
        message: expect.arrayContaining([
          expect.stringContaining("geoPrompt should not be empty"),
          expect.stringContaining("property genericCmsField should not exist")
        ])
      }
    });
  });

  it("registers GEO business module skeletons without exposing CRUD controllers", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    const modulesContainer = moduleRef.get(ModulesContainer);
    const registeredModuleNames = [...modulesContainer.values()].map(
      (module) => module.metatype?.name
    );

    expect(registeredModuleNames).toEqual(
      expect.arrayContaining([
        GeoAnalysisModule.name,
        GeoPromptsModule.name,
        GeoExpansionModule.name,
        GeoKnowledgeModule.name,
        GeoInstructionsModule.name,
        GeoContentModule.name,
        ModelInclusionModule.name,
        GeoReportsModule.name
      ])
    );

    await moduleRef.close();
  });

  it("rejects auth bypass in production configuration", () => {
    expect(() =>
      validateApiEnvironment({
        NODE_ENV: "production",
        DATABASE_URL:
          "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public",
        CORS_ORIGIN: "http://example.test",
        JWT_SECRET: "production-test-secret",
        BYPASS_AUTH_FOR_TESTS: "true"
      })
    ).toThrow("BYPASS_AUTH_FOR_TESTS cannot be enabled in production.");
  });

  it("rejects auth bypass when APP_ENV is production", () => {
    expect(() =>
      validateApiEnvironment({
        NODE_ENV: "development",
        APP_ENV: "production",
        DATABASE_URL:
          "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public",
        CORS_ORIGIN: "http://example.test",
        JWT_SECRET: "production-test-secret",
        BYPASS_AUTH_FOR_TESTS: "true"
      })
    ).toThrow("BYPASS_AUTH_FOR_TESTS cannot be enabled in production.");
  });

  it("disables mock providers by default in production app env", () => {
    const env = validateApiEnvironment({
      NODE_ENV: "development",
      APP_ENV: "production",
      DATABASE_URL:
        "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public",
      CORS_ORIGIN: "http://example.test",
      JWT_SECRET: "production-test-secret"
    });

    expect(env.APP_ENV).toBe("production");
    expect(env.AI_PROVIDER).toBe("openai_compatible");
    expect(env.ENABLE_MOCK_PROVIDER).toBe("false");
    expect(env.ENABLE_MOCK_AUTH).toBe("false");
  });

  it("requires DATABASE_URL and CORS_ORIGIN in production configuration", () => {
    expect(() =>
      validateApiEnvironment({
        NODE_ENV: "production",
        CORS_ORIGIN: "http://example.test",
        JWT_SECRET: "production-test-secret"
      })
    ).toThrow("DATABASE_URL is required in production.");

    expect(() =>
      validateApiEnvironment({
        NODE_ENV: "production",
        DATABASE_URL:
          "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public",
        JWT_SECRET: "production-test-secret"
      })
    ).toThrow("CORS_ORIGIN is required in production.");
  });

  it("keeps the local DATABASE_URL fallback for development only", () => {
    const env = validateApiEnvironment({
      NODE_ENV: "development"
    });

    expect(env.DATABASE_URL).toBe(DEFAULT_LOCAL_DATABASE_URL);
  });

  it("does not allow wildcard CORS in production without CORS_ORIGIN", () => {
    const productionApp = {
      get: () => ({
        get: (key: string) => (key === "NODE_ENV" ? "production" : undefined)
      })
    } as unknown as INestApplication;
    const configuredProductionApp = {
      get: () => ({
        get: (key: string) =>
          key === "NODE_ENV"
            ? "production"
            : key === "CORS_ORIGIN"
              ? "http://example.test"
              : undefined
      })
    } as unknown as INestApplication;
    const developmentApp = {
      get: () => ({
        get: (key: string) => (key === "NODE_ENV" ? "development" : undefined)
      })
    } as unknown as INestApplication;

    expect(() => resolveCorsOrigin(productionApp)).toThrow(
      "CORS_ORIGIN is required in production."
    );
    expect(resolveCorsOrigin(configuredProductionApp)).toBe("http://example.test");
    expect(resolveCorsOrigin(developmentApp)).toBe(true);
  });

  it("keeps production seed behind an explicit confirmation variable", () => {
    const seedSafetySource = readFileSync(join(process.cwd(), "prisma/seed-safety.ts"), "utf8");
    const seedDataSource = readFileSync(join(process.cwd(), "prisma/seed-data.ts"), "utf8");
    const seedSource = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf8");
    const seedDemoSource = readFileSync(join(process.cwd(), "prisma/seed-demo.ts"), "utf8");

    expect(seedSafetySource).toContain("ALLOW_PRODUCTION_SEED");
    expect(seedSafetySource).toContain("INCLUDE_DEMO_SEED");
    expect(seedDataSource).toContain("assertProductionSeedAllowed");
    expect(seedSource).toContain("seedBaseData");
    expect(seedDemoSource).toContain("assertDemoSeedAllowed");
  });
});
