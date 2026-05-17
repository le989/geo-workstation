export function assertProductionSeedAllowed(
  env: Pick<NodeJS.ProcessEnv, "NODE_ENV" | "ALLOW_PRODUCTION_SEED"> = process.env
): void {
  if (env.NODE_ENV !== "production") {
    return;
  }

  if (env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("ALLOW_PRODUCTION_SEED=true is required to run seed in production.");
  }
}
