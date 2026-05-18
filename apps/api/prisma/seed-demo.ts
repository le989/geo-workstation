import { createPrismaClient } from "../src/prisma/create-prisma-client";
import { seedBaseData, seedDemoData } from "./seed-data";
import { assertDemoSeedAllowed, assertProductionSeedAllowed } from "./seed-safety";

const prisma = createPrismaClient();

async function main() {
  assertProductionSeedAllowed();
  assertDemoSeedAllowed();
  const baseSeed = await seedBaseData(prisma);
  await seedDemoData(prisma, baseSeed);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
