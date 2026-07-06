import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

export const getAccountsDataServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async ({ data }) => {
    // Accounts Receivable (Customer owes us)
    const receivables = await prisma.transaction.findMany({
      where: {
        paymentStatus: { in: ["Pending", "Failed"] }
      },
      include: {
        customer: true
      },
      orderBy: { transactionDate: "desc" }
    });

    // Accounts Payable (We owe Supplier)
    const payables = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["Ordered", "Draft"] }
      },
      include: {
        supplier: true
      },
      orderBy: { orderDate: "desc" }
    });

    return {
      receivables: receivables.map(r => ({
        id: r.id,
        transactionNumber: r.transactionNumber,
        date: r.transactionDate,
        amount: Number(r.totalAmount),
        status: r.paymentStatus,
        customerName: r.customer ? `${r.customer.firstName} ${r.customer.lastName}`.trim() : "Unknown",
        customerId: r.customerId
      })),
      payables: payables.map(p => ({
        id: p.id,
        poNumber: p.poNumber,
        date: p.orderDate,
        amount: Number(p.totalAmount),
        status: p.status,
        supplierName: p.supplier ? p.supplier.name : "Unknown",
        supplierId: p.supplierId
      }))
    };
  });
