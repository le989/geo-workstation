import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GlobalExceptionFilter } from "../errors/global-exception.filter";
import { ApiResponseInterceptor } from "../response/api-response.interceptor";
import { createValidationPipe } from "../validation/create-validation-pipe";

export function resolveCorsOrigin(app: INestApplication): string | boolean {
  let nodeEnv = process.env.NODE_ENV ?? "development";
  let appEnv = process.env.APP_ENV ?? "development";
  let configuredOrigin = process.env.CORS_ORIGIN;

  try {
    const configService = app.get(ConfigService, { strict: false });
    nodeEnv = configService.get<string>("NODE_ENV") ?? nodeEnv;
    appEnv = configService.get<string>("APP_ENV") ?? appEnv;
    configuredOrigin = configService.get<string>("CORS_ORIGIN") ?? configuredOrigin;
  } catch {
    // Non-AppModule tests may not register ConfigService. Fall back to process.env.
  }

  if (configuredOrigin && configuredOrigin.trim().length > 0) {
    return configuredOrigin;
  }

  if (nodeEnv === "production" || appEnv === "production") {
    throw new Error("CORS_ORIGIN is required in production.");
  }

  return true;
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
