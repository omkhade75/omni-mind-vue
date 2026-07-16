import { createServerFn } from "@tanstack/react-start";
import { getTenantPrisma } from "./server/prisma";
import { requireAuth } from "./server-auth";
import { sendEodReportWhatsApp } from "./server-whatsapp";
import { readWhatsAppConfig } from "./server-whatsapp-config";

export const getCommandCenterServer = createServerFn({ method: "POST" })
  .validator(
    (data: { role: string; email: string; activeDate?: string; timeRange?: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const activeDate = data.activeDate ? new Date(data.activeDate) : new Date();
    const timeRange = data.timeRange || "today";

    let startDate = new Date(activeDate);
    let endDate = new Date(activeDate);
    endDate.setHours(23, 59, 59, 999);

    if (timeRange === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === "yesterday") {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === "7d") {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === "30d") {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    // Fetch transactions for the date range
    const transactions = await prisma.transaction.findMany({
      where: {
              transactionDate: {
                gte: startDate,
                lte: endDate,
              },
            } as any,
    });

    // Fetch expenses for the date range
    const expenses = await prisma.expense.findMany({
      where: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            } as any,
    });

    const grossRevenue = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Simplistic cost estimate if actual costs aren't strictly tracked per item in a live summary
    // Let's assume an average margin of 40% before expenses.
    const netProfit = grossRevenue * 0.4 - totalExpenses;

    const activeAnomalies = await prisma.utilityReading.count({
      where: {
              readingDate: {
                gte: startDate,
                lte: endDate,
              },
              value: { gt: 1000 }, // Dummy anomaly logic
            } as any,
    });

    return {
      grossRevenue,
      netProfit,
      orders: transactions.length,
      expenses: totalExpenses,
      activeAnomalies,
      activeRecommendations: 2, // Mock for now
    };
  });

export const getAnomaliesServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string; activeDate?: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const anomalies = await prisma.anomaly.findMany({
      orderBy: { detectedAt: "desc" },
    });

    if (anomalies.length === 0) {
      // Seed initial anomalies in database so it is populated via PostgreSQL
      const seeded = [
        // @ts-ignore
        await prisma.anomaly.create({
          data: {
                      type: "Energy Surge",
                      severity: "High",
                      title: "Grid energy draw spike",
                      description: "Suspect compressor valve failure on Roof Unit B.",
                      evidence: JSON.stringify({ expected: "24 kWh", actual: "41 kWh", deviation: "+71%" }),
                      entityType: "UtilityReading",
                      status: "Active",
                      detectedAt: new Date(),
                    } as any,
        }),
        // @ts-ignore
        await prisma.anomaly.create({
          data: {
                      type: "Expiry Risk",
                      severity: "Medium",
                      title: "Yogurt Expiry Velocity",
                      description: "Shelf placement obscured by new promotional stand.",
                      evidence: JSON.stringify({ expected: "12 units/day", actual: "3 units/day", deviation: "-75%" }),
                      entityType: "Product",
                      status: "Active",
                      detectedAt: new Date(),
                    } as any,
        }),
      ];
      return seeded.map((a) => ({
        id: a.id,
        severity: a.severity,
        metric: a.type,
        expected: JSON.parse(a.evidence).expected,
        actual: JSON.parse(a.evidence).actual,
        deviation: JSON.parse(a.evidence).deviation,
        when: "Just now",
        cause: a.description,
        action: "Investigate immediate mitigation options.",
        status: a.status,
      }));
    }

    return anomalies.map((a) => {
      let parsedEvidence = { expected: "N/A", actual: "N/A", deviation: "0%" };
      try {
        parsedEvidence = JSON.parse(a.evidence);
      } catch {}
      return {
        id: a.id,
        severity: a.severity,
        metric: a.type,
        expected: parsedEvidence.expected,
        actual: parsedEvidence.actual,
        deviation: parsedEvidence.deviation,
        when: a.detectedAt.toISOString().split("T")[0],
        cause: a.description,
        action: "Relocate stand or apply markdown / dispatch contractor.",
        status: a.status,
      };
    });
  });

export const getRecommendationsServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async () => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const recs = await prisma.recommendation.findMany({
      orderBy: { generatedAt: "desc" },
    });

    if (recs.length === 0) {
      // Seed initial recommendations in database
      const seeded = [
        // @ts-ignore
        await prisma.recommendation.create({
          data: {
                      type: "MARKDOWN",
                      title: "Apply 20% markdown on expiring Yogurt",
                      summary: "Accelerate sales velocity for remaining batch expiring in 48 hours.",
                      evidence: JSON.stringify({ expectedVelocity: "12/day", actual: "3/day" }),
                      confidence: 0.95,
                      priority: "high",
                      expectedImpact: "₹1,200 recovered margin",
                      status: "New",
                    } as any,
        }),
        // @ts-ignore
        await prisma.recommendation.create({
          data: {
                      type: "PO",
                      title: "Reorder Lakmé Foundation (24 units)",
                      summary: "Current stock level (4 units) is below reorder point (15 units).",
                      evidence: JSON.stringify({ stock: 4, reorder: 15 }),
                      confidence: 0.88,
                      priority: "medium",
                      expectedImpact: "Prevent stockout sales loss",
                      status: "New",
                    } as any,
        }),
      ];
      return seeded.map((r) => ({
        id: r.id,
        category: r.type,
        title: r.title,
        evidence: r.summary,
        impact: r.expectedImpact || "",
        confidence: Number(r.confidence),
        priority: r.priority,
        status: r.status,
        generated: "Just now",
      }));
    }

    return recs.map((r) => ({
      id: r.id,
      category: r.type,
      title: r.title,
      evidence: r.summary,
      impact: r.expectedImpact || "",
      confidence: Number(r.confidence),
      priority: r.priority,
      status: r.status,
      generated: r.generatedAt.toISOString().split("T")[0],
    }));
  });

export const getForecastingServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string; horizon?: string; scenario?: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const horizon = data.horizon || "7d";
    const scenario = data.scenario || "Normal";

    // We will generate a dataset based on horizon:
    // "7d": 14 days actual, 7 days forecast (21 total)
    // "30d": 30 days actual, 30 days forecast (60 total)
    // "90d": 30 days actual, 90 days forecast (120 total)
    let pastDays = 14;
    let futureDays = 7;
    if (horizon === "30d") {
      pastDays = 30;
      futureDays = 30;
    } else if (horizon === "90d") {
      pastDays = 30;
      futureDays = 90;
    }

    const totalDays = pastDays + futureDays;

    // Let's compute average daily revenue from DB to keep numbers realistic.
    const txns = await prisma.transaction.findMany({
      take: 100,
    });
    const totalAmount = txns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const avgRevenue = txns.length > 0 ? (totalAmount / txns.length) * 15 : 150000;

    // Scenario modifiers
    let multiplier = 1.0;
    let volatility = 0.15;
    if (scenario === "Festival Demand") {
      multiplier = 1.35;
      volatility = 0.25;
    } else if (scenario === "Promotion Campaign") {
      multiplier = 1.2;
      volatility = 0.1;
    } else if (scenario === "Rainy Weekend") {
      multiplier = 0.8;
      volatility = 0.12;
    } else if (scenario === "Supplier Delay") {
      multiplier = 0.85;
      volatility = 0.18;
    }

    const forecastData = Array.from({ length: totalDays }, (_, i) => {
      const past = i < pastDays;
      // Add a slight sine wave for weekly cycle
      const cycle = Math.sin(i / 1.1) * (avgRevenue * 0.2);
      const base = avgRevenue + cycle;

      const actualVal = past ? Math.round(base + Math.sin(i * 3) * (avgRevenue * 0.05)) : null;

      // Apply scenario multiplier to future values
      const forecastVal = !past ? Math.round(base * multiplier * 1.03) : null;
      const upperVal = !past ? Math.round(base * multiplier * (1 + volatility)) : null;
      const lowerVal = !past ? Math.round(base * multiplier * (1 - volatility)) : null;

      return {
        day: `Day ${i + 1}`,
        actual: actualVal,
        forecast: forecastVal,
        upper: upperVal,
        lower: lowerVal,
      };
    });

    return forecastData;
  });

export const dispatchEodReportServer = createServerFn({ method: "POST" })
  .validator((data: { activeDate?: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const date = data.activeDate ? new Date(data.activeDate) : new Date();
    const dateStr = date.toISOString().split("T")[0];

    const transactions = await prisma.transaction.findMany({
      where: {
              transactionDate: {
                gte: new Date(`${dateStr}T00:00:00.000Z`),
                lte: new Date(`${dateStr}T23:59:59.999Z`),
              },
            } as any,
    });

    const expenses = await prisma.expense.findMany({
      where: {
              date: {
                gte: new Date(`${dateStr}T00:00:00.000Z`),
                lte: new Date(`${dateStr}T23:59:59.999Z`),
              },
            } as any,
    });

    const grossRevenue = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = grossRevenue * 0.4 - totalExpenses; // Approx 40% margin

    // Usually we would fetch anomalies from DB, but we'll mock 2 for the EOD report demo
    const activeAnomalies = 2;

    const stats = {
      date: dateStr,
      revenue: grossRevenue,
      profit: netProfit,
      orders: transactions.length,
      anomalies: activeAnomalies,
    };

    const waConfig = readWhatsAppConfig();
    const ownerPhone = waConfig.ownerWhatsAppNumber || "+919876543210";
    const managerPhone = waConfig.managerWhatsAppNumber || "+919876543211";

    await sendEodReportWhatsApp(stats, [ownerPhone, managerPhone], user.workspaceId);

    return { success: true, stats };
  });
