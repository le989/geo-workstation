import { describe, expect, it } from "vitest";

import { assertProductionSeedAllowed } from "../prisma/seed-safety";

describe("Prisma seed safety", () => {
  it("requires explicit confirmation before running seed in production", () => {
    expect(() =>
      assertProductionSeedAllowed({
        NODE_ENV: "production"
      })
    ).toThrow("ALLOW_PRODUCTION_SEED=true is required to run seed in production.");

    expect(() =>
      assertProductionSeedAllowed({
        NODE_ENV: "production",
        ALLOW_PRODUCTION_SEED: "true"
      })
    ).not.toThrow();

    expect(() =>
      assertProductionSeedAllowed({
        NODE_ENV: "development"
      })
    ).not.toThrow();
  });
});
