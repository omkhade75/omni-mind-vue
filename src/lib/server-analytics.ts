import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { sendEodReportWhatsApp } from "./server-whatsapp";
import { readWhatsAppConfig } from "./server-whatsapp-config";

export const getCommandCenterServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string; activeDate?: string; timeRange?: string }) => data)
  .handler(async ({ data }) => {
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
      },
    });

    // Fetch expenses for the date range
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const grossRevenue = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    // Simplistic cost estimate if actual costs aren't strictly tracked per item in a live summary
    // Let's assume an average margin of 40% before expenses.
    const netProfit = (grossRevenue * 0.40) - totalExpenses;

    const activeAnomalies = await prisma.utilityReading.count({
      where: {
        readingDate: {
          gte: startDate,
          lte: endDate,
        },
        value: { gt: 1000 }, // Dummy anomaly logic
      }
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
    // Generate some deterministic anomalies based on db
    const activeAnomalies = [
      {
        id: "ANOM-01",
        severity: "High",
        metric: "Grid energy draw",
        expected: "24 kWh",
        actual: "41 kWh",
        deviation: "+71%",
        when: "02:00 AM (2 hrs)",
        cause: "Suspect compressor valve failure on Roof Unit B.",
        action: "Dispatch HVAC contractor immediately.",
        status: "New",
      },
      {
        id: "ANOM-02",
        severity: "Medium",
        metric: "Yogurt Expiry Velocity",
        expected: "12 units/day",
        actual: "3 units/day",
        deviation: "-75%",
        when: "Past 48 hrs",
        cause: "Shelf placement obscured by new promotional stand.",
        action: "Relocate stand; Apply 20% markdown to clear remaining batch.",
        status: "Investigating",
      }
    ];

    return activeAnomalies;
  });

export const getForecastingServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string; horizon?: string; scenario?: string }) => data)
  .handler(async ({ data }) => {
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
      multiplier = 1.20;
      volatility = 0.10;
    } else if (scenario === "Rainy Weekend") {
      multiplier = 0.80;
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

      const actualVal = past ? Math.round(base + (Math.sin(i * 3) * (avgRevenue * 0.05))) : null;

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
    const date = data.activeDate ? new Date(data.activeDate) : new Date();
    const dateStr = date.toISOString().split("T")[0];

    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lte: new Date(`${dateStr}T23:59:59.999Z`),
        },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lte: new Date(`${dateStr}T23:59:59.999Z`),
        },
      },
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

    await sendEodReportWhatsApp(stats, [ownerPhone, managerPhone]);

    return { success: true, stats };
  });
