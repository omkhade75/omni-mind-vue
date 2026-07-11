import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.goodsReceiptItem.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.ledgerEntry.deleteMany({ where: { referenceType: "PurchaseOrderPayment" } });
  console.log("Wiped all old POs, Receipts, and related payments!");
}
main().finally(() => prisma.$disconnect());
