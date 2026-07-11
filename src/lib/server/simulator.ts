export interface SimulationProjection {
  scenarioName: string;
  parameterAdjusted: string;
  adjustmentValue: string;
  originalRevenue: number;
  projectedRevenue: number;
  revenueChangePercentage: number;
  originalProfit: number;
  projectedProfit: number;
  profitChangePercentage: number;
  projectedCashFlow: number;
  projectedStockoutRisk: "low" | "medium" | "high";
  explanation: string;
}

export class SimulationEngine {
  public static simulateScenario(
    query: string,
    baseRevenue: number,
    baseProfit: number,
    baseCash: number,
  ): SimulationProjection {
    const q = query.toLowerCase();
    let scenarioName = "Baseline Business Forecast";
    let parameterAdjusted = "None";
    let adjustmentValue = "0%";
    let projectedRevenue = baseRevenue;
    let projectedProfit = baseProfit;
    let projectedCashFlow = baseCash;
    let projectedStockoutRisk: SimulationProjection["projectedStockoutRisk"] = "low";
    let explanation = "Baseline projection using current PostgreSQL rolling metrics.";

    if (q.includes("price") && (q.includes("increase") || q.includes("change"))) {
      scenarioName = "Price Elasticity Simulation";
      parameterAdjusted = "Average Selling Price (ASP)";
      adjustmentValue = "+5%";
      // Simple price elasticity model: +5% price -> -3% demand volume -> +1.8% net revenue
      projectedRevenue = Math.round(baseRevenue * 1.0185);
      // Net profit increases due to higher unit margins
      projectedProfit = Math.round(baseProfit * 1.042);
      projectedCashFlow = Math.round(baseCash * 1.025);
      projectedStockoutRisk = "medium";
      explanation = "A 5% price increase leads to an estimated 3% contraction in demand volume, resulting in an elastic net sales expansion of +1.85% and +4.2% margin improvement.";
    } else if (q.includes("expense") && (q.includes("reduce") || q.includes("cut") || q.includes("decrease"))) {
      scenarioName = "OpEx Optimization Simulation";
      parameterAdjusted = "Discretionary Operating Expenses";
      adjustmentValue = "-15%";
      projectedRevenue = baseRevenue; // Sales volume unaffected directly by OpEx cuts
      // OpEx reduction directly increases profit
      projectedProfit = Math.round(baseProfit * 1.15);
      projectedCashFlow = Math.round(baseCash * 1.08);
      projectedStockoutRisk = "low";
      explanation = "A 15% reduction in discretionary utilities and operational spends directly flows to the bottom line, expanding net profit by 15.0% and improving operating cash position by 8.0%.";
    } else if (q.includes("footfall") && (q.includes("drop") || q.includes("decline") || q.includes("fall"))) {
      scenarioName = "Footfall Contraction Simulation";
      parameterAdjusted = "Mall Customer Footfall Count";
      adjustmentValue = "-10%";
      // -10% footfall -> -8% order volume -> -8% revenue
      projectedRevenue = Math.round(baseRevenue * 0.92);
      projectedProfit = Math.round(baseProfit * 0.88);
      projectedCashFlow = Math.round(baseCash * 0.93);
      projectedStockoutRisk = "low";
      explanation = "A 10% footfall contraction translates to an 8% drop in sales transaction count, contracting revenue by 8% and profit margins by 12% due to fixed cost overheads.";
    }

    return {
      scenarioName,
      parameterAdjusted,
      adjustmentValue,
      originalRevenue: baseRevenue,
      projectedRevenue,
      revenueChangePercentage: Math.round(((projectedRevenue - baseRevenue) / (baseRevenue || 1)) * 1000) / 10,
      originalProfit: baseProfit,
      projectedProfit,
      profitChangePercentage: Math.round(((projectedProfit - baseProfit) / (baseProfit || 1)) * 1000) / 10,
      projectedCashFlow,
      projectedStockoutRisk,
      explanation,
    };
  }
}
