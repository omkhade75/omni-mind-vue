import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding mock expiring batches to products...');
  
  const products = await prisma.product.findMany({ take: 8 }); // Just grab the first 8 products
  
  let batchCounter = 1;
  const daysOffsets = [1, 3, 7, 15, -2, 25, 4, 12]; // Some expire today, soon, or expired
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const offset = daysOffsets[i % daysOffsets.length];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + offset);
    
    // Check if supplierproduct exists to link supplier, else just create a batch without supplier or get first supplier
    const supplierProd = await prisma.supplierProduct.findFirst({
      where: { productId: product.id }
    });
    
    let supplierId = supplierProd?.supplierId;
    if (!supplierId) {
       const anySupplier = await prisma.supplier.findFirst();
       if (anySupplier) supplierId = anySupplier.id;
    }
    
    if (supplierId) {
      await prisma.productBatch.create({
        data: {
          productId: product.id,
          supplierId: supplierId,
          costPrice: product.costPrice,
          expiryDate: expiryDate,
          batchNumber: `BATCH-${Date.now()}-${batchCounter++}`,
          quantityReceived: 50,
          quantityRemaining: Math.floor(Math.random() * 40) + 10,
          status: 'Available'
        }
      });
      console.log(`Added batch for ${product.name}, expiring in ${offset} days.`);
    }
  }
  
  console.log('Done adding mock batches!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
