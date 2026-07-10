import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { getTransactionsServer, type TransactionListItem } from "@/lib/server-transactions";
import { Loader2, Building2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/kpi-card";

export const Route = createFileRoute("/_app/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — OmniMind AI" },
      { name: "description", content: "All mall transactions with filters and drill-down." },
    ],
  }),
  component: Transactions,
});

function Transactions() {
  const { openCustomer360 } = useBusinessData();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await getTransactionsServer({
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
        }
      });
      setTransactions(res);
    } catch (e) {
      toast.error("Failed to load transactions history from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user]);

  // Split into B2B (business customer), B2C (registered), and Walk-in (unregistered)
  const b2bTransactions = transactions.filter(t => t.customerType === "B2B");
  const b2cRegisteredTransactions = transactions.filter(t => t.customerId && t.customerType !== "B2B");
  const b2cWalkinTransactions = transactions.filter(t => !t.customerId);

  const b2bTotal = b2bTransactions.reduce((sum, t) => sum + t.total, 0);
  const b2cTotal = b2cRegisteredTransactions.reduce((sum, t) => sum + t.total, 0) + 
                   b2cWalkinTransactions.reduce((sum, t) => sum + t.total, 0);

  const TransactionTable = ({ data, emptyMsg }: { data: TransactionListItem[]; emptyMsg: string }) => {
    if (data.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {emptyMsg}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-xs table-fixed border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
              <th className="pb-3 w-[120px] font-semibold">Txn ID</th>
              <th className="pb-3 w-[120px] font-semibold">Date & Time</th>
              <th className="pb-3 w-[150px] font-semibold">Customer</th>
              <th className="pb-3 w-[120px] font-semibold">Department</th>
              <th className="pb-3 w-[80px] text-right font-semibold">Items</th>
              <th className="pb-3 w-[100px] text-right font-semibold">Discount</th>
              <th className="pb-3 w-[120px] text-right font-semibold pr-4">Amount</th>
              <th className="pb-3 w-[100px] font-semibold pl-4">Payment</th>
              <th className="pb-3 w-[100px] font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {data.map((t) => (
              <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                <td className="py-3 font-mono text-[11px] text-muted-foreground">{t.transactionNumber}</td>
                <td className="py-3 text-muted-foreground">{t.date} {t.time}</td>
                <td className="py-3">
                  {t.customerId ? (
                    t.customerId === "TREASURY-01" ? (
                      <span className="font-medium text-emerald-500">{t.customerName}</span>
                    ) : (
                      <button
                        onClick={() => openCustomer360(t.customerId)}
                        className="font-medium hover:text-primary transition-colors text-left hover:underline"
                      >
                        {t.customerName}
                      </button>
                    )
                  ) : (
                    <span className="text-muted-foreground">Walk-in Customer</span>
                  )}
                </td>
                <td className="py-3 text-muted-foreground">{t.dept}</td>
                <td className="py-3 text-right">{t.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
                <td className="py-3 text-right text-muted-foreground">{fmtINR(t.discount)}</td>
                <td className="py-3 text-right font-semibold pr-4">{fmtINR(t.total)}</td>
                <td className="py-3 pl-4 font-medium text-foreground">{t.payment}</td>
                <td className="py-3">
                  <StatusPill tone={t.status === "Completed" || t.status === "Paid" ? "success" : "warning"}>
                    {t.status}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length} bills synced on PostgreSQL across all departments`}
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Transactions"
          value={transactions.length}
          format="number"
          icon={<ShoppingCart className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="B2B Transactions"
          value={b2bTransactions.length}
          format="number"
          icon={<Building2 className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="B2B Revenue"
          value={b2bTotal}
          format="inr"
          icon={<Building2 className="h-5 w-5 text-amber-500" />}
        />
        <KpiCard
          label="B2C Revenue"
          value={b2cTotal}
          format="inr"
          icon={<ShoppingCart className="h-5 w-5 text-pink-500" />}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* B2B Section */}
          <SectionCard
            title={`B2B Transactions — Business Customers (${b2bTransactions.length})`}
            icon={<Building2 className="h-5 w-5 text-emerald-500" />}
          >
            <TransactionTable data={b2bTransactions} emptyMsg="No B2B transactions recorded." />
          </SectionCard>

          {/* B2C Registered Section */}
          <SectionCard
            title={`B2C Transactions — Registered Customers (${b2cRegisteredTransactions.length})`}
            icon={<ShoppingCart className="h-5 w-5 text-indigo-500" />}
          >
            <TransactionTable data={b2cRegisteredTransactions} emptyMsg="No registered B2C transactions recorded." />
          </SectionCard>

          {/* B2C Walk-in Section */}
          <SectionCard
            title={`B2C Transactions — Walk-in Customers (${b2cWalkinTransactions.length})`}
            icon={<ShoppingCart className="h-5 w-5 text-pink-500" />}
          >
            <TransactionTable data={b2cWalkinTransactions} emptyMsg="No walk-in transactions recorded." />
          </SectionCard>
        </>
      )}
    </div>
  );
}
