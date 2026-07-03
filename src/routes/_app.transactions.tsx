import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { getTransactionsServer, type TransactionListItem } from "@/lib/server-transactions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length} bills synced on PostgreSQL across all departments`}
      />
      <SectionCard>
        <div className="overflow-x-auto min-h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No transactions recorded in database.
            </div>
          ) : (
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
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 font-mono text-[11px] text-muted-foreground">{t.transactionNumber}</td>
                    <td className="py-3 text-muted-foreground">{t.date} {t.time}</td>
                    <td className="py-3">
                      {t.customerId ? (
                        <button
                          onClick={() => openCustomer360(t.customerId)}
                          className="font-medium hover:text-primary transition-colors text-left hover:underline"
                        >
                          {t.customerName}
                        </button>
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
          )}
        </div>
      </SectionCard>
    </div>
  );
}
