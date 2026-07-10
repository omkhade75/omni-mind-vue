import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { getDepartmentScope } from "./server-customers";
import { sendCustomerBillWhatsApp, sendOwnerStockAlertWhatsApp } from "./server-whatsapp";

export interface TransactionListItem {
  id: string;
  transactionNumber: string;
  customerName: string | null;
  customerId: string | null;
  dept: string;
  departmentId: string;
  date: string;
  time: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment: string;
  status: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

// 1. Create Sale (Atomic Transaction with validations)
export const createTransactionServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      customerId?: string | null;
      walkinPhone?: string | null;
      departmentId: string;
      items: Array<{ productId: string; quantity: number; discount: number }>;
      paymentMethod: string;
      cashierId?: string;
      role: string;
      emailUser: string;
      transactionDate?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    if (data.items.length === 0) {
      throw new Error("Cannot create a sale with zero items.");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate stocks and fetch product rates
      const productIds = data.items.map((item: any) => item.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      const txItemsData: any[] = [];
      const stockUpdates: any[] = [];
      const movementData: any[] = [];
      const outOfStockAlerts: any[] = [];

      for (const item of data.items) {
        const prod = dbProducts.find((p) => p.id === item.productId);
        if (!prod) {
          throw new Error(`Product SKU ${item.productId} was not found.`);
        }

        const price = Number(prod.sellingPrice);
        const cost = Number(prod.costPrice);
        const taxRate = Number(prod.taxRate) / 100;

        // Fetch all stock locations for this product to deduct sequentially
        const stockRecords = await tx.inventoryStock.findMany({
          where: { productId: prod.id },
          orderBy: { locationId: 'asc' } // Try to deduct from loc-retail first if possible
        });

        const totalStock = stockRecords.reduce((sum, s) => sum + s.quantityOnHand, 0);
        if (totalStock < item.quantity) {
          throw new Error(`Insufficient total stock for ${prod.name}. Available: ${totalStock}, Requested: ${item.quantity}`);
        }

        const itemSubtotal = price * item.quantity;
        const itemDiscount = item.discount;
        const taxableAmount = itemSubtotal - itemDiscount;
        const itemTax = taxableAmount * taxRate;
        const lineTotal = taxableAmount + itemTax;

        subtotal += itemSubtotal;
        totalDiscount += itemDiscount;
        totalTax += itemTax;

        // FIFO Product Batch depletion
        const productBatches = await tx.productBatch.findMany({
          where: { productId: prod.id, quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: "asc" }
        });

        let batchDeductRemaining = item.quantity;
        let assignedBatchId: string | null = null;

        for (const batch of productBatches) {
          if (batchDeductRemaining <= 0) break;
          const qtyToDeduct = Math.min(batch.quantityRemaining, batchDeductRemaining);
          if (qtyToDeduct > 0) {
            await tx.productBatch.update({
              where: { id: batch.id },
              data: { quantityRemaining: { decrement: qtyToDeduct } }
            });
            if (!assignedBatchId) {
              assignedBatchId = batch.id;
            }
            batchDeductRemaining -= qtyToDeduct;
          }
        }

        txItemsData.push({
          productId: prod.id,
          quantity: item.quantity,
          unitPrice: price,
          costPriceSnapshot: cost,
          discountAmount: itemDiscount,
          taxAmount: itemTax,
          lineTotal,
          batchId: assignedBatchId,
        });

        // Deduct from stock locations sequentially
        let remainingToDeduct = item.quantity;
        for (const stockRecord of stockRecords) {
          if (remainingToDeduct <= 0) break;
          
          const qtyToDeduct = Math.min(stockRecord.quantityOnHand, remainingToDeduct);
          if (qtyToDeduct > 0) {
            stockUpdates.push({
              productId: prod.id,
              locationId: stockRecord.locationId,
              qty: qtyToDeduct,
            });
            
            // Add to inventory movement ledger
            movementData.push({
              productId: prod.id,
              locationId: stockRecord.locationId,
              movementType: "SALE",
              quantity: qtyToDeduct,
              reason: "POS Sale Checkout",
              performedBy: data.role,
            });
            
            remainingToDeduct -= qtyToDeduct;
          }
        }

        const newStock = totalStock - item.quantity;
        if (newStock < prod.reorderLevel) {
          outOfStockAlerts.push({
            productName: prod.name,
            sku: prod.sku,
            remainingStock: newStock,
            reorderLevel: prod.reorderLevel,
          });
        }
      }

      const totalAmount = subtotal - totalDiscount + totalTax;
      const transactionId = `TXN-${Date.now().toString().slice(-6)}`;

      // 2. Create Transaction row
      const transaction = await tx.transaction.create({
        data: {
          id: transactionId,
          transactionNumber: transactionId,
          customerId: data.customerId || null,
          departmentId: data.departmentId,
          cashierId: data.cashierId || "cashier-01",
          transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
          subtotal,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          totalAmount,
          paymentStatus: "Paid",
          status: "Completed",
        },
      });

      // 3. Create TransactionItems
      for (const txi of txItemsData) {
        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: txi.productId,
            batchId: txi.batchId,
            quantity: txi.quantity,
            unitPrice: txi.unitPrice,
            costPriceSnapshot: txi.costPriceSnapshot,
            discountAmount: txi.discountAmount,
            taxAmount: txi.taxAmount,
            lineTotal: txi.lineTotal,
          },
        });
      }

      // 4. Create Payment
      await tx.payment.create({
        data: {
          transactionId: transaction.id,
          method: data.paymentMethod,
          amount: totalAmount,
          status: "Success",
          paidAt: new Date(),
        },
      });

      // 5. Decrement InventoryStock
      for (const stUpdate of stockUpdates) {
        await tx.inventoryStock.update({
          where: {
            productId_locationId: {
              productId: stUpdate.productId,
              locationId: stUpdate.locationId,
            },
          },
          data: {
            quantityOnHand: { decrement: stUpdate.qty },
            availableQty: { decrement: stUpdate.qty },
          },
        });
      }

      // 6. Create SALE InventoryMovements
      for (const mv of movementData) {
        await tx.inventoryMovement.create({
          data: {
            productId: mv.productId,
            locationId: mv.locationId,
            movementType: mv.movementType,
            quantity: mv.quantity,
            reason: mv.reason,
            performedBy: mv.performedBy,
            referenceType: "Transaction",
            referenceId: transaction.id,
          },
        });
      }

      // 7. Update Customer Loyalty Points & Segment (VIP etc)
      if (data.customerId) {
        const addedPoints = Math.floor(totalAmount * 0.01); // 1% points
        await tx.customer.update({
          where: { id: data.customerId },
          data: {
            loyaltyPoints: { increment: addedPoints },
          },
        });
      }

      // 7.5 Record Double-Entry Ledger Entries
      const totalCost = txItemsData.reduce((sum, item) => sum + (Number(item.costPriceSnapshot) * item.quantity), 0);
      const { recordDoubleEntry } = await import("./server-ledger");
      await recordDoubleEntry(tx, {
        journalId: `JNL-SALE-${transaction.id}`,
        referenceType: "Transaction",
        referenceId: transaction.id,
        description: `POS Sale Receipt: ${transaction.transactionNumber}`,
        debits: [
          { code: "1000", amount: totalAmount }, // Debit Cash
          { code: "5000", amount: totalCost },   // Debit COGS
        ],
        credits: [
          { code: "4000", amount: totalAmount }, // Credit Sales Revenue
          { code: "1300", amount: totalCost },   // Credit Inventory Asset
        ],
      });

      // 8. Create BusinessEvent
      await tx.businessEvent.create({
        data: {
          eventType: "SALE_COMPLETED",
          entityType: "Transaction",
          entityId: transaction.id,
          title: `Sale Completed: ${transaction.transactionNumber}`,
          description: `Total amount ₹${totalAmount.toFixed(0)} processed via ${data.paymentMethod}.`,
          metadata: JSON.stringify({ itemsCount: data.items.length, total: totalAmount }),
        },
      });

      // 9. AuditLog
      await tx.auditLog.create({
        data: {
          userId: data.role === "manager" ? "rohan-kulkarni" : data.role === "admin" ? "priya-nair" : "aarav-mehra",
          action: "TRANSACTION_CREATED",
          entityType: "Transaction",
          entityId: transaction.id,
          afterData: JSON.stringify(transaction),
        },
      });

      return { transaction, outOfStockAlerts };
    });

    // --- WHATSAPP NOTIFICATIONS ---
    
    // 1. Send low stock alerts asynchronously
    for (const alert of result.outOfStockAlerts) {
      sendOwnerStockAlertWhatsApp(alert.productName, alert.remainingStock, alert.reorderLevel, alert.sku).catch(err => {
        console.error("Failed to send stock alert:", err);
      });
    }

    // 2. Send Customer Bill
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (customer && customer.phone) {
        sendCustomerBillWhatsApp(customer.phone, {
          transactionNumber: result.transaction.transactionNumber,
          totalAmount: result.transaction.totalAmount,
          itemsCount: data.items.length,
          customerName: customer.firstName,
        }).catch(err => {
          console.error("Failed to send customer bill:", err);
        });
      }
    } else if (data.walkinPhone) {
      sendCustomerBillWhatsApp(data.walkinPhone, {
        transactionNumber: result.transaction.transactionNumber,
        totalAmount: result.transaction.totalAmount,
        itemsCount: data.items.length,
        customerName: "Walk-in Customer",
      }).catch(err => {
        console.error("Failed to send walk-in customer bill:", err);
      });
    }

    return {
      ...result.transaction,
      subtotal: Number(result.transaction.subtotal),
      discountAmount: Number(result.transaction.discountAmount),
      taxAmount: Number(result.transaction.taxAmount),
      totalAmount: Number(result.transaction.totalAmount),
    };
  });

// 2. Get Transactions List
export const getTransactionsServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const deptScope = getDepartmentScope(data.role, data.email);

    const where: any = {};
    if (deptScope) {
      where.departmentId = deptScope;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        customer: true,
        payments: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { transactionDate: "desc" },
    });

    const depts = await prisma.department.findMany();

    const mappedList: TransactionListItem[] = transactions.map((t) => {
      const deptObj = depts.find((d) => d.id === t.departmentId);

      return {
        id: t.id,
        transactionNumber: t.transactionNumber,
        customerName: t.customer ? `${t.customer.firstName} ${t.customer.lastName}`.trim() : "Walk-in Customer",
        customerId: t.customerId,
        dept: deptObj ? deptObj.name : "Others",
        departmentId: t.departmentId,
        date: t.transactionDate.toISOString().split("T")[0],
        time: t.transactionDate.toTimeString().split(" ")[0].slice(0, 5),
        subtotal: Number(t.subtotal),
        discount: Number(t.discountAmount),
        tax: Number(t.taxAmount),
        total: Number(t.totalAmount),
        payment: t.payments[0]?.method || "UPI",
        status: t.status,
        items: t.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: Number(item.unitPrice),
        })),
      };
    });

    return mappedList;
  });
