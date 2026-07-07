import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.productBatch.findMany({
    where: {
      expiryDate: { not: null },
      quantityRemaining: { gt: 0 },
    },
    include: {
      product: {
        include: { department: true }
      },
    }
  });
  console.log("Batches count:", batches.length);
  console.log("Batches sample:", JSON.stringify(batches.slice(0, 2), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
