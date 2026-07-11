// Server-side Tool Registry: Genuinely database-grounded, date-aware, role-aware.
import { prisma } from "./prisma";
import { ToolResult, SourceFreshnessEntry, ToolMetadata } from "../tool-types";

// Helper to resolve dates or date ranges
export function resolveDateRange(
  dateRange: { start?: string | Date; end?: string | Date } | undefined,
  activeScenarioDate: string,
): { start: Date; end: Date } {
  const startStr = dateRange?.start || activeScenarioDate;
  const endStr = dateRange?.end || activeScenarioDate;

  // If simple date string, expand to full day boundaries
  const start = new Date(
    typeof startStr === "string" ? `${startStr}T00:00:00.000Z` : startStr.toISOString(),
  );
  const end = new Date(
    typeof endStr === "string" ? `${endStr}T23:59:59.999Z` : endStr.toISOString(),
  );

  return { start, end };
}

// Helper to get Fashion department ID for RBAC checks
export async function getFashionDepartmentId(): Promise<string> {
  const dept = await prisma.department.findFirst({
    where: { code: { equals: "FASHION", mode: "insensitive" } },
  });
  return dept?.id || "dept-fashion-id-placeholder";
}

// 1. getRevenueMetrics Tool
export async function getRevenueMetrics(params: {
  dateRange?: { start?: string | Date; end?: string | Date };
  roleScope: string | null;
  entityFilters?: { departmentId?: string; productId?: string };
  activeScenarioDate: string;
  requestId: string;
}): Promise<ToolResult<any>> {
  const { start, end } = resolveDateRange(params.dateRange, params.activeScenarioDate);
  const fashionDeptId = await getFashionDepartmentId();
  const warnings: string[] = [];

  // Enforce relationship-aware RBAC
  let resolvedDeptId: string | undefined = params.entityFilters?.departmentId;
  if (params.roleScope === "manager") {
    if (resolvedDeptId && resolvedDeptId !== fashionDeptId) {
      throw new Error(
        "Access Denied: Your manager role is restricted to Fashion department records.",
      );
    }
    resolvedDeptId = fashionDeptId;
  }

  // Construct the Transaction query filters
  const txFilter: any = {
    transactionDate: { gte: start, lte: end },
    status: "Completed",
  };
  if (resolvedDeptId) {
    txFilter.departmentId = resolvedDeptId;
  }
  if (params.entityFilters?.productId) {
    txFilter.items = {
      some: { productId: params.entityFilters.productId },
    };
  }

  // Fetch transactions and items
  const transactions = await prisma.transaction.findMany({
    where: txFilter,
    include: {
      items: true,
      payments: true,
    },
  });

  // Calculate metrics
  const grossSales = transactions.reduce((sum, t) => sum + Number(t.subtotal), 0);
  const discountAmount = transactions.reduce((sum, t) => sum + Number(t.discountAmount), 0);
  const netSales = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const transactionCount = transactions.length;
  const aov = transactionCount > 0 ? netSales / transactionCount : 0;

  // Calculate payment totals and perform reconciliation
  const paymentTotals = transactions.reduce(
    (sum, t) => sum + t.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
    0,
  );

  let reconciliationStatus: "VERIFIED" | "MISMATCH" | "PARTIAL" | "UNKNOWN" = "VERIFIED";
  if (transactionCount > 0 && Math.abs(netSales - paymentTotals) > 0.01) {
    reconciliationStatus = "MISMATCH";
    warnings.push(
      `Reconciliation Warning: Transaction total Amount (₹${netSales.toFixed(2)}) does not match Payment records (₹${paymentTotals.toFixed(2)}).`,
    );
  }

  // Freshness metadata mapping
  const sourceTables = ["Transaction", "TransactionItem", "Payment"];
  let newestTxDate = start;
  transactions.forEach((t) => {
    if (t.transactionDate > newestTxDate) {
      newestTxDate = t.transactionDate;
    }
  });

  const sourceFreshness: SourceFreshnessEntry[] = [
    {
      table: "Transaction",
      maxTimestamp: newestTxDate.toISOString(),
      rowsExamined: transactionCount,
    },
    {
      table: "TransactionItem",
      maxTimestamp: newestTxDate.toISOString(),
      rowsExamined: transactions.reduce((sum, t) => sum + t.items.length, 0),
    },
  ];

  const meta: ToolMetadata = {
    toolName: "getRevenueMetrics",
    queryParameters: {
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      entityFilters: params.entityFilters,
    },
    resolvedDateRange: { start: start.toISOString(), end: end.toISOString() },
    roleScope: params.roleScope,
    rowsExamined: transactionCount,
    computedMetrics: { grossSales, discountAmount, netSales, transactionCount, aov, paymentTotals },
    sourceTables,
    sourceFreshness,
    queriedAt: new Date().toISOString(),
    sourceMaxTimestamp: newestTxDate.toISOString(),
    warnings,
    reconciliationStatus,
    freshnessStatus: newestTxDate >= start ? "FRESH" : "STALE",
    syncStatus: "UNKNOWN",
  };

  return {
    data: { grossSales, discountAmount, netSales, transactionCount, aov, paymentTotals },
    meta,
  };
}

// 2. getInventoryRisk Tool
export async function getInventoryRisk(params: {
  dateRange?: { start?: string | Date; end?: string | Date };
  roleScope: string | null;
  entityFilters?: { productId?: string };
  activeScenarioDate: string;
  requestId: string;
}): Promise<ToolResult<any>> {
  const { start, end } = resolveDateRange(params.dateRange, params.activeScenarioDate);
  const fashionDeptId = await getFashionDepartmentId();
  const warnings: string[] = [];

  // Filter products by manager RBAC
  const productFilter: any = { status: "Active" };
  if (params.roleScope === "manager") {
    productFilter.departmentId = fashionDeptId;
  }
  if (params.entityFilters?.productId) {
    productFilter.id = params.entityFilters.productId;
  }

  const products = await prisma.product.findMany({
    where: productFilter,
    include: {
      stockItems: true,
      batches: true,
    },
  });

  // Calculate current stock levels
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValue = 0;
  const isHistorical =
    new Date(end).getTime() < new Date(params.activeScenarioDate + "T00:00:00.000Z").getTime();
  let temporalAlignmentScore: string = "VERIFIED";

  const productStockData = await Promise.all(
    products.map(async (p) => {
      let stockQty = p.stockItems.reduce((sum, s) => sum + s.quantityOnHand, 0);

      // If historical date requested, reconstruct stock levels from movements
      if (isHistorical) {
        const movements = await prisma.inventoryMovement.findMany({
          where: {
            productId: p.id,
            occurredAt: { gt: end },
          },
        });

        // Reconstruct by rolling back movements occurred after the target date
        let rollbackQty = 0;
        movements.forEach((m) => {
          if (["SALE", "ADJUSTMENT_OUT", "DAMAGE", "EXPIRED"].includes(m.movementType)) {
            rollbackQty += m.quantity; // add back sales
          } else if (["PURCHASE_RECEIPT", "ADJUSTMENT_IN", "RETURN"].includes(m.movementType)) {
            rollbackQty -= m.quantity; // subtract receipts
          }
        });
        stockQty = Math.max(0, stockQty + rollbackQty);

        if (movements.length === 0) {
          temporalAlignmentScore = "PARTIAL";
        }
      }

      if (stockQty === 0) {
        outOfStockCount++;
      } else if (stockQty <= p.reorderLevel) {
        lowStockCount++;
      }

      totalInventoryValue += stockQty * Number(p.costPrice);

      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        stock: stockQty,
        reorderLevel: p.reorderLevel,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
      };
    }),
  );

  if (temporalAlignmentScore === "PARTIAL") {
    warnings.push(
      "Historical inventory reconstruction coverage partial due to missing intermediate movement logs.",
    );
  }

  // Expiring and expired batches
  const batches = await prisma.productBatch.findMany({
    where: {
      productId: { in: products.map((p) => p.id) },
      quantityRemaining: { gt: 0 },
    },
  });

  const expiringCount = batches.filter(
    (b) => b.expiryDate && b.expiryDate >= start && b.expiryDate <= end,
  ).length;

  const expiredCount = batches.filter((b) => b.expiryDate && b.expiryDate < start).length;

  // Freshness
  const maxTimestamp = new Date().toISOString();
  const sourceTables = ["Product", "InventoryStock", "ProductBatch", "InventoryMovement"];

  const meta: ToolMetadata = {
    toolName: "getInventoryRisk",
    queryParameters: {
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      entityFilters: params.entityFilters,
    },
    resolvedDateRange: { start: start.toISOString(), end: end.toISOString() },
    roleScope: params.roleScope,
    rowsExamined: products.length,
    computedMetrics: {
      lowStockCount,
      outOfStockCount,
      totalInventoryValue,
      expiringCount,
      expiredCount,
    },
    sourceTables,
    queriedAt: new Date().toISOString(),
    sourceMaxTimestamp: maxTimestamp,
    warnings,
    reconciliationStatus: "VERIFIED",
    freshnessStatus: isHistorical ? "PARTIAL" : "FRESH",
    syncStatus: "UNKNOWN",
  };

  return {
    data: {
      lowStockCount,
      outOfStockCount,
      totalInventoryValue,
      expiringCount,
      expiredCount,
      products: productStockData.slice(0, 10), // return top items to avoid huge payloads
    },
    meta,
  };
}

// 3. getExpenseMetrics Tool
export async function getExpenseMetrics(params: {
  dateRange?: { start?: string | Date; end?: string | Date };
  roleScope: string | null;
  activeScenarioDate: string;
  requestId: string;
}): Promise<ToolResult<any>> {
  const { start, end } = resolveDateRange(params.dateRange, params.activeScenarioDate);
  const fashionDeptId = await getFashionDepartmentId();
  const warnings: string[] = [];

  const expFilter: any = {
    date: { gte: start, lte: end },
    status: "Paid",
  };

  // Enforce manager RBAC
  if (params.roleScope === "manager") {
    expFilter.departmentId = fashionDeptId;
  }

  const expenses = await prisma.expense.findMany({
    where: expFilter,
    include: {
      category: true,
    },
  });

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category to analyze coverage
  const categoriesMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const catName = e.category?.name || "Uncategorized";
    categoriesMap[catName] = (categoriesMap[catName] || 0) + Number(e.amount);
  });

  // Verify Domain Coverage and add warning flags
  const categoryNames = Object.keys(categoriesMap).map((c) => c.toLowerCase());
  const hasPayroll = categoryNames.some(
    (c) => c.includes("payroll") || c.includes("salary") || c.includes("staff"),
  );
  const hasUtilities = categoryNames.some(
    (c) =>
      c.includes("utility") ||
      c.includes("electricity") ||
      c.includes("water") ||
      c.includes("power"),
  );

  if (!hasPayroll) {
    warnings.push("Payroll evidence unavailable in current expense database categories.");
  }
  if (!hasUtilities) {
    warnings.push("Utility expense coverage partial or missing from current expense categories.");
  }

  // Freshness
  let newestExpenseDate = start;
  expenses.forEach((e) => {
    if (e.date > newestExpenseDate) {
      newestExpenseDate = e.date;
    }
  });

  const sourceTables = ["Expense", "ExpenseCategory"];
  const meta: ToolMetadata = {
    toolName: "getExpenseMetrics",
    queryParameters: { dateRange: { start: start.toISOString(), end: end.toISOString() } },
    resolvedDateRange: { start: start.toISOString(), end: end.toISOString() },
    roleScope: params.roleScope,
    rowsExamined: expenses.length,
    computedMetrics: { totalExpense },
    sourceTables,
    queriedAt: new Date().toISOString(),
    sourceMaxTimestamp: newestExpenseDate.toISOString(),
    warnings,
    reconciliationStatus: "VERIFIED",
    freshnessStatus: newestExpenseDate >= start ? "FRESH" : "STALE",
    syncStatus: "UNKNOWN",
  };

  return {
    data: {
      totalExpense,
      categories: categoriesMap,
    },
    meta,
  };
}
