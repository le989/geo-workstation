import { Controller, Get } from "@nestjs/common";
import { GEO_APP_NAME, type ApiResponse } from "@geo-workstation/shared";

type HealthPayload = {
  service: string;
  status: "ok";
  phase: "phase-0";
};

@Controller()
export class HealthController {
  @Get("health")
  health(): ApiResponse<HealthPayload> {
    return this.createHealthResponse();
  }

  @Get("api/health")
  apiHealth(): ApiResponse<HealthPayload> {
    return this.createHealthResponse();
  }

  private createHealthResponse(): ApiResponse<HealthPayload> {
    return {
      code: 0,
      message: "ok",
      data: {
        service: GEO_APP_NAME,
        status: "ok",
        phase: "phase-0"
      }
    };
  }
}
