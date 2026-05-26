import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApiApp } from "./common/bootstrap/configure-api-app";
import {
  getDatabaseNameFromUrl,
  isMockAuthEnabled,
  isMockProviderEnabled
} from "./modules/ai/ai-provider-policy";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApiApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_PORT") ?? 3000;
  const logger = new Logger("Bootstrap");

  logger.log(
    [
      `APP_ENV=${configService.get<string>("APP_ENV") ?? "development"}`,
      `database=${getDatabaseNameFromUrl(configService.get<string>("DATABASE_URL"))}`,
      `mockProvider=${isMockProviderEnabled(configService) ? "enabled" : "disabled"}`,
      `mockAuth=${isMockAuthEnabled(configService) ? "enabled" : "disabled"}`
    ].join("; ")
  );

  await app.listen(port);
}

void bootstrap();
