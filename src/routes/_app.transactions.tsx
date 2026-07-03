import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";

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
  const { scopedTransactions, openCustomer360 } = useBusinessData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle={`${scopedTransactions.length} bills today across all departments`}
      />
      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-xs table-fixed">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline">
                <th className="pb-3 w-[120px] font-semibold">Txn ID</th>
                <th className="pb-3 w-[80px] font-semibold">Time</th>
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
              {scopedTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3 font-mono text-[11px] text-muted-foreground">{t.id}</td>
                  <td className="py-3">{t.time}</td>
                  <td className="py-3">
                    <button
                      onClick={() => openCustomer360(t.customerId)}
                      className="font-medium hover:text-primary transition-colors text-left hover:underline"
                    >
                      {t.customerName}
                    </button>
                  </td>
                  <td className="py-3 text-muted-foreground">{t.dept}</td>
                  <td className="py-3 text-right">{t.items.length}</td>
                  <td className="py-3 text-right text-muted-foreground">{fmtINR(t.discount)}</td>
                  <td className="py-3 text-right font-semibold pr-4">{fmtINR(t.total)}</td>
                  <td className="py-3 pl-4 font-medium text-foreground">{t.payment}</td>
                  <td className="py-3">
                    <StatusPill tone={t.status === "Completed" ? "success" : "warning"}>
                      {t.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
