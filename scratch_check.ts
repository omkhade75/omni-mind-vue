import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: "Samsung" } },
  });
  console.log("Product found:", product);

  if (product) {
    const batches = await prisma.productBatch.findMany({
      where: { productId: product.id },
    });
    console.log("Samsung Batches:", JSON.stringify(batches, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
