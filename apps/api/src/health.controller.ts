import { Controller, Get } from "@nestjs/common";
import { GEO_APP_NAME } from "@geo-workstation/shared";

type HealthPayload = {
  service: string;
  status: "ok";
  phase: "phase-2a";
  timestamp: string;
  uptimeMs: number;
  geoLoop: string[];
  infrastructure: {
    responseEnvelope: true;
    exceptionFilter: true;
    validationPipe: true;
    configModule: true;
    prismaModule: true;
  };
};

@Controller()
export class HealthController {
  @Get("health")
  health(): HealthPayload {
    return this.createHealthPayload();
  }

  @Get("api/health")
  apiHealth(): HealthPayload {
    return this.createHealthPayload();
  }

  private createHealthPayload(): HealthPayload {
    return {
      service: GEO_APP_NAME,
      status: "ok",
      phase: "phase-2a",
      timestamp: new Date().toISOString(),
      uptimeMs: Math.round(process.uptime() * 1000),
      geoLoop: [
        "GEO diagnosis",
        "prompt strategy",
        "enterprise GEO knowledge base",
        "GEO content generation",
        "model inclusion records",
        "optimization reports"
      ],
      infrastructure: {
        responseEnvelope: true,
        exceptionFilter: true,
        validationPipe: true,
        configModule: true,
        prismaModule: true
      }
    };
  }
}
