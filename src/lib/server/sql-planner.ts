import { prisma } from "./prisma";

export interface SemanticQueryPlan {
  originalQuery: string;
  inferredTable: string;
  filters: Record<string, any>;
  orderBy?: Record<string, "asc" | "desc">;
  limit?: number;
  isPlanned: boolean;
}

export class SqlPlanner {
  public static planSemanticQuery(query: string): SemanticQueryPlan {
    const q = query.toLowerCase();
    const plan: SemanticQueryPlan = {
      originalQuery: query,
      inferredTable: "Transaction",
      filters: {},
      isPlanned: false,
    };

    if (q.includes("supplier") || q.includes("purchase order")) {
      plan.inferredTable = "PurchaseOrder";
      plan.isPlanned = true;
      if (q.includes("delay") || q.includes("late")) {
        plan.filters = { status: "Delayed" };
      }
    } else if (q.includes("customer")) {
      plan.inferredTable = "Customer";
      plan.isPlanned = true;
      if (q.includes("vip")) {
        plan.filters = { loyaltyPoints: { gte: 500 } };
      }
      if (q.includes("inactive") || q.includes("risk")) {
        plan.filters = { status: "Active", churnRisk: "High" };
      }
      plan.orderBy = { loyaltyPoints: "desc" };
      plan.limit = 20;
    } else if (q.includes("department") || q.includes("profitability")) {
      plan.inferredTable = "Department";
      plan.isPlanned = true;
      plan.orderBy = { targetRevenue: "desc" };
    } else if (q.includes("expense") || q.includes("utility")) {
      plan.inferredTable = "Expense";
      plan.isPlanned = true;
      plan.orderBy = { amount: "desc" };
    }

    return plan;
  }

  public static async executePlan(plan: SemanticQueryPlan): Promise<any[]> {
    if (!plan.isPlanned) {
      return [];
    }

    try {
      switch (plan.inferredTable) {
        case "PurchaseOrder":
          return await prisma.purchaseOrder.findMany({
            where: plan.filters,
            orderBy: plan.orderBy,
            take: plan.limit,
            include: { supplier: true },
          });
        case "Customer":
          return await prisma.customer.findMany({
            where: plan.filters,
            orderBy: plan.orderBy,
            take: plan.limit,
          });
        case "Department":
          return await prisma.department.findMany({
            where: plan.filters,
            orderBy: plan.orderBy,
            take: plan.limit,
          });
        case "Expense":
          return await prisma.expense.findMany({
            where: plan.filters,
            orderBy: plan.orderBy,
            take: plan.limit,
          });
        default:
          return [];
      }
    } catch (e) {
      console.error("SQL Planner execution failed:", e);
      return [];
    }
  }
}
