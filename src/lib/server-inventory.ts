import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { getDepartmentScope } from "./server-customers";

export interface StockListItem {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  dept: string;
  warehouseQty: number;
  retailQty: number;
  totalQty: number;
  reorderLevel: number;
  status: "Safe" | "Low Stock" | "Stockout";
  stockoutRiskDays: number | null; // null if safe or no sales
}

export interface MovementHistoryItem {
  id: string;
  productName: string;
  sku: string;
  locationName: string;
  movementType: string;
  quantity: number;
  reason: string | null;
  occurredAt: string;
  performedBy: string | null;
}

// 1. Mutate Stock (Atomic Stock ledger mutation)
export const mutateInventoryServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      productId: string;
      locationId: string;
      targetLocationId?: string; // for transfers
      movementType:
        | "SALE"
        | "RETURN"
        | "PURCHASE_RECEIPT"
        | "ADJUSTMENT_IN"
        | "ADJUSTMENT_OUT"
        | "DAMAGE"
        | "EXPIRED"
        | "TRANSFER";
      quantity: number;
      reason?: string;
      batchId?: string;
      role: string;
      emailUser: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    if (data.quantity <= 0) {
      throw new Error("Quantity must be a positive integer.");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch current stock at source
      const sourceStock = await tx.inventoryStock.findUnique({
        where: { productId_locationId: { productId: data.productId, locationId: data.locationId } },
      });

      const currentSourceQty = sourceStock ? sourceStock.quantityOnHand : 0;

      // Handle stock validations
      const isReduction = ["SALE", "ADJUSTMENT_OUT", "DAMAGE", "EXPIRED", "TRANSFER"].includes(
        data.movementType,
      );

      if (isReduction && currentSourceQty < data.quantity) {
        throw new Error(
          `Insufficient stock at source location. Available: ${currentSourceQty}, Requested: ${data.quantity}`,
        );
      }

      // Update source location
      const updatedSource = await tx.inventoryStock.upsert({
        where: { productId_locationId: { productId: data.productId, locationId: data.locationId } },
        update: {
          quantityOnHand: { decrement: isReduction ? data.quantity : -data.quantity },
          availableQty: { decrement: isReduction ? data.quantity : -data.quantity },
        },
        create: {
          productId: data.productId,
          locationId: data.locationId,
          quantityOnHand: isReduction ? -data.quantity : data.quantity,
          availableQty: isReduction ? -data.quantity : data.quantity,
        },
      });

      // Write source movement
      await tx.inventoryMovement.create({
        data: {
          productId: data.productId,
          locationId: data.locationId,
          movementType: data.movementType === "TRANSFER" ? "ADJUSTMENT_OUT" : data.movementType,
          quantity: data.quantity,
          reason:
            data.reason ||
            (data.movementType === "TRANSFER" ? `Transfer to ${data.targetLocationId}` : null),
          performedBy: data.role,
        },
      });

      // Handle transfer target location
      if (data.movementType === "TRANSFER" && data.targetLocationId) {
        await tx.inventoryStock.upsert({
          where: {
            productId_locationId: { productId: data.productId, locationId: data.targetLocationId },
          },
          update: {
            quantityOnHand: { increment: data.quantity },
            availableQty: { increment: data.quantity },
          },
          create: {
            productId: data.productId,
            locationId: data.targetLocationId,
            quantityOnHand: data.quantity,
            availableQty: data.quantity,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: data.productId,
            locationId: data.targetLocationId,
            movementType: "ADJUSTMENT_IN",
            quantity: data.quantity,
            reason: data.reason || `Transfer from ${data.locationId}`,
            performedBy: data.role,
          },
        });
      }

      // If batchId is specified and it's an outbound reduction, decrement batch quantities
      if (data.batchId && isReduction) {
        await tx.productBatch.update({
          where: { id: data.batchId },
          data: {
            quantityRemaining: { decrement: data.quantity },
          },
        });
      }

      // AuditLog
      await tx.auditLog.create({
        data: {
          userId:
            data.role === "manager"
              ? "rohan-kulkarni"
              : data.role === "admin"
                ? "priya-nair"
                : "aarav-mehra",
          action: `INVENTORY_${data.movementType}`,
          entityType: "Product",
          entityId: data.productId,
          afterData: JSON.stringify({
            productId: data.productId,
            locationId: data.locationId,
            qty: data.quantity,
            type: data.movementType,
          }),
        },
      });

      // Business Event for high priority movements (Damages, Expiries)
      if (["DAMAGE", "EXPIRED"].includes(data.movementType)) {
        await tx.businessEvent.create({
          data: {
            eventType: `INVENTORY_ALERT_${data.movementType}`,
            entityType: "Product",
            entityId: data.productId,
            title: `Inventory Shrinkage Alert: ${data.movementType}`,
            description: `${data.quantity} units of product (ID: ${data.productId}) set to ${data.movementType}. Reason: ${data.reason || "None"}`,
          },
        });
      }

      return updatedSource;
    });

    return result;
  });

// 2. Get Inventory Stock List (with low stock, risk estimation)
export const getInventoryStockServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const deptScope = getDepartmentScope(data.role, data.email);

    const where: any = {
      status: "Active",
    };

    if (deptScope) {
      where.departmentId = deptScope;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        stockItems: {
          include: {
            location: true,
          },
        },
      },
    });

    const depts = await prisma.department.findMany();

    // Calculate 30-day sales velocity per product to estimate stockout risk
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 30);

    const completedTxItems = await prisma.transactionItem.findMany({
      where: {
        transaction: {
          status: { in: ["Completed", "Paid"] },
          transactionDate: { gte: dateLimit },
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    // Map velocity
    const salesVelocityMap: Record<string, number> = {};
    completedTxItems.forEach((item) => {
      salesVelocityMap[item.productId] = (salesVelocityMap[item.productId] || 0) + item.quantity;
    });

    const list: StockListItem[] = products.map((p) => {
      const warehouseStock = p.stockItems.find((s) => s.location.type === "WAREHOUSE");
      const retailStock = p.stockItems.find((s) => s.location.type === "RETAIL_FLOOR");

      const warehouseQty = warehouseStock ? warehouseStock.quantityOnHand : 0;
      const retailQty = retailStock ? retailStock.quantityOnHand : 0;
      const totalQty = warehouseQty + retailQty;

      const deptObj = depts.find((d) => d.id === p.departmentId);

      // Status
      let status: "Safe" | "Low Stock" | "Stockout" = "Safe";
      if (totalQty === 0) {
        status = "Stockout";
      } else if (totalQty <= p.reorderLevel) {
        status = "Low Stock";
      }

      // Sales velocity calculation (units/day)
      const totalSales30d = salesVelocityMap[p.id] || 0;
      const dailyVelocity = totalSales30d / 30;

      let stockoutRiskDays: number | null = null;
      if (totalQty > 0 && dailyVelocity > 0) {
        stockoutRiskDays = Math.round(totalQty / dailyVelocity);
      }

      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category.name,
        dept: deptObj ? deptObj.name : "Others",
        warehouseQty,
        retailQty,
        totalQty,
        reorderLevel: p.reorderLevel,
        status,
        stockoutRiskDays,
      };
    });

    return list;
  });

// 3. Get Inventory Movement Ledger History
export const getInventoryMovementsServer = createServerFn({ method: "POST" })
  .validator((data: { productId?: string; role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const deptScope = getDepartmentScope(data.role, data.email);

    const where: any = {};
    if (data.productId) {
      where.productId = data.productId;
    }

    if (deptScope) {
      where.product = {
        departmentId: deptScope,
      };
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        product: true,
        location: true,
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
    });

    const mappedMovements: MovementHistoryItem[] = movements.map((m) => ({
      id: m.id,
      productName: m.product.name,
      sku: m.product.sku,
      locationName: m.location.name,
      movementType: m.movementType,
      quantity: m.quantity,
      reason: m.reason,
      occurredAt: m.occurredAt.toISOString().split("T")[0],
      performedBy: m.performedBy,
    }));

    return mappedMovements;
  });

export const getExpiryIntelligenceServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string; activeDate?: string }) => data)
  .handler(async ({ data }) => {
    // We only care about products that have batches with expiryDate
    const batches = await prisma.productBatch.findMany({
      where: {
        expiryDate: { not: null },
        quantityRemaining: { gt: 0 },
        product: {
          departmentId: { in: ["dept-grocery", "dept-beauty"] },
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const activeDate = data.activeDate ? new Date(data.activeDate) : new Date();

    const perishable = batches.map((batch) => {
      const days = Math.ceil((batch.expiryDate!.getTime() - activeDate.getTime()) / 86400000);

      const deptName =
        batch.product.departmentId === "dept-grocery"
          ? "Grocery"
          : batch.product.departmentId === "dept-fashion"
            ? "Fashion"
            : batch.product.departmentId === "dept-electronics"
              ? "Electronics"
              : batch.product.departmentId === "dept-beauty"
                ? "Beauty"
                : "Other";

      return {
        id: batch.id,
        productId: batch.product.id,
        name: batch.product.name,
        sku: batch.product.sku,
        department: deptName,
        batchNumber: batch.batchNumber,
        expiry: batch.expiryDate!.toISOString(),
        days: days,
        stock: batch.quantityRemaining,
        cost: Number(batch.costPrice),
        status: batch.status,
      };
    });

    // Sort by days to expiry ascending
    perishable.sort((a, b) => a.days - b.days);

    return perishable;
  });
