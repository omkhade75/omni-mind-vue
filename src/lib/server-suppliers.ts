import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

export const getSuppliers = createServerFn({ method: "GET" })
  .handler(async () => {
    const suppliers = await prisma.supplier.findMany({
      include: {
        purchaseOrders: true,
        supplierProducts: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return suppliers.map((s) => {
      const receivedPOs = s.purchaseOrders.filter((po) => po.status === "Received");
      const pendingPOs = s.purchaseOrders.filter(
        (po) => po.status === "Draft" || po.status === "Ordered" || po.status === "Sent"
      );

      const spend = receivedPOs.reduce((sum, po) => sum + Number(po.totalAmount), 0);
      const pending = pendingPOs.reduce((sum, po) => sum + Number(po.totalAmount), 0);

      const onTime = Number(s.onTimeDeliveryRate);
      const quality = Number(s.qualityScore);
      const riskScore = Number(s.riskScore);
      const lead = s.leadTimeDays;

      let risk = "Low";
      if (riskScore > 60) risk = "High";
      else if (riskScore > 30) risk = "Medium";

      const score = Math.round(onTime + quality - riskScore / 2);

      return {
        id: s.id,
        supplierCode: s.supplierCode,
        name: s.name,
        category: s.supplierProducts[0]?.product.category.name || "General",
        contact: s.contactPerson,
        spend,
        pending,
        onTime,
        quality,
        lead,
        risk,
        score: Math.min(100, Math.max(0, score)),
        email: s.email,
        phone: s.phone,
        address: s.address,
        paymentTerms: s.paymentTerms,
      };
    });
  });

export const addSupplier = createServerFn({ method: "POST" })
  .validator((data: {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    leadTimeDays: number;
  }) => data)
  .handler(async ({ data: payload }) => {
    const count = await prisma.supplier.count();
    const supplierCode = `SUP-${String(count + 101).padStart(3, "0")}`;

    const supplier = await prisma.supplier.create({
      data: {
        supplierCode,
        name: payload.name,
        contactPerson: payload.contactPerson,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        paymentTerms: payload.paymentTerms,
        leadTimeDays: payload.leadTimeDays,
        onTimeDeliveryRate: 100.0,
        qualityScore: 100.0,
        riskScore: 0.0,
        status: "Active",
      },
    });

    return { success: true, supplier };
  });

export const getPurchaseOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    const pos = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    return pos.map((po) => {
      const productName =
        po.items.length === 1
          ? po.items[0].product.name
          : po.items.length > 1
          ? `${po.items[0].product.name} +${po.items.length - 1} more`
          : "Unknown Product";

      const productId = po.items.length > 0 ? po.items[0].product.id : "";
      const quantity = po.items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: po.poNumber,
        dbId: po.id,
        date: po.orderDate.toISOString().split("T")[0],
        productName,
        productId,
        supplierName: po.supplier.name,
        supplierId: po.supplier.id,
        quantity,
        totalCost: Number(po.totalAmount),
        source: po.notes || "Manual",
        status: po.status,
      };
    });
  });

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .validator((data: {
    supplierId: string;
    departmentId?: string;
    expectedDeliveryDate?: string;
    notes?: string;
    createdBy: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitCost: number;
    }>;
  }) => data)
  .handler(async ({ data: payload }) => {
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${String(count + 1001).padStart(4, "0")}`;

    let subtotal = 0;
    for (const item of payload.items) {
      subtotal += item.quantity * item.unitCost;
    }
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: payload.supplierId,
        departmentId: payload.departmentId,
        status: "Sent",
        orderDate: new Date(),
        expectedDeliveryDate: payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : null,
        subtotal,
        taxAmount,
        totalAmount,
        createdBy: payload.createdBy,
        notes: payload.notes,
        items: {
          create: payload.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            lineTotal: item.quantity * item.unitCost
          }))
        }
      }
    });

    return { success: true, po };
  });

export const receivePurchaseOrder = createServerFn({ method: "POST" })
  .validator((data: { poId: string, receivedBy: string }) => data)
  .handler(async ({ data: payload }) => {
    return await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: payload.poId },
        include: { items: true }
      });

      if (!po) throw new Error("PO not found");
      if (po.status === "Received") throw new Error("PO already received");

      // Mark PO as received
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "Received" }
      });

      // Create GoodsReceipt
      await tx.goodsReceipt.create({
        data: {
          purchaseOrderId: po.id,
          receivedBy: payload.receivedBy,
        }
      });

      // Get default location
      const warehouse = await tx.inventoryLocation.findFirst({
        where: { type: "WAREHOUSE" }
      });

      if (!warehouse) throw new Error("Warehouse location not found");

      // Add inventory stocks
      for (const item of po.items) {
        const stock = await tx.inventoryStock.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: warehouse.id
            }
          }
        });

        if (stock) {
          await tx.inventoryStock.update({
            where: { id: stock.id },
            data: {
              quantityOnHand: stock.quantityOnHand + item.quantity,
              availableQty: stock.availableQty + item.quantity
            }
          });
        } else {
          await tx.inventoryStock.create({
            data: {
              productId: item.productId,
              locationId: warehouse.id,
              quantityOnHand: item.quantity,
              availableQty: item.quantity
            }
          });
        }

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            locationId: warehouse.id,
            movementType: "PURCHASE_RECEIPT",
            quantity: item.quantity,
            referenceType: "PurchaseOrder",
            referenceId: po.id,
            performedBy: payload.receivedBy
          }
        });

        const batchCount = await tx.productBatch.count({
          where: { productId: item.productId }
        });
        
        await tx.productBatch.create({
          data: {
            productId: item.productId,
            batchNumber: `BATCH-${po.poNumber}-${batchCount + 1}`,
            quantityReceived: item.quantity,
            quantityRemaining: item.quantity,
            costPrice: item.unitCost,
            supplierId: po.supplierId,
            status: "Safe"
          }
        });
      }

      return { success: true };
    });
  });
