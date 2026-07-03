import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/purchase-orders")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — OmniMind AI" },
      {
        name: "description",
        content: "Open purchase orders, delivery status, and supplier commitments.",
      },
    ],
  }),
  component: PurchaseOrders,
});

function PurchaseOrders() {
  const { purchaseOrders, openProduct360, openSupplier360 } = useBusinessData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage inventory restock commitments and supplier deliveries."
      />

      <SectionCard title="All Purchase Orders">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
                <th className="pb-3 font-semibold">PO ID</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Supplier</th>
                <th className="pb-3 text-right font-semibold">Quantity</th>
                <th className="pb-3 text-right font-semibold">Total Cost</th>
                <th className="pb-3 font-semibold pl-4">Source</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No purchase orders recorded yet. Approve inventory recommendations to create PO
                    drafts.
                  </td>
                </tr>
              ) : (
                [...purchaseOrders].reverse().map((po) => (
                  <tr key={po.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 font-mono text-[11px] text-muted-foreground">{po.id}</td>
                    <td className="py-3">{po.date}</td>
                    <td className="py-3">
                      <button
                        onClick={() => openProduct360(po.productId)}
                        className="font-medium hover:text-primary transition-colors hover:underline text-left"
                      >
                        {po.productName}
                      </button>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => openSupplier360(po.supplierId)}
                        className="font-medium hover:text-primary transition-colors hover:underline text-left text-muted-foreground"
                      >
                        {po.supplierName}
                      </button>
                    </td>
                    <td className="py-3 text-right font-semibold">{po.quantity} units</td>
                    <td className="py-3 text-right font-bold text-foreground">
                      {fmtINR(po.totalCost)}
                    </td>
                    <td
                      className="py-3 pl-4 text-muted-foreground truncate max-w-[200px]"
                      title={po.source}
                    >
                      {po.source}
                    </td>
                    <td className="py-3">
                      <StatusPill
                        tone={
                          po.status === "Received"
                            ? "success"
                            : po.status === "Sent"
                              ? "warning"
                              : "info"
                        }
                      >
                        {po.status}
                      </StatusPill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
