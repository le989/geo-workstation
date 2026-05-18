import { describe, expect, it, vi } from "vitest";

import { seedBaseData, seedDemoData } from "../prisma/seed-data";
import { assertDemoSeedAllowed, assertProductionSeedAllowed } from "../prisma/seed-safety";

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

  it("requires explicit confirmation before running demo seed data", () => {
    expect(() => assertDemoSeedAllowed({})).toThrow(
      "INCLUDE_DEMO_SEED=true is required to run demo seed data."
    );

    expect(() => assertDemoSeedAllowed({ INCLUDE_DEMO_SEED: "true" })).not.toThrow();
  });

  it("creates only clean base data by default", async () => {
    const { prisma, delegates } = createSeedPrismaMock();

    await seedBaseData(prisma, {
      NODE_ENV: "development",
      DEFAULT_ADMIN_EMAIL: "admin@example.com",
      DEFAULT_ADMIN_PASSWORD: "strong_admin_password"
    });

    expect(delegates.company.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          code: "kjt",
          name: "凯基特"
        })
      })
    );
    expect(delegates.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: "admin@example.com"
        }
      })
    );
    expect(delegates.membership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isDefault: true
        })
      })
    );
    expect(delegates.productLine.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          code: "default",
          name: "默认产品线"
        })
      })
    );

    expect(delegates.geoPrompt.findFirst).not.toHaveBeenCalled();
    expect(delegates.knowledgeBase.findFirst).not.toHaveBeenCalled();
    expect(delegates.knowledgeChunk.findFirst).not.toHaveBeenCalled();
    expect(delegates.instructionTemplate.findFirst).not.toHaveBeenCalled();
    expect(delegates.contentTask.findFirst).not.toHaveBeenCalled();
    expect(delegates.contentItem.findFirst).not.toHaveBeenCalled();
    expect(delegates.modelInclusionRecord.findFirst).not.toHaveBeenCalled();
    expect(delegates.aiCallLog.findFirst).not.toHaveBeenCalled();
  });

  it("does not create demo data without explicit demo confirmation", async () => {
    const { prisma, delegates, baseSeed } = createSeedPrismaMock();

    await expect(seedDemoData(prisma, baseSeed, {})).rejects.toThrow(
      "INCLUDE_DEMO_SEED=true is required to run demo seed data."
    );

    expect(delegates.geoPrompt.findFirst).not.toHaveBeenCalled();
    expect(delegates.knowledgeBase.findFirst).not.toHaveBeenCalled();
    expect(delegates.contentTask.findFirst).not.toHaveBeenCalled();
    expect(delegates.modelInclusionRecord.findFirst).not.toHaveBeenCalled();
    expect(delegates.aiCallLog.findFirst).not.toHaveBeenCalled();
  });

  it("keeps production protection for explicit demo seed data", async () => {
    const { prisma, delegates, baseSeed } = createSeedPrismaMock();

    await expect(
      seedDemoData(prisma, baseSeed, {
        NODE_ENV: "production",
        INCLUDE_DEMO_SEED: "true"
      })
    ).rejects.toThrow("ALLOW_PRODUCTION_SEED=true is required to run seed in production.");

    expect(delegates.geoPrompt.findFirst).not.toHaveBeenCalled();
    expect(delegates.knowledgeBase.findFirst).not.toHaveBeenCalled();
    expect(delegates.contentTask.findFirst).not.toHaveBeenCalled();
    expect(delegates.modelInclusionRecord.findFirst).not.toHaveBeenCalled();
    expect(delegates.aiCallLog.findFirst).not.toHaveBeenCalled();
  });
});

function createSeedPrismaMock() {
  const baseSeed = {
    defaultCompany: {
      id: "company_default_kjt",
      code: "kjt",
      name: "凯基特"
    },
    defaultProductLine: {
      id: "product_line_default_kjt",
      companyId: "company_default_kjt",
      code: "default",
      name: "默认产品线"
    },
    admin: {
      id: "admin_user",
      email: "admin@example.com",
      name: "GEO Admin"
    }
  };

  const delegates = {
    company: {
      upsert: vi.fn().mockResolvedValue(baseSeed.defaultCompany)
    },
    productLine: {
      upsert: vi.fn().mockResolvedValue(baseSeed.defaultProductLine)
    },
    user: {
      upsert: vi.fn().mockResolvedValue(baseSeed.admin)
    },
    membership: {
      upsert: vi.fn().mockResolvedValue({
        id: "membership_default",
        userId: baseSeed.admin.id,
        companyId: baseSeed.defaultCompany.id
      })
    },
    geoPrompt: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    knowledgeBase: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    knowledgeChunk: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    instructionTemplate: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    contentTask: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    contentItem: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    modelInclusionRecord: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    aiCallLog: {
      findFirst: vi.fn(),
      create: vi.fn()
    }
  };

  return {
    baseSeed,
    delegates,
    prisma: delegates as never
  };
}
