export interface EvaluationReport {
  isValid: boolean;
  score: number; // 0 - 100
  contradictionsFound: string[];
  securityPass: boolean;
  warnings: string[];
}

export class SelfEvaluationEngine {
  public static evaluateResponse(
    answer: string,
    revenueData: any,
    expenseData: any,
    roleScope: string | null,
    isDiagnostic: boolean,
  ): EvaluationReport {
    const contradictionsFound: string[] = [];
    const warnings: string[] = [];
    let securityPass = true;
    let isValid = true;

    // 1. RBAC Verification
    if (roleScope && roleScope !== "owner" && roleScope !== "admin") {
      // Role scope manager should restrict access to designated department
      const lowerAnswer = answer.toLowerCase();
      // If manager belongs to Fashion, and the answer reports Electronics or Grocery details, raise warning
      if (roleScope.toLowerCase().includes("fashion") && (lowerAnswer.includes("electronics") || lowerAnswer.includes("grocery"))) {
        securityPass = false;
        contradictionsFound.push("Security Boundary: Department manager accessed cross-department metrics.");
      }
    }

    // 2. Math Consistency / Contradiction Checks
    if (revenueData && expenseData) {
      const netSales = Number(revenueData.netSales) || 0;
      const totalExpense = Number(expenseData.totalExpense) || 0;
      const profit = netSales - totalExpense;

      // Check if answer contains a claim of profit that contradicts the calculated metric
      const profitMatches = answer.match(/profit is ₹?(-?\d+(?:,\d{3})*(?:\.\d+)?)/i);
      if (profitMatches && profitMatches[1]) {
        const statedProfit = parseFloat(profitMatches[1].replace(/[^\d.-]/g, ""));
        if (Math.abs(statedProfit - profit) > 1000) {
          contradictionsFound.push(`Mathematical contradiction: Stated profit (₹${statedProfit.toLocaleString()}) does not reconcile with Net Sales - OpEx (₹${profit.toLocaleString()}).`);
        }
      }
    }

    // 3. Data Freshness Checks
    if (revenueData && !revenueData.meta?.isLive) {
      warnings.push("Input data is using stale snapshots. Live POS database connection unavailable.");
    }

    const score = Math.max(0, 100 - contradictionsFound.length * 30 - warnings.length * 10);
    if (!securityPass || contradictionsFound.length > 0) {
      isValid = false;
    }

    return {
      isValid,
      score,
      contradictionsFound,
      securityPass,
      warnings,
    };
  }
}
