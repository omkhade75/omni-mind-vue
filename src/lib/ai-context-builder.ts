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
import { fmtINR } from "./mock-data";
import {
  getBusinessSummary,
  compareDates,
  getReorderCandidates,
  getExpiryRisks,
  getVIPCustomers,
  getSupplierRisks,
  getUtilityAnomalies,
  getDepartmentPerformance,
  getRevenueDrivers,
  getMarginRisks,
  getRecommendedActions,
  getProductPerformance,
} from "./analytics-engine";

export interface AIResponseContract {
  answer: string;
  summary: string;
  evidence: Array<{
    label: string;
    value: string;
    sourceType?: string;
    sourceId?: string;
  }>;
  reasoning: string[];
  recommendedActions: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    estimatedImpact?: string;
    actionType:
      | "CREATE_PO"
      | "APPLY_MARKDOWN"
      | "OPEN_PRODUCT"
      | "OPEN_CUSTOMER"
      | "OPEN_SUPPLIER"
      | "INVESTIGATE_ANOMALY"
      | "NAVIGATE";
    entityId?: string;
  }>;
  risks: Array<{
    title: string;
    severity: "high" | "medium" | "low";
  }>;
  confidence: number;
}

export interface AIContext {
  intent: string;
  resolvedDate: string;
  evidenceText: string;
  evidenceIds: string[];
}

export function buildAIContext(query: string, activeDate: string, roleScope?: string): AIContext {
  const q = query.toLowerCase();
  let intent = "general_summary";
  let resolvedDate = activeDate;
  const evidenceIds: string[] = [];

  // Date resolution heuristics
  if (q.includes("5 may") || q.includes("may 5") || q.includes("05/05/2026")) {
    resolvedDate = "2026-05-05";
  } else if (q.includes("4 may") || q.includes("may 4") || q.includes("04/05/2026")) {
    resolvedDate = "2026-05-04";
  } else if (q.includes("yesterday")) {
    resolvedDate = activeDate === "2026-05-05" ? "2026-05-04" : activeDate; // simple offset
  }

  let evidenceText = "";

  // Intent parsing
  const hasDemandKeyword = q.includes("demand") || q.includes("popular") || q.includes("sold") || q.includes("moving") || q.includes("velocity") || q.includes("fast");
  const hasStockKeyword = q.includes("out of") || q.includes("outof") || q.includes("outoff") || q.includes("stock") || q.includes("shortage") || q.includes("empty");
  const isAuditQuery = /\b(audit|report|blueprint|operational|all.?in.?one|control|strategic|executive|everything|complete)\b/.test(q);

  if (hasDemandKeyword && hasStockKeyword) {
    intent = "high_demand_out_of_stock";
    const candidates = getReorderCandidates(resolvedDate, roleScope);
    const sortedByDemand = [...candidates].sort((a, b) => b.sold - a.sold);
    evidenceText = "HIGH DEMAND LOW/OUT-OF-STOCK PRODUCTS:\n" +
      sortedByDemand.map(p => {
        evidenceIds.push(p.id);
        return `- ${p.name} (SKU: ${p.id}): Stock: ${p.stock}, Sold: ${p.sold}, Revenue: ₹${p.revenue}, Reorder Threshold: ${p.reorder}, Supplier: ${p.supplier}`;
      }).join("\n");
  } else if (isAuditQuery) {
    intent = "global_audit";
    const candidates = getReorderCandidates(resolvedDate, roleScope);
    evidenceText = "GLOBAL AUDIT CONTEXT:\n- Low-Stock/Out-of-Stock candidates count: " + candidates.length;
  } else if (
    q.includes("reorder") ||
    q.includes("restock") ||
    q.includes("stockout") ||
    q.includes("low stock") ||
    q.includes("out of stock") ||
    q.includes("outofstock") ||
    q.includes("out-of-stock") ||
    q.includes("outoff stock") ||
    q.includes("outoffstock") ||
    q.includes("outoff-stock") ||
    q.includes("outof stock") ||
    q.includes("outof stck") ||
    q.includes("stcks") ||
    q.includes("stck") ||
    q.includes("buy") ||
    q.includes("replenish") ||
    q.includes("shortage")
  ) {
    intent = "reorder";
    const candidates = getReorderCandidates(resolvedDate, roleScope);
    evidenceText =
      "REORDER CANDIDATES:\n" +
      candidates
        .map((p) => {
          evidenceIds.push(p.id);
          return `- ${p.name} (SKU: ${p.id}): Stock: ${p.stock}, Reorder Threshold: ${p.reorder}, Supplier: ${p.supplier}, Cost: ₹${p.cost}, Price: ₹${p.price}.`;
        })
        .join("\n");
  } else if (
    q.includes("electricity") ||
    q.includes("hvac") ||
    q.includes("energy") ||
    q.includes("utility") ||
    q.includes("water") ||
    q.includes("power")
  ) {
    intent = "utilities";
    const anomalies = getUtilityAnomalies(resolvedDate, roleScope);
    evidenceText = `UTILITY ANOMALIES FOR ${resolvedDate}:\n`;
    if (anomalies.length > 0) {
      anomalies.forEach((a) => {
        evidenceIds.push(a.id);
        evidenceText += `- Anomaly in ${a.metric}. Expected: ${a.expected}, Actual: ${a.actual}, Deviation: ${a.deviation}. Cause: ${a.cause}. Action: ${a.action}.\n`;
      });
    } else {
      evidenceText += "No active utility anomalies found on this date.\n";
    }
    evidenceText += `Today's Base Electricity Consumption Estimate: ~12,450 kWh.`;
  } else if (
    q.includes("expire") ||
    q.includes("expiry") ||
    q.includes("yogurt") ||
    q.includes("milk") ||
    q.includes("spoil")
  ) {
    intent = "expiry";
    const risks = getExpiryRisks(resolvedDate, 7, roleScope);
    evidenceText =
      "EXPIRY RISKS (Next 7 days):\n" +
      risks
        .map((r) => {
          evidenceIds.push(r.product.id);
          return `- ${r.product.name} (SKU: ${r.product.id}): Expires in ${r.daysToExpiry} days. Stock on hand: ${r.product.stock} units. Cost: ₹${r.product.cost}.`;
        })
        .join("\n");
  } else if (q.includes("vip") || q.includes("customer")) {
    intent = "customers";
    const vips = getVIPCustomers(resolvedDate, roleScope);
    evidenceText =
      "VIP CUSTOMERS:\n" +
      vips
        .slice(0, 5)
        .map((c) => {
          evidenceIds.push(c.id);
          return `- ${c.name} (ID: ${c.id}): Total Spend: ₹${c.spend}, Fav Dept: ${c.favDept}, Churn Risk: ${c.churn}%.`;
        })
        .join("\n");
  } else if (
    q.includes("supplier") ||
    q.includes("delivery") ||
    q.includes("reliability") ||
    q.includes("lead time")
  ) {
    intent = "suppliers";
    const riskySuppliers = getSupplierRisks(resolvedDate, roleScope);
    evidenceText =
      "SUPPLIER PERFORMANCE & RISKS:\n" +
      riskySuppliers
        .map((s) => {
          evidenceIds.push(s.id);
          return `- ${s.name} (ID: ${s.id}): Risk Level: ${s.risk}, On-Time Delivery: ${s.onTime}%, Quality: ${s.quality}%, Avg Lead Time: ${s.lead} days.`;
        })
        .join("\n");
  } else if (
    q.includes("compare") ||
    q.includes("change") ||
    q.includes("different") ||
    q.includes("vs")
  ) {
    intent = "comparison";
    const dateA = resolvedDate;
    const dateB = resolvedDate === "2026-05-05" ? "2026-05-04" : "2026-05-05";
    const comp = compareDates(dateA, dateB, roleScope);
    evidenceText =
      `METRICS COMPARISON (${dateA} vs ${dateB}):\n` +
      `- Revenue: ${dateA} = ₹${comp.sumA.grossRevenue} vs ${dateB} = ₹${comp.sumB.grossRevenue} (Delta: ${comp.revenueDeltaPct}%)\n` +
      `- Profit: ${dateA} = ₹${comp.sumA.netProfit} vs ${dateB} = ₹${comp.sumB.netProfit} (Delta: ${comp.profitDeltaPct}%)\n` +
      `- Orders: ${dateA} = ${comp.sumA.orders} vs ${dateB} = ${comp.sumB.orders} (Delta: ${comp.ordersDeltaPct}%)\n` +
      `- Expenses: ${dateA} = ₹${comp.sumA.expenses} vs ${dateB} = ₹${comp.sumB.expenses} (Delta: ${comp.expensesDeltaPct}%)\n` +
      `- Anomalies count: ${dateA} = ${comp.sumA.activeAnomalies} vs ${dateB} = ${comp.sumB.activeAnomalies}`;
  } else if (
    q.includes("budget") ||
    q.includes("allocate") ||
    q.includes("lakh") ||
    q.includes("spend money")
  ) {
    intent = "budget_allocation";
    const reorders = getReorderCandidates(resolvedDate, roleScope);
    const anomalies = getUtilityAnomalies(resolvedDate, roleScope);
    const expiry = getExpiryRisks(resolvedDate, 7, roleScope);

    evidenceText =
      `BUDGET ALLOCATION ASSETS:\n` +
      `- Utility Leak: ${anomalies.map((a) => `${a.metric} Anomaly: ${a.cause} (Est. loss: ₹38.4K/mo)`).join(", ") || "None"}\n` +
      `- Low Stock SKUs needing reorder: ${reorders.length} items.\n` +
      `- Expiring stock value in next 7 days: ₹${expiry.reduce((sum, r) => sum + r.product.stock * r.product.cost, 0)}.`;
  } else if (
    q.includes("do nothing") ||
    q.includes("if i do nothing") ||
    q.includes("consequence") ||
    q.includes("risks")
  ) {
    intent = "consequence_analysis";
    const reorders = getReorderCandidates(resolvedDate, roleScope);
    const anomalies = getUtilityAnomalies(resolvedDate, roleScope);
    const expiry = getExpiryRisks(resolvedDate, 7, roleScope);
    evidenceText =
      `CURRENT ACTIVE RISKS:\n` +
      `- Utility Anomaly: ${anomalies.map((a) => `${a.metric} Anomaly: ${a.cause} (Est. loss: ₹38.4K/mo)`).join(", ") || "None"}\n` +
      `- Expiry Risk: ${expiry.length} products expiring soon (Total value: ₹${expiry.reduce((sum, r) => sum + r.product.stock * r.product.cost, 0)})\n` +
      `- Low Stock Risk: ${reorders.length} SKUs running low.`;
  } else if (
    q.includes("department") ||
    q.includes("grocery") ||
    q.includes("fashion") ||
    q.includes("electronics")
  ) {
    intent = "department_performance";
    const shares = getDepartmentPerformance(resolvedDate, roleScope);
    evidenceText =
      `DEPARTMENT REVENUE SHARES FOR ${resolvedDate}:\n` +
      shares.map((s) => `- ${s.name}: Revenue: ₹${s.value} (Share: ${s.sharePct}%)`).join("\n");
  } else {
    // General overview
    intent = "general_summary";
    const summary = getBusinessSummary(resolvedDate, roleScope);
    const recs = getRecommendedActions(resolvedDate, roleScope);
    evidenceText =
      `BUSINESS OVERVIEW FOR ${resolvedDate}:\n` +
      `- Gross Revenue: ₹${summary.grossRevenue}\n` +
      `- Net Profit: ₹${summary.netProfit}\n` +
      `- Total Orders: ${summary.orders}\n` +
      `- Average Order Value: ₹${summary.aov}\n` +
      `- Total Expenses: ₹${summary.expenses}\n` +
      `- Active AI Recommendations: ${summary.activeRecommendations}\n` +
      `- Active Anomalies: ${summary.activeAnomalies}\n` +
      `RECOMMENDED ACTIONS DRAFTED:\n` +
      recs
        .map((r) => {
          evidenceIds.push(r.id);
          return `- [${r.severity.toUpperCase()}] ${r.title}: ${r.explanation} (Impact: ${r.impact})`;
        })
        .join("\n");
  }

  // If role is manager, prepend strict department warning to the text
  if (roleScope === "manager") {
    evidenceText =
      `MANAGER PERMISSION SCOPE: strictly restricted to FASHION department only. All metrics below are pre-filtered to FASHION.\n\n` +
      evidenceText;
  }

  return {
    intent,
    resolvedDate,
    evidenceText,
    evidenceIds,
  };
}

export function localQueryFallback(
  query: string,
  activeDate: string,
  roleScope?: string,
): AIResponseContract {
  const ctx = buildAIContext(query, activeDate, roleScope);
  const q = query.toLowerCase();

  // 1.25 Global Audit Intent
  if (ctx.intent === "global_audit") {
    const candidates = getReorderCandidates(ctx.resolvedDate, roleScope);
    const outOfStock = candidates.filter(c => c.stock === 0);
    const lowStock = candidates.filter(c => c.stock > 0);
    const summary = getBusinessSummary(ctx.resolvedDate, roleScope);

    let answer = `### Executive Summary & Operational Audit Report\n\n` +
      `**1. Treasury & Liquidity Status**\n` +
      `- Active Commodity Investments: **Gold, Silver** valued at **${fmtINR(382000)}**.\n` +
      `- Outstanding Payables: **${fmtINR(summary.expenses * 1.2)}** in outstanding supplier invoices.\n\n` +
      `**2. Sales & Commerce Performance**\n` +
      `- Gross Sales: **${fmtINR(summary.grossRevenue)}** collected across **${summary.orders} orders** today.\n\n` +
      `**3. Inventory & Supply Chain Risks**\n` +
      `- Out-of-Stock: **${outOfStock.length} items** completely depleted.\n` +
      `- Low-Stock Candidates: **${lowStock.length} items** below reorder levels.\n\n` +
      `**4. Compliance & System Anomalies**\n` +
      `- Active Anomalies: **1 unresolved alert** (PCMC Property Tax payment check required).\n\n` +
      `**Strategic Recommendations:**\n` +
      `- Reorder depleted high-demand items (most critical: ${outOfStock[0]?.name || "N/A"}).\n` +
      `- Review outstanding supplier payables.`;

    return {
      answer,
      summary: `Gross Sales: ${fmtINR(summary.grossRevenue)}. Out of stock: ${outOfStock.length}.`,
      evidence: [
        { label: "Gross Sales Today", value: fmtINR(summary.grossRevenue) },
        { label: "Out of Stock Items", value: outOfStock.length.toString() }
      ],
      reasoning: [
        "Retrieved local mock context data.",
        "Scanned and flagged out-of-stock items and compliance anomalies."
      ],
      recommendedActions: [
        ...(outOfStock[0] ? [{
          title: `Urgent Restock: ${outOfStock[0].name}`,
          description: `Generate PO to restock ${outOfStock[0].name} (0 stock on hand).`,
          priority: "high" as const,
          actionType: "CREATE_PO" as const,
          entityId: outOfStock[0].id
        }] : []),
        {
          title: "Deploy Treasury Reserves",
          description: "Review portfolio and allocate reserves to commodities.",
          priority: "medium" as const,
          actionType: "NAVIGATE" as const,
          entityId: "/market-intelligence"
        }
      ],
      risks: outOfStock.length > 0 ? [{ title: "Stockout Revenue Losses", severity: "high" as const }] : [],
      confidence: 1.0
    };
  }

  // 1.5 High Demand + Out of Stock Intent
  if (ctx.intent === "high_demand_out_of_stock") {
    const candidates = getReorderCandidates(ctx.resolvedDate, roleScope);
    const sorted = [...candidates].sort((a, b) => b.sold - a.sold);
    const outOfStock = sorted.filter(p => p.stock === 0);
    const lowStock = sorted.filter(p => p.stock > 0);

    const evidence = sorted.slice(0, 5).map((p) => ({
      label: p.name,
      value: `Stock: ${p.stock} | Sold: ${p.sold} units (Rev: ₹${p.revenue})`,
      sourceType: "product",
      sourceId: p.id,
    }));

    const actions = sorted.slice(0, 2).map(p => ({
      title: `Urgent restock of high-demand: ${p.name}`,
      description: `Generate PO for ${p.reorder * 2} units. Product has high sales velocity (${p.sold} units sold) but is currently ${p.stock === 0 ? "out of stock" : "low stock"}.`,
      priority: "high" as const,
      estimatedImpact: `Protects high demand category sales`,
      actionType: "CREATE_PO" as const,
      entityId: p.id,
    }));

    let answer = "";
    if (outOfStock.length > 0) {
      answer = `Here are the high-demand products that are completely OUT OF STOCK (sorted by sales velocity):\n\n` +
        outOfStock.map((p, idx) => `${idx + 1}. **${p.name}** (SKU: ${p.id}) — **${p.sold} units sold** (Generated ₹${p.revenue} revenue, current stock: 0).`).join("\n") +
        `\n\nImmediate restocking is critical for these items to avoid continuous lost revenue.`;
    } else {
      answer = `There are no completely out-of-stock products. However, the highest-demand low-stock products are:\n\n` +
        lowStock.slice(0, 5).map((p, idx) => `${idx + 1}. **${p.name}** (SKU: ${p.id}) — **${p.sold} units sold** (Current stock: ${p.stock}/${p.reorder}).`).join("\n");
    }

    return {
      answer,
      summary: `${outOfStock.length} high-demand products are completely out of stock.`,
      evidence,
      reasoning: [
        "Cross-referenced product stock level (0) with historic transaction quantities to evaluate demand.",
        "Prioritized items based on total units sold to maximize revenue protection."
      ],
      recommendedActions: actions,
      risks: outOfStock.map(p => ({ title: `Lost sales on high-demand ${p.name}`, severity: "high" as const })),
      confidence: 0.98,
    };
  }

  // 1. Reorder Intent
  if (ctx.intent === "reorder") {
    const candidates = getReorderCandidates(ctx.resolvedDate, roleScope);
    const outOfStock = candidates.filter((p) => p.stock === 0);
    const lowStock = candidates.filter((p) => p.stock > 0);
    const isOutofStockQuery = q.includes("out of") || q.includes("outof") || q.includes("outoff") || q.includes("empty") || q.includes("shortage") || q.includes("zero") || q.includes("stockout");

    const amul = candidates.find((p) => p.name.includes("Amul"));
    const lakme = candidates.find((p) => p.name.includes("Lakmé"));

    const evidence = candidates.map((p) => ({
      label: p.name,
      value: `${p.stock} units left (reorder point: ${p.reorder})`,
      sourceType: "product",
      sourceId: p.id,
    }));

    const actions: any[] = [];
    if (amul) {
      actions.push({
        title: "Reorder Amul Taaza Milk 1L",
        description:
          "Generate draft purchase order for 240 units to prevent immediate grocery shelf depletion.",
        priority: "high",
        estimatedImpact: "₹12,960 PO / ₹16.3K revenue protected",
        actionType: "CREATE_PO",
        entityId: "rec-dairy-reorder-001", // link to dairy reorder recommendation
      });
    }
    if (lakme) {
      actions.push({
        title: "Reorder Lakmé Foundation",
        description: "Reorder 25 units from Lakmé India distributor.",
        priority: "medium",
        estimatedImpact: "Replenish high-margin Beauty SKU",
        actionType: "CREATE_PO",
        entityId: lakme.id,
      });
    }

    let answer = "";
    if (isOutofStockQuery) {
      if (outOfStock.length > 0) {
        answer = `There are currently ${outOfStock.length} completely out-of-stock products: ${outOfStock.map((p) => `${p.name} (${p.id})`).join(", ")}. Immediate restock is recommended.`;
      } else {
        answer = `There are currently 0 completely out-of-stock products in the system. However, there are ${lowStock.length} low-stock products currently below their reorder levels: ${lowStock.slice(0, 3).map((p) => `${p.name} (${p.stock} units)`).join(", ")}.`;
      }
    } else {
      answer = `There are currently ${candidates.length} low-stock products requiring attention. The most critical item is ${amul ? "Amul Taaza Milk 1L (128 units on hand, reorder trigger 200)" : "Lakmé Foundation (4 units left)"}.`;
    }

    return {
      answer,
      summary: isOutofStockQuery
        ? `${outOfStock.length} products are out of stock, ${lowStock.length} are low stock.`
        : `${candidates.length} SKUs require reordering to prevent category sales disruption.`,
      evidence: evidence.slice(0, 4),
      reasoning: [
        "Customer footfall count rose in the current period, accelerating stock velocity.",
        "Supplier delivery cycles average 2-4 days, posing immediate stockout risk.",
      ],
      recommendedActions:
        actions.length > 0
          ? actions
          : [
              {
                title: "Go to Inventory",
                description: "Review current low-stock SKUs list.",
                priority: "low",
                actionType: "NAVIGATE",
                entityId: "/inventory",
              },
            ],
      risks: [
        { title: "Dairy category shelf stockout", severity: "high" },
        { title: "Beauty category inventory depletion", severity: "medium" },
      ],
      confidence: 0.95,
    };
  }

  // 2. Expiry Intent
  if (ctx.intent === "expiry") {
    const risks = getExpiryRisks(ctx.resolvedDate, 7, roleScope);
    const yogurt = risks.find((r) => r.product.name.includes("Yogurt"));

    const evidence = risks.map((r) => ({
      label: r.product.name,
      value: `Expires in ${r.daysToExpiry} days (${r.product.stock} units at risk)`,
      sourceType: "product",
      sourceId: r.product.id,
    }));

    return {
      answer: yogurt
        ? `We have 1 high-risk batch expiring soon: Nestlé Yogurt 400g (Batch BAT-11023-01, 42 units) expiring on May 7, 2026 (in 2 days).`
        : `No critical batch expirations detected within the next 7 days.`,
      summary: yogurt
        ? `1 grocery SKU batch at risk of expiry write-off in 2 days.`
        : "Expiry risk profiles are safe.",
      evidence,
      reasoning: [
        "Slower-than-expected sales velocity of packaged dairy items over the last 14 days.",
        "Rethink stock quantities on reorder forms to align with weekly volume limits.",
      ],
      recommendedActions: yogurt
        ? [
            {
              title: "Apply Yogurt Expiry Markdown",
              description: "Authorize immediate 20% promotional discount on Nestlé Yogurt batch.",
              priority: "high",
              estimatedImpact: "₹1,764 stock value recovered",
              actionType: "APPLY_MARKDOWN",
              entityId: "rec-dairy-markdown-002",
            },
          ]
        : [],
      risks: yogurt ? [{ title: "₹1,764 write-off penalty", severity: "medium" }] : [],
      confidence: 0.92,
    };
  }

  // 3. Utilities Intent
  if (ctx.intent === "utilities") {
    const anomalies = getUtilityAnomalies(ctx.resolvedDate, roleScope);
    const isAnomaly = anomalies.length > 0;

    return {
      answer: isAnomaly
        ? `An active utility anomaly was flagged: HVAC Zone B overnight electricity usage spiked +163% between 1 AM and 4 AM.`
        : `Utility consumption readings are in normal ranges. Baseline energy levels are optimal.`,
      summary: isAnomaly
        ? "HVAC compressor fault detected in mall Zone B."
        : "Utilities grid is stable.",
      evidence: anomalies.map((a) => ({
        label: `${a.metric} Anomaly`,
        value: `Actual: ${a.actual} vs baseline ${a.expected} (Deviation: ${a.deviation})`,
        sourceType: "anomaly",
        sourceId: a.id,
      })),
      reasoning: [
        "Zone B compressors failed to cycle off after mall closing hours.",
        "Rooftop solar baseline is stable but grid backup draw remains high due to anomaly.",
      ],
      recommendedActions: isAnomaly
        ? [
            {
              title: "Dispatch HVAC Crew",
              description: "Dispatch maintenance team to Zone B to investigate compressor valves.",
              priority: "high",
              estimatedImpact: "₹38,400 monthly savings protected",
              actionType: "INVESTIGATE_ANOMALY",
              entityId: anomalies[0].id,
            },
          ]
        : [],
      risks: isAnomaly
        ? [{ title: "₹1,280 daily excess electricity costs", severity: "high" }]
        : [],
      confidence: 0.96,
    };
  }

  // 4. Supplier performance intent
  if (ctx.intent === "suppliers") {
    const risky = getSupplierRisks(ctx.resolvedDate, roleScope);
    const sony = risky.find((s) => s.name.includes("Sony"));

    return {
      answer: sony
        ? "Sony India is currently flagged as our highest-risk supplier partner (Reliability Score: 72). They average 7.4 days lead time vs 4.6 days industry standard, with on-time delivery of only 76%."
        : `Supplier SLA compliances are currently in line with target ratings.`,
      summary: sony
        ? "Sony India logistics bottlenecks affecting electronics stocks."
        : "Supplier ratings are optimal.",
      evidence: risky.map((s) => ({
        label: s.name,
        value: `Score: ${s.score} | Lead Time: ${s.lead}d`,
        sourceType: "supplier",
        sourceId: s.id,
      })),
      reasoning: [
        "Sony warehouse renovations in the West region have caused logistics dispatch backlogs.",
        "Secondary local backups for key SKUs are missing, elevating stockout vulnerabilities.",
      ],
      recommendedActions: sony
        ? [
            {
              title: "Review Sony India SLA",
              description: "Initiate formal contract SLA audit review regarding delivery delays.",
              priority: "medium",
              actionType: "OPEN_SUPPLIER",
              entityId: sony.id,
            },
          ]
        : [],
      risks: sony ? [{ title: "Electronics category shipment backlogs", severity: "medium" }] : [],
      confidence: 0.89,
    };
  }

  // 5. Comparison Intent
  if (ctx.intent === "comparison") {
    const dateA = ctx.resolvedDate;
    const dateB = ctx.resolvedDate === "2026-05-05" ? "2026-05-04" : "2026-05-05";
    const comp = compareDates(dateA, dateB, roleScope);

    return {
      answer: `Comparing ${dateA} with ${dateB}: Revenue grew by ${comp.revenueDeltaPct}% (₹${comp.sumA.grossRevenue} vs ₹${comp.sumB.grossRevenue}), while net profit rose by ${comp.profitDeltaPct}% (₹${comp.sumA.netProfit} vs ₹${comp.sumB.netProfit}).`,
      summary: `Day-on-day growth is positive, lead by department transaction count spikes.`,
      evidence: [
        { label: `Revenue ${dateA}`, value: `₹${comp.sumA.grossRevenue}` },
        { label: `Revenue ${dateB}`, value: `₹${comp.sumB.grossRevenue}` },
        {
          label: `Revenue Delta`,
          value: `${comp.revenueDeltaPct > 0 ? "+" : ""}${comp.revenueDeltaPct}%`,
        },
      ],
      reasoning: [
        "Weekend footfall boost on May 5 coupled with high-value cart orders.",
        "Fixed expenses remained static, allowing revenue spikes to flow directly into net margins.",
      ],
      recommendedActions: [
        {
          title: "Go to Sales Intelligence",
          description: "Compare hourly transaction trends for further insights.",
          priority: "low",
          actionType: "NAVIGATE",
          entityId: "/sales",
        },
      ],
      risks: [],
      confidence: 0.94,
    };
  }

  // 6. VIP/Customer Intent
  if (ctx.intent === "customers") {
    const vips = getVIPCustomers(ctx.resolvedDate, roleScope);
    return {
      answer: `Our highest-value VIP segments are performing strongly. Top accounts include ${vips.length > 0 ? vips[0].name : "Meera Rane"} (spent ₹${vips.length > 0 ? vips[0].spend : "3,84,200"}).`,
      summary: "VIP spends remain the primary revenue driver for anchor department brands.",
      evidence: vips.slice(0, 3).map((c) => ({
        label: c.name,
        value: `Spend: ₹${c.spend} | Churn Risk: ${c.churn}%`,
        sourceType: "customer",
        sourceId: c.id,
      })),
      reasoning: [
        "Spends are driven by premium product purchases in Fashion and Electronics.",
        "Lack of direct retargeting campaigns in the last 60 days has flagged some VIPs at churn risk.",
      ],
      recommendedActions:
        vips.length > 0
          ? [
              {
                title: `Inspect Customer Profile`,
                description: `Open customer profile for ${vips[0].name} to review their basket preferences.`,
                priority: "medium",
                actionType: "OPEN_CUSTOMER",
                entityId: vips[0].id,
              },
            ]
          : [],
      risks: [{ title: "VIP customer retention gap", severity: "medium" }],
      confidence: 0.91,
    };
  }

  // 7. Budget Allocation Scenario
  if (ctx.intent === "budget_allocation") {
    const reorders = getReorderCandidates(ctx.resolvedDate, roleScope);
    const anomalies = getUtilityAnomalies(ctx.resolvedDate, roleScope);
    const expiry = getExpiryRisks(ctx.resolvedDate, 7, roleScope);

    if (reorders.length === 0 && anomalies.length === 0) {
      return {
        answer: `There are currently no critical anomalies or reorder candidates requiring immediate budget allocation.`,
        summary: "Operations are fully funded and stable.",
        evidence: [],
        reasoning: ["No active utility anomalies detected.", "No stock items below reorder thresholds."],
        recommendedActions: [],
        risks: [],
        confidence: 0.95,
      };
    }

    return {
      answer: `Based on active data, you should allocate budget to address ${anomalies.length} active anomalies and ${reorders.length} low-stock products.`,
      summary: "Allocate capital to mitigate active risks.",
      evidence: [
        { label: "Active Anomalies", value: anomalies.length.toString() },
        { label: "Low Stock Items", value: reorders.length.toString() },
      ],
      reasoning: [
        "Resolving anomalies prevents ongoing revenue leaks.",
        "Restocking inventory protects future transaction volume.",
      ],
      recommendedActions: [],
      risks: [{ title: "Delaying budget allocation increases risk exposure", severity: "medium" }],
      confidence: 0.85,
    };
  }

  // 8. Consequence Analysis / Do Nothing Scenario
  if (ctx.intent === "consequence_analysis") {
    const reorders = getReorderCandidates(ctx.resolvedDate, roleScope);
    const anomalies = getUtilityAnomalies(ctx.resolvedDate, roleScope);
    const expiry = getExpiryRisks(ctx.resolvedDate, 7, roleScope);

    if (reorders.length === 0 && anomalies.length === 0 && expiry.length === 0) {
      return {
        answer: "There are currently no active risks, anomalies, or stockouts detected in the system.",
        summary: "Operations are running smoothly.",
        evidence: [],
        reasoning: ["Scanned active anomalies, stock levels, and expiry dates and found 0 risks."],
        recommendedActions: [],
        risks: [],
        confidence: 0.95,
      };
    }

    return {
      answer: `If you do nothing today, you face consequences from ${anomalies.length} active anomalies, ${expiry.length} expiring batches, and ${reorders.length} stockouts.`,
      summary: "Delaying operational responses will result in margin bleed and product shortages.",
      evidence: [
        { label: "Expiring Batches", value: expiry.length.toString() },
        { label: "Active Anomalies", value: anomalies.length.toString() },
        { label: "Low Stock Items", value: reorders.length.toString() },
      ],
      reasoning: [
        "Anomalies continue to accrue costs if left unresolved.",
        "Expiring batches become complete write-offs if not sold or returned.",
      ],
      recommendedActions: [],
      risks: [
        { title: "Margin erosion from inaction", severity: "high" },
      ],
      confidence: 0.9,
    };
  }

  // 9. Department Performance
  if (ctx.intent === "department_performance") {
    const shares = getDepartmentPerformance(ctx.resolvedDate, roleScope);
    const best = shares.length > 0 ? shares[0] : { name: "Fashion", sharePct: 32 };
    return {
      answer: `The best-performing department today is ${best.name} with a ${best.sharePct}% share of total mall revenues.`,
      summary: "Fashion continues to lead core mall transactions.",
      evidence: shares.map((s) => ({
        label: s.name,
        value: `${s.sharePct}% revenue share`,
      })),
      reasoning: [
        "Increased promotional traffic inside core apparel outlets.",
        "Electronics holds high ticket values but volume density remains in Fashion.",
      ],
      recommendedActions: [
        {
          title: "Go to Analytics",
          description: "Review detailed department share metrics.",
          priority: "low",
          actionType: "NAVIGATE",
          entityId: "/analytics",
        },
      ],
      risks: [],
      confidence: 0.9,
    };
  }

  // Default Overview / General Summary
  const summary = getBusinessSummary(ctx.resolvedDate, roleScope);
  const actions = getRecommendedActions(ctx.resolvedDate, roleScope);

  return {
    answer: summary.orders === 0 
      ? `There is currently no transaction activity recorded for ${ctx.resolvedDate}. Revenue and profit are at ₹0.`
      : roleScope === "manager"
        ? `GrandSquare Mall (Fashion scoped) is running steadily on ${ctx.resolvedDate}. Scoped sales total ₹${summary.grossRevenue} with a net profit margin estimate of 16%.`
        : `GrandSquare Mall is performing steadily on ${ctx.resolvedDate}. Total gross revenue reached ₹${summary.grossRevenue} with a net profit of ₹${summary.netProfit} across ${summary.orders} orders.`,
    summary: summary.orders === 0
      ? "No business activity recorded."
      : roleScope === "manager"
        ? "Fashion department metrics are within standard guidelines."
        : "GrandSquare Mall operations are performing within normal parameters.",
    evidence: [
      { label: "Gross Revenue", value: `₹${summary.grossRevenue}` },
      { label: "Net Profit", value: `₹${summary.netProfit}` },
      { label: "Active recommendations", value: `${summary.activeRecommendations} pending` },
    ],
    reasoning: summary.orders === 0
      ? ["No sales transactions found in the database for this date."]
      : [
          "Calculated from daily transaction ledgers.",
          "Profit margins derived from standard COGS deductions.",
        ],
    recommendedActions: actions.slice(0, 2).map((r) => ({
      title: r.title,
      description: r.explanation,
      priority:
        r.severity === "Critical" || r.severity === "High"
          ? "high"
          : r.severity === "Medium"
            ? "medium"
            : ("low" as any),
      estimatedImpact: r.impact,
      actionType: r.title.toLowerCase().includes("reorder")
        ? "CREATE_PO"
        : r.title.toLowerCase().includes("hvac")
          ? "INVESTIGATE_ANOMALY"
          : "APPLY_MARKDOWN",
      entityId: r.id,
    })),
    risks:
      summary.activeAnomalies > 0
        ? [{ title: "Grid energy draw leak in Zone B", severity: "high" }]
        : [],
    confidence: 0.94,
  };
}
