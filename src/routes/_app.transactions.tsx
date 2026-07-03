import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { TRANSACTIONS, fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/transactions" as never)({
  head: () => ({
    meta: [
      { title: "Transactions — OmniMind AI" },
      { name: "description", content: "All mall transactions with filters and drill-down." },
    ],
  }),
  component: Transactions,
});

function Transactions() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" subtitle={`${TRANSACTIONS.length} bills today across all departments`} />
      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 font-medium">Txn ID</th>
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Department</th>
                <th className="pb-2 text-right font-medium">Items</th>
                <th className="pb-2 text-right font-medium">Discount</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {TRANSACTIONS.map((t) => (
                <tr key={t.id} className="hover:bg-surface-2/40">
                  <td className="py-2.5 font-mono text-[11px] text-muted-foreground">{t.id}</td>
                  <td className="py-2.5">{t.time}</td>
                  <td className="py-2.5">{t.customer}</td>
                  <td className="py-2.5 text-muted-foreground">{t.dept}</td>
                  <td className="py-2.5 text-right">{t.items}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{fmtINR(t.discount)}</td>
                  <td className="py-2.5 text-right font-semibold">{fmtINR(t.amount)}</td>
                  <td className="py-2.5">{t.payment}</td>
                  <td className="py-2.5">
                    <StatusPill tone={t.status === "Completed" ? "success" : "warning"}>{t.status}</StatusPill>
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
