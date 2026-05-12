import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const connectionString = configService.get<string>("DATABASE_URL");
    super({
      adapter: new PrismaPg(resolveDatabaseUrl(connectionString))
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

function resolveDatabaseUrl(connectionString: string | undefined): string {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize PrismaService.");
  }

  return connectionString;
}
