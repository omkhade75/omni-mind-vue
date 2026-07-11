export interface MonitorAlert {
  id: string;
  metricType: "revenue" | "inventory" | "expense" | "utility" | "customer" | "supplier";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  currentValue: string | number;
  thresholdValue: string | number;
  triggerTime: string;
}

export class AutonomousMonitor {
  public static evaluateMetrics(
    revenueData: any,
    inventoryData: any,
    expenseData: any,
    utilityReadings: any[],
    customerStats: any,
    supplierData: any,
  ): MonitorAlert[] {
    const alerts: MonitorAlert[] = [];
    const timestamp = new Date().toISOString();

    // 1. Revenue Monitor
    if (revenueData && typeof revenueData.netSales === "number") {
      const target = 250000; // Expected average daily target
      if (revenueData.netSales < target * 0.8) {
        alerts.push({
          id: `alert-rev-${Date.now()}`,
          metricType: "revenue",
          severity: "high",
          title: "Net revenue drop detected",
          description: `Net Sales are at ₹${revenueData.netSales.toLocaleString()}, which is below 80% of daily target benchmark (₹${target.toLocaleString()}).`,
          currentValue: revenueData.netSales,
          thresholdValue: target * 0.8,
          triggerTime: timestamp,
        });
      }
    }

    // 2. Utility Monitor
    if (Array.isArray(utilityReadings)) {
      utilityReadings.forEach((reading) => {
        if (reading.value > reading.baseline * 1.4) {
          alerts.push({
            id: `alert-util-${Date.now()}-${reading.id || "reading"}`,
            metricType: "utility",
            severity: "high",
            title: `Utility demand spike: ${reading.zone || "Zone B"}`,
            description: `Electricity reading of ${reading.value} kW exceeded standard baseline by over 40% (baseline: ${reading.baseline} kW).`,
            currentValue: reading.value,
            thresholdValue: reading.baseline * 1.4,
            triggerTime: timestamp,
          });
        }
      });
    }

    // 3. Inventory Stockout Monitor
    if (inventoryData) {
      if (inventoryData.outOfStockCount > 5) {
        alerts.push({
          id: `alert-inv-${Date.now()}-stockout`,
          metricType: "inventory",
          severity: "critical",
          title: "Critical product stockouts",
          description: `${inventoryData.outOfStockCount} active items are out of stock. Estimated revenue risk is active.`,
          currentValue: inventoryData.outOfStockCount,
          thresholdValue: 5,
          triggerTime: timestamp,
        });
      }
      if (inventoryData.lowStockCount > 15) {
        alerts.push({
          id: `alert-inv-${Date.now()}-lowstock`,
          metricType: "inventory",
          severity: "medium",
          title: "High volume low stock items",
          description: `${inventoryData.lowStockCount} items have reached or breached safety stock levels.`,
          currentValue: inventoryData.lowStockCount,
          thresholdValue: 15,
          triggerTime: timestamp,
        });
      }
    }

    // 4. Customer Churn Monitor
    if (customerStats && typeof customerStats.churnRiskVIPCount === "number" && customerStats.churnRiskVIPCount > 0) {
      alerts.push({
        id: `alert-cust-${Date.now()}-vip`,
        metricType: "customer",
        severity: "high",
        title: "VIP Customer inactivity alert",
        description: `${customerStats.churnRiskVIPCount} VIP loyalty segment members have been inactive for over 45 days.`,
        currentValue: customerStats.churnRiskVIPCount,
        thresholdValue: 0,
        triggerTime: timestamp,
      });
    }

    // 5. Supplier SLA Monitor
    if (supplierData && typeof supplierData.delayedCount === "number" && supplierData.delayedCount > 0) {
      alerts.push({
        id: `alert-supp-${Date.now()}-delay`,
        metricType: "supplier",
        severity: "medium",
        title: "Supplier delivery delays",
        description: `${supplierData.delayedCount} active purchase orders are currently past their scheduled delivery deadlines.`,
        currentValue: supplierData.delayedCount,
        thresholdValue: 0,
        triggerTime: timestamp,
      });
    }

    return alerts;
  }
}
