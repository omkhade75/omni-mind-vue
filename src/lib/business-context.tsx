import React, { createContext, useContext, useState, useEffect } from "react";
import {
  db,
  Product,
  Transaction,
  Customer,
  Supplier,
  Expense,
  UtilityReading,
  AIRecommendation,
  Anomaly,
  PurchaseOrder,
  DailySnapshot,
  getDatesRange,
} from "./db";
import { useAuth } from "./auth-context";
import { toast } from "sonner";
import { fmtINR, fmtNum } from "./mock-data";

export type TimeRange = "today" | "yesterday" | "7d" | "30d" | "custom";

export interface KpiItem {
  key: string;
  label: string;
  value: number;
  delta: number;
  spark?: { i: number; v: number }[];
}

export interface ChartTimeSeriesItem {
  day: string;
  date: string;
  revenue: number;
  profit: number;
  prev: number;
  orders: number;
  footfall: number;
}

export interface DeptRevenueItem {
  name: string;
  value: number;
  margin: number;
  color: string;
}

export interface ExecutiveBriefData {
  summary: string;
  positives: string[];
  risks: string[];
  opportunities: string[];
}

interface BusinessDataCtx {
  activeDate: string;
  timeRange: TimeRange;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  utilities: UtilityReading[];
  recommendations: AIRecommendation[];
  anomalies: Anomaly[];
  purchaseOrders: PurchaseOrder[];
  dailySnapshot: DailySnapshot;

  // Scoped lists based on Active Date / Time Range / Role
  scopedProducts: Product[];
  scopedTransactions: Transaction[];
  scopedCustomers: Customer[];
  scopedExpenses: Expense[];
  scopedRecommendations: AIRecommendation[];
  scopedAnomalies: Anomaly[];

  // Derived analytical metrics
  kpis: KpiItem[];
  timeSeriesData: ChartTimeSeriesItem[];
  departmentRevenue: DeptRevenueItem[];
  executiveBrief: ExecutiveBriefData;

  // Actions
  changeDate: (date: string) => void;
  changeTimeRange: (range: TimeRange) => void;
  acceptRecommendation: (id: string) => void;
  rejectRecommendation: (id: string) => void;
  applyMarkdown: (productId: string, batchId: string, discountPercent: number) => void;
  resetDemoData: () => void;
  addPurchaseOrder: (po: Omit<PurchaseOrder, "id" | "date">) => void;

  // Drawer Actions and States
  activeProductId: string | null;
  activeCustomerId: string | null;
  activeSupplierId: string | null;
  activeRecId: string | null;
  openProduct360: (id: string | null) => void;
  openCustomer360: (id: string | null) => void;
  openSupplier360: (id: string | null) => void;
  openRecommendation: (id: string | null) => void;
}

const BusinessDataContext = createContext<BusinessDataCtx | undefined>(undefined);

export const BusinessDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Drawer states
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
  const [activeRecId, setActiveRecId] = useState<string | null>(null);

  const openProduct360 = (id: string | null) => setActiveProductId(id);
  const openCustomer360 = (id: string | null) => setActiveCustomerId(id);
  const openSupplier360 = (id: string | null) => setActiveSupplierId(id);
  const openRecommendation = (id: string | null) => setActiveRecId(id);

  // Active Date defaults to 5 May 2026
  const [activeDate, setActiveDate] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("omnimind_active_date") || "2026-05-05";
    }
    return "2026-05-05";
  });

  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    if (typeof window !== "undefined") {
      return (window.localStorage.getItem("omnimind_time_range") as TimeRange) || "30d";
    }
    return "30d";
  });

  // Database revision tracker to force React state re-eval when DB writes occur
  const [dbRev, setDbRev] = useState(0);

  const changeDate = (date: string) => {
    setActiveDate(date);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("omnimind_active_date", date);
    }
  };

  const changeTimeRange = (range: TimeRange) => {
    setTimeRange(range);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("omnimind_time_range", range);
    }
  };

  const forceRefresh = () => setDbRev((prev) => prev + 1);

  const acceptRecommendation = (id: string) => {
    const rec = db.getRecommendations().find((r) => r.id === id);
    if (!rec) return;

    db.updateRecommendationStatus(id, "Accepted");

    // Execute side-effects based on recommendation category
    if (rec.id === "REC-01") {
      // Reorder Amul Taaza Milk -> create PO
      db.addPurchaseOrder({
        id: `PO-${Date.now().toString().slice(-6)}`,
        productId: "SKU-10021",
        productName: "Amul Taaza Milk 1L",
        supplierId: "SUP-001",
        supplierName: "Amul Foods Ltd",
        quantity: 240,
        unitCost: 54,
        totalCost: 240 * 54,
        status: "Draft",
        date: activeDate,
        source: "AI Recommendation (REC-01)",
      });
      toast.success("Draft Purchase Order created for Amul Taaza Milk!");
    } else if (rec.id === "REC-04") {
      // Apply markdown to expiring yogurt
      db.updateProductBatchStatus("BAT-11023-01", "actioned", 20);
      toast.success("Applied 20% markdown to expiring Yogurt batch.");
    } else {
      toast.success(`Action accepted: ${rec.title}`);
    }

    forceRefresh();
  };

  const rejectRecommendation = (id: string) => {
    db.updateRecommendationStatus(id, "Rejected");
    toast.info("Recommendation dismissed.");
    forceRefresh();
  };

  const applyMarkdown = (productId: string, batchId: string, discountPercent: number) => {
    db.updateProductBatchStatus(batchId, "actioned", discountPercent);
    toast.success(`Applied ${discountPercent}% markdown discount to batch.`);
    forceRefresh();
  };

  const addPurchaseOrder = (poInput: Omit<PurchaseOrder, "id" | "date">) => {
    db.addPurchaseOrder({
      ...poInput,
      id: `PO-${Date.now().toString().slice(-6)}`,
      date: activeDate,
    });
    toast.success("Purchase order added successfully!");
    forceRefresh();
  };

  const resetDemoData = () => {
    db.reset();
    setActiveDate("2026-05-05");
    setTimeRange("30d");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("omnimind_active_date");
      window.localStorage.removeItem("omnimind_time_range");
    }
    forceRefresh();
    toast.success("Demo database has been reset to original state.");
  };

  // Retrieve base records from DB (reactive to dbRev)
  const products = db.getProducts();
  const transactions = db.getTransactions();
  const customers = db.getCustomers();
  const suppliers = db.getSuppliers();
  const expenses = db.getExpenses();
  const utilities = db.getUtilityReadings();
  const recommendations = db.getRecommendations();
  const anomalies = db.getAnomalies();
  const purchaseOrders = db.getPurchaseOrders();
  const dailySnapshot = db.getDailySnapshot(activeDate);

  // --- Scoping Logic (Role-Based and Date-Based) ---
  const activeDateObj = new Date(activeDate);

  // Helper to filter items based on selected Time Range
  const filterByTimeRange = <T extends { date: string }>(items: T[]): T[] => {
    if (timeRange === "today") {
      return items.filter((item) => item.date === activeDate);
    } else if (timeRange === "yesterday") {
      const yesterday = new Date(activeDateObj);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      return items.filter((item) => item.date === yesterdayStr);
    } else if (timeRange === "7d") {
      const limit = new Date(activeDateObj);
      limit.setDate(limit.getDate() - 7);
      return items.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= limit && itemDate <= activeDateObj;
      });
    } else if (timeRange === "30d") {
      const limit = new Date(activeDateObj);
      limit.setDate(limit.getDate() - 30);
      return items.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= limit && itemDate <= activeDateObj;
      });
    }
    // "custom" or default
    return items.filter((item) => new Date(item.date) <= activeDateObj);
  };

  // 1. Transactions
  let scopedTransactions = filterByTimeRange(transactions);

  // 2. Products
  let scopedProducts = products;

  // 3. Customers
  let scopedCustomers = customers;

  // 4. Expenses
  let scopedExpenses = filterByTimeRange(expenses);

  // 5. Recommendations
  let scopedRecommendations = recommendations;

  // 6. Anomalies
  let scopedAnomalies = anomalies.filter((a) => new Date(a.date) <= activeDateObj);

  // --- Apply Role-Based Data Filtering (Manager Scoping) ---
  if (user?.role === "manager") {
    const dept = "Fashion";

    // Filter Products
    scopedProducts = products.filter((p) => p.dept === dept);

    // Filter Transactions
    scopedTransactions = scopedTransactions.filter((t) => t.dept === dept);

    // Filter Customers
    scopedCustomers = customers.filter((c) => c.favDept === dept);

    // Filter Expenses
    scopedExpenses = scopedExpenses.filter((e) => e.dept === dept || e.dept === "All");

    // Filter Recommendations
    scopedRecommendations = recommendations.filter((r) => r.dept === dept || r.dept === "All");

    // Filter Anomalies
    scopedAnomalies = scopedAnomalies.filter(
      (a) =>
        a.metric.includes("Fashion") || a.metric.includes("All") || a.deviation.includes("Fashion"),
    );
  }

  // --- Derived Metrics ---
  const totalRevenue = scopedTransactions.reduce(
    (sum, t) => (t.status === "Completed" ? sum + t.total : sum),
    0,
  );
  const totalOrders = scopedTransactions.length;
  const totalExpenses = scopedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const netProfitVal = Math.round(totalRevenue * 0.16) - totalExpenses;
  const totalFootfall = totalOrders * 2.5 + (timeRange === "today" ? dailySnapshot.footfall : 0);
  const newCustomersCount = Math.round(totalOrders * 0.1) || 1;
  const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);

  // Delta calculations (compared to baseline)
  const kpis: KpiItem[] = [
    { key: "revenue", label: "Gross Revenue", value: totalRevenue, delta: 8.4 },
    { key: "profit", label: "Net Profit", value: netProfitVal, delta: 4.1 },
    { key: "orders", label: "Total Orders", value: totalOrders, delta: 6.2 },
    { key: "footfall", label: "Total Footfall", value: Math.round(totalFootfall), delta: 12.7 },
    { key: "newCustomers", label: "New Customers", value: newCustomersCount, delta: 3.5 },
    { key: "aov", label: "Average Order Value", value: averageOrderValue, delta: -1.8 },
    { key: "inventory", label: "Inventory Value", value: inventoryValue, delta: 2.1 },
    { key: "expenses", label: "Total Expenses", value: totalExpenses, delta: 5.4 },
  ];

  // Daily Chart Series
  const datesInRange = (() => {
    const limit = new Date(activeDateObj);
    if (timeRange === "today") {
      limit.setDate(limit.getDate() - 7);
    } else if (timeRange === "yesterday") {
      limit.setDate(limit.getDate() - 7);
    } else if (timeRange === "7d") {
      limit.setDate(limit.getDate() - 7);
    } else if (timeRange === "30d") {
      limit.setDate(limit.getDate() - 30);
    } else {
      limit.setDate(limit.getDate() - 30);
    }
    return getDatesRange(limit.toISOString().split("T")[0], activeDate);
  })();

  const timeSeriesData: ChartTimeSeriesItem[] = datesInRange.map((d) => {
    const snap = db.getDailySnapshot(d);
    return {
      day: d.slice(8),
      date: d,
      revenue: snap.grossRevenue,
      profit: snap.netProfit,
      prev: Math.round(snap.grossRevenue * 0.9),
      orders: snap.orders,
      footfall: snap.footfall,
    };
  });

  // Department contribution
  const deptRevenuesMap: Record<string, number> = {};
  scopedTransactions.forEach((t) => {
    if (t.status === "Completed") {
      deptRevenuesMap[t.dept] = (deptRevenuesMap[t.dept] || 0) + t.total;
    }
  });

  const departmentRevenueList = Object.entries(deptRevenuesMap)
    .map(([name, value]) => {
      const colors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
      ];
      const index = Math.abs(name.charCodeAt(0)) % colors.length;
      return {
        name,
        value,
        margin: name === "Fashion" ? 22.4 : name === "Electronics" ? 12.1 : 15,
        color: colors[index],
      };
    })
    .sort((a, b) => b.value - a.value);

  const departmentRevenue =
    departmentRevenueList.length > 0
      ? departmentRevenueList
      : [
          { name: "Fashion", value: 124000, margin: 22.4, color: "var(--chart-1)" },
          { name: "Electronics", value: 108000, margin: 12.1, color: "var(--chart-2)" },
        ];

  // Executive Summary
  const executiveBrief: ExecutiveBriefData = {
    summary: `Gross revenue is ${fmtINR(totalRevenue, { compact: true })} for the selected period, primarily driven by ${departmentRevenue[0]?.name || "Fashion"}. Net profit was ${fmtINR(netProfitVal, { compact: true })} after subtracting expenses of ${fmtINR(totalExpenses, { compact: true })}. ${scopedAnomalies.length} active anomalies and ${scopedRecommendations.filter((r) => r.status === "New").length} pending AI decisions require attention.`,
    positives: [
      `${departmentRevenue[0]?.name || "Fashion"} revenue contributed ${Math.round((departmentRevenue[0]?.value / (totalRevenue || 1)) * 100) || 30}% of total sales`,
      `Total footfall reached ${fmtNum(totalFootfall)} this period`,
      `Acquired ${newCustomersCount} new customers`,
    ],
    risks: [
      `Total expenses stand at ${fmtINR(totalExpenses)}`,
      scopedAnomalies.length > 0
        ? `${scopedAnomalies[0].metric} flagged with ${scopedAnomalies[0].deviation} deviation`
        : "Elevated energy costs during peak hours",
      `${products.filter((p) => p.stock <= p.reorder).length} SKUs currently below reorder levels`,
    ],
    opportunities: [
      `Markdown expiring stock to recover up to ₹50K`,
      `Accept AI recommendation: "${recommendations.find((r) => r.status === "New")?.title || "Reorder stock"}"`,
      `Contact high-churn-risk VIP segment customers`,
    ],
  };

  return (
    <BusinessDataContext.Provider
      value={{
        activeDate,
        timeRange,
        products,
        transactions,
        customers,
        suppliers,
        expenses,
        utilities,
        recommendations,
        anomalies,
        purchaseOrders,
        dailySnapshot,

        scopedProducts,
        scopedTransactions,
        scopedCustomers,
        scopedExpenses,
        scopedRecommendations,
        scopedAnomalies,

        kpis,
        timeSeriesData,
        departmentRevenue,
        executiveBrief,

        changeDate,
        changeTimeRange,
        acceptRecommendation,
        rejectRecommendation,
        applyMarkdown,
        resetDemoData,
        addPurchaseOrder,

        activeProductId,
        activeCustomerId,
        activeSupplierId,
        activeRecId,
        openProduct360,
        openCustomer360,
        openSupplier360,
        openRecommendation,
      }}
    >
      {children}
    </BusinessDataContext.Provider>
  );
};

export const useBusinessData = () => {
  const context = useContext(BusinessDataContext);
  if (context === undefined) {
    throw new Error("useBusinessData must be used within a BusinessDataProvider");
  }
  return context;
};
