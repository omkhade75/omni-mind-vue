import {
  db,
  Product,
  Transaction,
  Expense,
  AIRecommendation,
  Anomaly,
  Supplier,
  Customer,
} from "./db";

// Helper to filter data based on roleScope
function scopeFilter<T>(items: T[], roleScope?: string): T[] {
  if (roleScope === "manager") {
    return items.filter((item: any) => item.dept === "Fashion");
  }
  return items;
}

export interface BusinessSummary {
  date: string;
  grossRevenue: number;
  netProfit: number;
  orders: number;
  aov: number;
  expenses: number;
  activeRecommendations: number;
  activeAnomalies: number;
}

export function getBusinessSummary(date: string, roleScope?: string): BusinessSummary {
  // If owner (no roleScope or not manager), we can use the pre-calculated daily snapshot as base
  if (!roleScope || roleScope !== "manager") {
    const snap = db.getDailySnapshot(date);
    const recs = db
      .getRecommendations()
      .filter((r) => r.status === "New" || r.status === "Investigating").length;
    const anomalies = db
      .getAnomalies()
      .filter(
        (a) => a.date === date && (a.status === "New" || a.status === "Investigating"),
      ).length;
    return {
      date,
      grossRevenue: snap.grossRevenue,
      netProfit: snap.netProfit,
      orders: snap.orders,
      aov: snap.aov,
      expenses: snap.expenses,
      activeRecommendations: recs,
      activeAnomalies: anomalies,
    };
  }

  // Rohan manager scope (strictly Fashion department)
  const txns = scopeFilter(
    db.getTransactions().filter((t) => t.date === date),
    roleScope,
  );
  const exps = scopeFilter(
    db.getExpenses().filter((e) => e.date === date),
    roleScope,
  );
  const recs = scopeFilter(
    db.getRecommendations().filter((r) => r.status === "New" || r.status === "Investigating"),
    roleScope,
  );
  const anomalies = scopeFilter(
    db
      .getAnomalies()
      .filter((a) => a.date === date && (a.status === "New" || a.status === "Investigating")),
    roleScope,
  );

  const grossRevenue = txns.reduce((sum, t) => (t.status === "Completed" ? sum + t.total : sum), 0);
  const orders = txns.length;
  const expenses = exps.reduce((sum, e) => sum + e.amount, 0);
  const aov = orders > 0 ? Math.round(grossRevenue / orders) : 0;
  const netProfit = Math.round(grossRevenue * 0.16) - expenses;

  return {
    date,
    grossRevenue,
    netProfit,
    orders,
    aov,
    expenses,
    activeRecommendations: recs.length,
    activeAnomalies: anomalies.length,
  };
}

export function compareDates(dateA: string, dateB: string, roleScope?: string) {
  const sumA = getBusinessSummary(dateA, roleScope);
  const sumB = getBusinessSummary(dateB, roleScope);

  const getPct = (a: number, b: number) => {
    if (b === 0) return a > 0 ? 100 : 0;
    return Math.round(((a - b) / b) * 1000) / 10;
  };

  return {
    dateA,
    dateB,
    revenueDeltaPct: getPct(sumA.grossRevenue, sumB.grossRevenue),
    profitDeltaPct: getPct(sumA.netProfit, sumB.netProfit),
    ordersDeltaPct: getPct(sumA.orders, sumB.orders),
    aovDeltaPct: getPct(sumA.aov, sumB.aov),
    expensesDeltaPct: getPct(sumA.expenses, sumB.expenses),
    sumA,
    sumB,
  };
}

export function getReorderCandidates(date: string, roleScope?: string): Product[] {
  const products = scopeFilter(db.getProducts(), roleScope);
  return products.filter((p) => p.stock >= 0 && p.stock <= p.reorder);
}

export function getExpiryRisks(date: string, daysAhead: number, roleScope?: string) {
  const products = scopeFilter(db.getProducts(), roleScope);
  const refTime = new Date(date).getTime();
  const limitTime = refTime + daysAhead * 24 * 60 * 60 * 1000;

  const risks: { product: Product; daysToExpiry: number }[] = [];

  products.forEach((p) => {
    if (p.expiry) {
      const expTime = new Date(p.expiry).getTime();
      if (expTime >= refTime && expTime <= limitTime) {
        const days = Math.round((expTime - refTime) / (24 * 60 * 60 * 1000));
        risks.push({ product: p, daysToExpiry: days });
      }
    }
  });

  return risks.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

export function getVIPCustomers(date: string, roleScope?: string): Customer[] {
  const customers = db.getCustomers();
  // Filter VIP segment customers
  const vips = customers.filter((c) => c.segment === "VIP");
  if (roleScope === "manager") {
    // Managers can only see VIPs whose favorite department is Fashion
    return vips.filter((c) => c.favDept === "Fashion");
  }
  return vips.sort((a, b) => b.spend - a.spend);
}

export function getSupplierRisks(date: string, roleScope?: string): Supplier[] {
  const suppliers = db.getSuppliers();
  // Filter suppliers with risk High/Medium or performance metrics under threshold
  const risky = suppliers.filter((s) => s.risk === "High" || s.onTime < 80 || s.quality < 80);

  if (roleScope === "manager") {
    // Filter to suppliers supplying products in Fashion department
    const fashionProducts = db.getProducts().filter((p) => p.dept === "Fashion");
    const fashionSupplierNames = new Set(fashionProducts.map((p) => p.supplier));
    return risky.filter((s) => fashionSupplierNames.has(s.name));
  }
  return risky;
}

export function getUtilityAnomalies(date: string, roleScope?: string): Anomaly[] {
  const anomalies = scopeFilter(db.getAnomalies(), roleScope);
  // Filter anomalies active around or on this date
  return anomalies.filter(
    (a) => a.date === date && (a.status === "New" || a.status === "Investigating"),
  );
}

export function getDepartmentPerformance(date: string, roleScope?: string) {
  const txns = db.getTransactions().filter((t) => t.date === date);
  const depts = ["Grocery", "Fashion", "Electronics", "Beauty", "Home", "Food Court"];

  const totals = depts.map((dept) => {
    const deptTxns = txns.filter((t) => t.dept === dept);
    const revenue = deptTxns.reduce((sum, t) => sum + t.total, 0);
    return { name: dept, value: revenue };
  });

  const totalRev = totals.reduce((sum, t) => sum + t.value, 0);
  const shares = totals.map((t) => ({
    name: t.name,
    value: t.value,
    sharePct: totalRev > 0 ? Math.round((t.value / totalRev) * 100) : 0,
  }));

  if (roleScope === "manager") {
    return shares.filter((s) => s.name === "Fashion");
  }
  return shares.sort((a, b) => b.value - a.value);
}

export function getRevenueDrivers(date: string, roleScope?: string) {
  const products = scopeFilter(db.getProducts(), roleScope);
  return [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);
}

export function getMarginRisks(date: string, roleScope?: string) {
  const products = scopeFilter(db.getProducts(), roleScope);
  // Margin < 10%
  return products.filter((p) => {
    const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
    return margin < 10;
  });
}

export function getRecommendedActions(date: string, roleScope?: string): AIRecommendation[] {
  const recs = scopeFilter(db.getRecommendations(), roleScope);
  return recs.filter((r) => r.status === "New" || r.status === "Investigating");
}

export function getProductPerformance(productId: string) {
  const p = db.getProducts().find((prod) => prod.id === productId);
  if (!p) return null;
  const batches = db.getProductBatches(productId);
  return {
    product: p,
    batches,
    profitPerUnit: p.price - p.cost,
    marginPct: p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 1000) / 10 : 0,
  };
}

export function getCustomerInsights(customerId: string) {
  const c = db.getCustomers().find((cust) => cust.id === customerId);
  if (!c) return null;
  const txns = db.getTransactions().filter((t) => t.customerId === customerId);
  return {
    customer: c,
    transactions: txns,
    totalOrders: txns.length,
    latestTransaction: txns.length > 0 ? txns[txns.length - 1] : null,
  };
}

export function getSupplierInsights(supplierId: string) {
  const s = db.getSuppliers().find((supp) => supp.id === supplierId);
  if (!s) return null;
  const products = db.getProducts().filter((p) => p.supplier === s.name);
  const pendingOrders = db
    .getPurchaseOrders()
    .filter((po) => po.supplierName === s.name && po.status === "Draft");
  return {
    supplier: s,
    products,
    pendingOrdersCount: pendingOrders.length,
    pendingOrdersValue: pendingOrders.reduce((sum, po) => sum + po.totalCost, 0),
  };
}
