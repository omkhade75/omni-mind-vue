import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { getAccountsDataServer } from "@/lib/server-accounts";
import { toast } from "sonner";
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet, Receipt, CreditCard } from "lucide-react";
import { fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts & Payments — OmniMind AI" },
      { name: "description", content: "Accounts Receivable and Payable tracker." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ receivables: any[]; payables: any[] }>({ receivables: [], payables: [] });

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getAccountsDataServer({
        data: {
          role: user?.role || "owner",
          email: user?.email || ""
        }
      });
      setData(result);
    } catch (e) {
      toast.error("Failed to load accounts data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const totalReceivables = data.receivables.reduce((sum, r) => sum + r.amount, 0);
  const totalPayables = data.payables.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts & Payments"
        description="Track pending receivables (what customers owe) and payables (what you owe suppliers)."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Total Receivables (To Collect)"
          value={fmtINR(totalReceivables)}
          trend="up"
          trendValue="from Pending Sales"
          icon={<ArrowDownRight className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Total Payables (To Pay)"
          value={fmtINR(totalPayables)}
          trend="down"
          trendValue="from Open POs"
          icon={<ArrowUpRight className="h-5 w-5 text-rose-500" />}
        />
        <KpiCard
          label="Net Cash Position"
          value={fmtINR(totalReceivables - totalPayables)}
          trend={totalReceivables >= totalPayables ? "up" : "down"}
          trendValue="Receivables minus Payables"
          icon={<Wallet className="h-5 w-5 text-indigo-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Accounts Receivable (Pending Payments In)" icon={<Receipt className="h-5 w-5 text-emerald-500" />}>
          {data.receivables.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              No pending receivables. All transactions are paid!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                  <tr>
                    <th className="px-4 py-3">Txn #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{r.transactionNumber}</td>
                      <td className="px-4 py-3 text-zinc-600">{r.customerName}</td>
                      <td className="px-4 py-3 text-zinc-500">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-900">{fmtINR(r.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill tone={r.status === "Pending" ? "warning" : "danger"}>
                          {r.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Accounts Payable (Pending Payments Out)" icon={<CreditCard className="h-5 w-5 text-rose-500" />}>
          {data.payables.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              No pending payables. All suppliers are paid!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                  <tr>
                    <th className="px-4 py-3">PO #</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.payables.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{p.poNumber}</td>
                      <td className="px-4 py-3 text-zinc-600">{p.supplierName}</td>
                      <td className="px-4 py-3 text-zinc-500">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-900">{fmtINR(p.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill tone={p.status === "Pending" ? "warning" : "danger"}>
                          {p.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
