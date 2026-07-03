import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

export const getPaymentReportsServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async ({ data }) => {
    // 1. Accounts Payable (Money we owe to Suppliers for Draft/Ordered POs)
    const suppliers = await prisma.supplier.findMany({
      include: { purchaseOrders: true }
    });

    const accountsPayable = suppliers.map(s => {
      const pendingPOs = s.purchaseOrders.filter(
        po => ["Draft", "Ordered", "Sent", "Approved", "Submitted"].includes(po.status)
      );
      const amountOwed = pendingPOs.reduce((sum, po) => sum + Number(po.totalAmount), 0);
      return {
        id: s.id,
        name: s.name,
        amountOwed,
        poCount: pendingPOs.length
      };
    }).filter(s => s.amountOwed > 0).sort((a, b) => b.amountOwed - a.amountOwed);

    // 2. Accounts Receivable (Money customers owe us for Pending/Failed transactions)
    // Note: In retail, this is rare, but we will track failed/pending transactions.
    const transactions = await prisma.transaction.findMany({
      where: {
        paymentStatus: { in: ["Pending", "Failed"] }
      },
      include: {
        customer: true
      }
    });

    const accountsReceivable = transactions.map(t => ({
      id: t.id,
      transactionNumber: t.transactionNumber,
      customerName: t.customer?.name || "Walk-in Customer",
      amountDue: Number(t.totalAmount),
      date: t.transactionDate.toISOString(),
      status: t.paymentStatus
    })).sort((a, b) => b.amountDue - a.amountDue);

    return {
      accountsPayable,
      accountsReceivable,
      totalPayable: accountsPayable.reduce((sum, s) => sum + s.amountOwed, 0),
      totalReceivable: accountsReceivable.reduce((sum, t) => sum + t.amountDue, 0)
    };
  });
