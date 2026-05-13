import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const currentWorkingDirectory = process.cwd();
const projectRoot = currentWorkingDirectory.endsWith(`${sep}apps${sep}api`)
  ? resolve(currentWorkingDirectory, "../..")
  : currentWorkingDirectory;
const rootEnvPath = resolve(projectRoot, ".env");

if (existsSync(rootEnvPath)) {
  loadEnv({ path: rootEnvPath, override: false });
} else {
  loadEnv({ override: false });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
