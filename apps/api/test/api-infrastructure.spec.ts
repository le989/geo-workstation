import "reflect-metadata";
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
import { configureApiApp } from "../src/common/bootstrap/configure-api-app";
import { createValidationPipe } from "../src/common/validation/create-validation-pipe";
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
});
