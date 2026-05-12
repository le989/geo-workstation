import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GlobalExceptionFilter } from "../errors/global-exception.filter";
import { ApiResponseInterceptor } from "../response/api-response.interceptor";
import { createValidationPipe } from "../validation/create-validation-pipe";

function resolveCorsOrigin(app: INestApplication): string | boolean {
  try {
    const configService = app.get(ConfigService, { strict: false });
    const configuredOrigin = configService.get<string>("CORS_ORIGIN");
    return configuredOrigin && configuredOrigin.trim().length > 0 ? configuredOrigin : true;
  } catch {
    return true;
  }
}

export function configureApiApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableCors({
    origin: resolveCorsOrigin(app),
    credentials: true
  });

  return app;
}
