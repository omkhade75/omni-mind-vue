export interface DiscrepancyLog {
  sourceDomainA: string;
  sourceDomainB: string;
  metricLabel: string;
  valueA: number;
  valueB: number;
  difference: number;
  discrepancyPercentage: number;
  isContradiction: boolean;
}

export class ContradictionEngine {
  public static crossCheckData(
    revenueData: any,
    expenseData: any,
    ledgerBalances: any,
  ): DiscrepancyLog[] {
    const discrepancies: DiscrepancyLog[] = [];

    if (revenueData && ledgerBalances) {
      const netSales = Number(revenueData.netSales) || 0;
      // Fetch corresponding sales revenue ledger account value if present
      const ledgerSales = Number(ledgerBalances.salesRevenue) || netSales; // fallback matches if missing

      const diff = Math.abs(netSales - ledgerSales);
      const pct = netSales > 0 ? (diff / netSales) * 100 : 0;

      discrepancies.push({
        sourceDomainA: "Transactions POS",
        sourceDomainB: "Ledger Sales Revenue",
        metricLabel: "Total Sales Revenue",
        valueA: netSales,
        valueB: ledgerSales,
        difference: diff,
        discrepancyPercentage: Math.round(pct * 100) / 100,
        isContradiction: pct > 1.0, // trigger if > 1% discrepancy
      });
    }

    if (expenseData && ledgerBalances) {
      const totalExpense = Number(expenseData.totalExpense) || 0;
      const ledgerExpense = Number(ledgerBalances.utilityExpense) || totalExpense; // fallback

      const diff = Math.abs(totalExpense - ledgerExpense);
      const pct = totalExpense > 0 ? (diff / totalExpense) * 100 : 0;

      discrepancies.push({
        sourceDomainA: "Expense Receipts",
        sourceDomainB: "Ledger Expense Accounts",
        metricLabel: "Total Operating Expenses",
        valueA: totalExpense,
        valueB: ledgerExpense,
        difference: diff,
        discrepancyPercentage: Math.round(pct * 100) / 100,
        isContradiction: pct > 2.0, // trigger if > 2% discrepancy
      });
    }

    return discrepancies;
  }
}
