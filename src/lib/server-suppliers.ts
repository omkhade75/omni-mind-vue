import { createServerFn } from "@tanstack/react-start";
import { getTenantPrisma } from "./server/prisma";
import { requireAuth } from "./server-auth";

export const getSuppliers = createServerFn({ method: "GET" }).handler(async () => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
  const suppliers = await prisma.supplier.findMany({
    where: { status: { not: "Archived" } } as any,
    include: {
      purchaseOrders: true,
      supplierProducts: true,
    },
    orderBy: { name: "asc" },
  });

  const products = await prisma.product.findMany({
    include: { category: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return suppliers.map((s) => {
    const receivedPOs = s.purchaseOrders.filter(
      (po) => po.status === "Received" || po.status === "Partially_Received",
    );
    const pendingPOs = s.purchaseOrders.filter(
      (po) =>
        po.status === "Draft" ||
        po.status === "Ordered" ||
        po.status === "Sent" ||
        po.status === "Approved" ||
        po.status === "Submitted",
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

    const firstProductId = s.supplierProducts[0]?.productId;
    const associatedProduct = firstProductId ? productMap.get(firstProductId) : null;
    const category = associatedProduct?.category?.name || "General";

    return {
      id: s.id,
      supplierCode: s.supplierCode,
      name: s.name,
      category,
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
  .validator(
    (data: {
      name: string;
      contactPerson: string;
      email: string;
      phone: string;
      address: string;
      paymentTerms: string;
      leadTimeDays: number;
      role: string;
      emailUser: string;
    }) => data,
  )
  .handler(async ({ data: payload }) => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
    const role = payload.role.toLowerCase();
    if (role !== "owner" && role !== "admin" && role !== "manager") {
      throw new Error("Unauthorized");
    }

    const count = await prisma.supplier.count();
    const supplierCode = `SUP-${String(count + 101).padStart(3, "0")}`;

    const supplier = // @ts-ignore
 await prisma.supplier.create({
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
            } as any,
    });

    const user = // @ts-ignore
 await prisma.user.findUnique({ where: { email: payload.emailUser } as any });
    if (user) {
      // @ts-ignore
      await prisma.auditLog.create({
        data: {
                  userId: user.id,
                  action: "CREATE_SUPPLIER",
                  entityType: "Supplier",
                  entityId: supplier.id,
                } as any,
      });
    }

    return {
      success: true,
      supplier: {
        id: supplier.id,
        supplierCode: supplier.supplierCode,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        leadTimeDays: supplier.leadTimeDays,
        onTimeDeliveryRate: Number(supplier.onTimeDeliveryRate),
        qualityScore: Number(supplier.qualityScore),
        riskScore: Number(supplier.riskScore),
        status: supplier.status,
      },
    };
  });

export const editSupplierServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      name: string;
      contactPerson: string;
      email: string;
      phone: string;
      address: string;
      paymentTerms: string;
      leadTimeDays: number;
      role: string;
      emailUser: string;
    }) => data,
  )
  .handler(async ({ data: payload }) => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
    const role = payload.role.toLowerCase();
    if (role !== "owner" && role !== "admin") {
      throw new Error("Only Owner and Admin can edit suppliers");
    }

    const supplier = // @ts-ignore
 await prisma.supplier.update({
      where: { id: payload.id } as any,
      data: {
              name: payload.name,
              contactPerson: payload.contactPerson,
              email: payload.email,
              phone: payload.phone,
              address: payload.address,
              paymentTerms: payload.paymentTerms,
              leadTimeDays: payload.leadTimeDays,
            } as any,
    });

    const user = // @ts-ignore
 await prisma.user.findUnique({ where: { email: payload.emailUser } as any });
    if (user) {
      // @ts-ignore
      await prisma.auditLog.create({
        data: {
                  userId: user.id,
                  action: "EDIT_SUPPLIER",
                  entityType: "Supplier",
                  entityId: supplier.id,
                } as any,
      });
    }

    return {
      success: true,
      supplier: {
        id: supplier.id,
        supplierCode: supplier.supplierCode,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        leadTimeDays: supplier.leadTimeDays,
        onTimeDeliveryRate: Number(supplier.onTimeDeliveryRate),
        qualityScore: Number(supplier.qualityScore),
        riskScore: Number(supplier.riskScore),
        status: supplier.status,
      },
    };
  });

export const archiveSupplierServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; role: string; emailUser: string }) => data)
  .handler(async ({ data: payload }) => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
    const role = payload.role.toLowerCase();
    if (role !== "owner" && role !== "admin") {
      throw new Error("Only Owner and Admin can archive suppliers");
    }

    const supplier = // @ts-ignore
 await prisma.supplier.update({
      where: { id: payload.id } as any,
      data: { status: "Archived" } as any,
    });

    const user = // @ts-ignore
 await prisma.user.findUnique({ where: { email: payload.emailUser } as any });
    if (user) {
      // @ts-ignore
      await prisma.auditLog.create({
        data: {
                  userId: user.id,
                  action: "ARCHIVE_SUPPLIER",
                  entityType: "Supplier",
                  entityId: supplier.id,
                } as any,
      });
    }

    return {
      success: true,
      supplier: {
        id: supplier.id,
        supplierCode: supplier.supplierCode,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        leadTimeDays: supplier.leadTimeDays,
        onTimeDeliveryRate: Number(supplier.onTimeDeliveryRate),
        qualityScore: Number(supplier.qualityScore),
        riskScore: Number(supplier.riskScore),
        status: supplier.status,
      },
    };
  });

export const getPurchaseOrders = createServerFn({ method: "GET" }).handler(async () => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
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

  // Check which POs have been paid by querying ledger entries
  const paidEntries = await prisma.ledgerEntry.findMany({
    where: {
          referenceType: "PurchaseOrderPayment",
        } as any,
    select: {
      referenceId: true,
    },
  });
  const paidPoIds = new Set(paidEntries.map((e) => e.referenceId).filter(Boolean));

  return pos.map((po) => {
    const productName =
      po.items.length === 1
        ? po.items[0].product.name
        : po.items.length > 1
          ? `${po.items[0].product.name} +${po.items.length - 1} more`
          : "Unknown Product";

    const productId = po.items.length > 0 ? po.items[0].product.id : "";
    const quantity = po.items.reduce((sum, item) => sum + item.quantity, 0);
    const receivedQuantity = po.items.reduce((sum, item) => sum + item.receivedQuantity, 0);

    return {
      id: po.poNumber,
      dbId: po.id,
      date: po.orderDate.toISOString().split("T")[0],
      productName,
      productId,
      supplierName: po.supplier.name,
      supplierId: po.supplier.id,
      quantity,
      receivedQuantity,
      totalCost: Number(po.totalAmount),
      source: po.notes || "Manual",
      status: po.status,
      isPaid: paidPoIds.has(po.id),
    };
  });
});

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .validator(
    (data: {
      supplierId: string;
      departmentId?: string;
      expectedDeliveryDate?: string;
      notes?: string;
      createdBy: string;
      status?: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitCost: number;
      }>;
    }) => data,
  )
  .handler(async ({ data: payload }) => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${String(count + 1001).padStart(4, "0")}`;

    let subtotal = 0;
    for (const item of payload.items) {
      subtotal += item.quantity * item.unitCost;
    }
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    const po = // @ts-ignore
 await prisma.purchaseOrder.create({
      data: {
              poNumber,
              supplierId: payload.supplierId,
              departmentId: payload.departmentId,
              status: payload.status || "Draft",
              orderDate: new Date(),
              expectedDeliveryDate: payload.expectedDeliveryDate
                ? new Date(payload.expectedDeliveryDate)
                : null,
              subtotal,
              taxAmount,
              totalAmount,
              createdBy: payload.createdBy,
              notes: payload.notes,
              items: {
                create: payload.items.map((item: any) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  receivedQuantity: 0,
                  unitCost: item.unitCost,
                  lineTotal: item.quantity * item.unitCost,
                })),
              },
            } as any,
    });

    const user = // @ts-ignore
 await prisma.user.findUnique({ where: { email: payload.createdBy } as any });
    if (user) {
      // @ts-ignore
      await prisma.auditLog.create({
        data: {
                  userId: user.id,
                  action: "CREATE_PO",
                  entityType: "PurchaseOrder",
                  entityId: po.id,
                } as any,
      });
    }

    return {
      success: true,
      po: {
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        totalAmount: Number(po.totalAmount),
      },
    };
  });

export const updatePurchaseOrderStatusServer = createServerFn({ method: "POST" })
  .validator((data: { poId: string; status: string; role: string; emailUser: string }) => data)
  .handler(async ({ data: payload }) => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
    const po = // @ts-ignore
 await prisma.purchaseOrder.update({
      where: { id: payload.poId } as any,
      data: { status: payload.status } as any,
    });

    const user = // @ts-ignore
 await prisma.user.findUnique({ where: { email: payload.emailUser } as any });
    if (user) {
      // @ts-ignore
      await prisma.auditLog.create({
        data: {
                  userId: user.id,
                  action: `UPDATE_PO_STATUS_${payload.status.toUpperCase()}`,
                  entityType: "PurchaseOrder",
                  entityId: po.id,
                } as any,
      });
    }

    return {
      success: true,
      po: {
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
      },
    };
  });

export const getPurchaseOrderDetailsServer = createServerFn({ method: "POST" })
  .validator((data: { poId: string }) => data)
  .handler(async ({ data: payload }) => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
    const po = // @ts-ignore
 await prisma.purchaseOrder.findUnique({
      where: { id: payload.poId } as any,
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });
    if (!po) return null;
    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      departmentId: po.departmentId,
      status: po.status,
      orderDate: po.orderDate.toISOString(),
      expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.toISOString() : null,
      subtotal: Number(po.subtotal),
      taxAmount: Number(po.taxAmount),
      totalAmount: Number(po.totalAmount),
      createdBy: po.createdBy,
      approvedBy: po.approvedBy,
      notes: po.notes,
      supplier: {
        id: po.supplier.id,
        supplierCode: po.supplier.supplierCode,
        name: po.supplier.name,
        contactPerson: po.supplier.contactPerson,
        email: po.supplier.email,
        phone: po.supplier.phone,
        address: po.supplier.address,
        paymentTerms: po.supplier.paymentTerms,
        leadTimeDays: po.supplier.leadTimeDays,
        onTimeDeliveryRate: Number(po.supplier.onTimeDeliveryRate),
        qualityScore: Number(po.supplier.qualityScore),
        riskScore: Number(po.supplier.riskScore),
        status: po.supplier.status,
      },
      items: po.items.map((item) => ({
        id: item.id,
        purchaseOrderId: item.purchaseOrderId,
        productId: item.productId,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        unitCost: Number(item.unitCost),
        lineTotal: Number(item.lineTotal),
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
        },
      })),
    };
  });

export const receivePurchaseOrderGoodsServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      poId: string;
      receivedByEmail: string;
      role: string;
      itemsToReceive: Array<{
        itemId: string;
        productId: string;
        quantity: number;
      }>;
    }) => data,
  )
  .handler(async ({ data: payload }) => {
    const authUser = await requireAuth();
    const prisma = getTenantPrisma(authUser.workspaceId);
    return await prisma.$transaction(async (tx) => {
      const po = // @ts-ignore
 await tx.purchaseOrder.findUnique({
        where: { id: payload.poId } as any,
        include: { items: true },
      });

      if (!po) throw new Error("PO not found");
      if (po.status === "Received") throw new Error("PO already fully received");
      if (po.status === "Draft" || po.status === "Submitted")
        throw new Error("PO must be Ordered or Partially_Received");

      const user = // @ts-ignore
 await tx.user.findUnique({ where: { email: payload.receivedByEmail } as any });
      if (!user) throw new Error("User not found");

      // Create GoodsReceipt
      const goodsReceipt = // @ts-ignore
 await tx.goodsReceipt.create({
        data: {
                  purchaseOrderId: po.id,
                  receivedBy: user.id,
                  items: {
                    create: payload.itemsToReceive.map((i: any) => ({
                      productId: i.productId,
                      quantity: i.quantity,
                    })),
                  },
                } as any,
      });

      const warehouse = await tx.inventoryLocation.findFirst({
        where: { type: "WAREHOUSE" } as any,
      });
      if (!warehouse) throw new Error("Warehouse location not found");

      let allFullyReceived = true;

      for (const itemToReceive of payload.itemsToReceive) {
        if (itemToReceive.quantity <= 0) continue;

        const poItem = po.items.find((i) => i.id === itemToReceive.itemId);
        if (!poItem) continue;

        const newReceivedQty = poItem.receivedQuantity + itemToReceive.quantity;
        if (newReceivedQty < poItem.quantity) {
          allFullyReceived = false;
        }

        // Update PO Item
        // @ts-ignore
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id } as any,
          data: { receivedQuantity: newReceivedQty } as any,
        });

        // Add inventory stocks
        const stock = // @ts-ignore
 await tx.inventoryStock.findUnique({
          where: {
                      productId_locationId: {
                        productId: itemToReceive.productId,
                        locationId: warehouse.id,
                      },
                    } as any,
        });

        if (stock) {
          // @ts-ignore
          await tx.inventoryStock.update({
            where: { id: stock.id } as any,
            data: {
                          quantityOnHand: stock.quantityOnHand + itemToReceive.quantity,
                          availableQty: stock.availableQty + itemToReceive.quantity,
                        } as any,
          });
        } else {
          // @ts-ignore
          await tx.inventoryStock.create({
            data: {
                          productId: itemToReceive.productId,
                          locationId: warehouse.id,
                          quantityOnHand: itemToReceive.quantity,
                          availableQty: itemToReceive.quantity,
                        } as any,
          });
        }

        // Inventory Movement
        // @ts-ignore
        await tx.inventoryMovement.create({
          data: {
                      productId: itemToReceive.productId,
                      locationId: warehouse.id,
                      movementType: "PURCHASE_RECEIPT",
                      quantity: itemToReceive.quantity,
                      referenceType: "GoodsReceipt",
                      referenceId: goodsReceipt.id,
                      performedBy: user.id,
                    } as any,
        });
      }

      // Check if ANY item is still not fully received
      // Wait, allFullyReceived was only checking items we just received. We need to check all items.
      const updatedPoItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: po.id } as any,
      });
      const finalFullyReceived = updatedPoItems.every((i) => i.receivedQuantity >= i.quantity);

      const newStatus = finalFullyReceived ? "Received" : "Partially_Received";

      // @ts-ignore
      await tx.purchaseOrder.update({
        where: { id: po.id } as any,
        data: { status: newStatus } as any,
      });

      // @ts-ignore
      await tx.auditLog.create({
        data: {
                  userId: user.id,
                  action: "RECEIVE_GOODS",
                  entityType: "PurchaseOrder",
                  entityId: po.id,
                } as any,
      });

      // @ts-ignore
      await tx.businessEvent.create({
        data: {
                  eventType: "PO_RECEIVED",
                  entityType: "PurchaseOrder",
                  entityId: po.id,
                  title: `PO ${po.poNumber} ${newStatus}`,
                  description: `Received goods for PO ${po.poNumber}`,
                  actorId: user.id,
                } as any,
      });

      return { success: true, status: newStatus };
    });
  });
