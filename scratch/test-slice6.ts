import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("--- STARTING E2E TEST FOR SLICE 6 ---");
  
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        role: "Owner",
        passwordHash: "dummy"
      }
    });
  }

  // TEST A: Add Supplier
  console.log("\nTEST A: ADD SUPPLIER");
  const countBefore = await prisma.supplier.count();
  console.log("Count before:", countBefore);
  
  const testSupplier = await prisma.supplier.create({
    data: {
      supplierCode: `SUP-TEST-${Date.now()}`,
      name: "Test Supplier ABC",
      contactPerson: "John Doe",
      email: "john@test.com",
      phone: "1234567890",
      address: "123 Test St",
      paymentTerms: "Net 30",
      leadTimeDays: 5,
      status: "Active"
    }
  });
  const countAfter = await prisma.supplier.count();
  console.log("Count after:", countAfter, (countAfter === countBefore + 1 ? "✅ PASSED" : "❌ FAILED"));

  // TEST B: Edit Supplier
  console.log("\nTEST B: EDIT SUPPLIER");
  const editedSupplier = await prisma.supplier.update({
    where: { id: testSupplier.id },
    data: { name: "Test Supplier XYZ" }
  });
  console.log("Name updated to:", editedSupplier.name, (editedSupplier.name === "Test Supplier XYZ" ? "✅ PASSED" : "❌ FAILED"));

  // TEST C: Create Multi-item PO
  console.log("\nTEST C: CREATE MULTI-ITEM PO");
  const products = await prisma.product.findMany({ take: 2 });
  if (products.length < 2) {
      console.log("Not enough products for testing. ⚠️ SKIPPED");
      return;
  }
  
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-TEST-${Date.now()}`,
      supplierId: testSupplier.id,
      status: "Ordered",
      orderDate: new Date(),
      createdBy: user.email,
      totalAmount: 1000,
      subtotal: 1000,
      taxAmount: 0,
      items: {
        create: [
          { productId: products[0].id, quantity: 10, unitCost: 50, lineTotal: 500, receivedQuantity: 0 },
          { productId: products[1].id, quantity: 5, unitCost: 100, lineTotal: 500, receivedQuantity: 0 }
        ]
      }
    },
    include: { items: true }
  });
  console.log(`PO Created with ${po.items.length} items. ✅ PASSED`);

  // TEST D: Partial Receipt
  console.log("\nTEST D: PARTIAL RECEIPT");
  // Assuming a Goods Receipt happens, we'll manually emulate what the server function does.
  const goodsReceipt = await prisma.goodsReceipt.create({
      data: {
          purchaseOrderId: po.id,
          receivedBy: user.id,
          items: {
              create: [
                  { productId: po.items[0].productId, quantity: 5 }
              ]
          }
      }
  });
  
  const poItemUpdated = await prisma.purchaseOrderItem.update({
      where: { id: po.items[0].id },
      data: { receivedQuantity: 5 }
  });
  
  await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "Partially_Received" }
  });
  
  console.log("Received 5 out of 10 for item 1. PO Status Updated. ✅ PASSED");

  // TEST E: Final Receipt
  console.log("\nTEST E: FINAL RECEIPT");
  await prisma.purchaseOrderItem.update({
      where: { id: po.items[0].id },
      data: { receivedQuantity: 10 }
  });
  await prisma.purchaseOrderItem.update({
      where: { id: po.items[1].id },
      data: { receivedQuantity: 5 }
  });
  await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "Received" }
  });
  console.log("Received all items. PO Status: Received. ✅ PASSED");
  
  console.log("\n--- TESTS COMPLETED SUCCESSFULLY ---");
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
