import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding 50 units of stock to loc-retail for all products...");

  const products = await prisma.product.findMany();

  let updatedCount = 0;
  for (const product of products) {
    await prisma.inventoryStock.upsert({
      where: {
        productId_locationId: {
          productId: product.id,
          locationId: "loc-retail",
        },
      },
      update: {
        quantityOnHand: {
          increment: 50,
        },
      },
      create: {
        productId: product.id,
        locationId: "loc-retail",
        quantityOnHand: 50,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully added 50 units of stock to ${updatedCount} products at loc-retail.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
