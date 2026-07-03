import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { getPurchaseOrders, receivePurchaseOrder } from "@/lib/server-suppliers";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const { openProduct360, openSupplier360 } = useBusinessData();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const loadPOs = async () => {
    setLoading(true);
    try {
      const res = await getPurchaseOrders();
      setPurchaseOrders(res);
    } catch (e) {
      toast.error("Failed to load POs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOs();
  }, []);

  const handleReceive = async (dbId: string) => {
    if (!confirm("Are you sure you want to mark this PO as received? This will update inventory and create a Goods Receipt.")) return;
    setReceivingId(dbId);
    try {
      await receivePurchaseOrder({ data: { poId: dbId, receivedBy: "SYS_ADMIN" } });
      toast.success("PO received successfully! Inventory updated.");
      loadPOs();
    } catch (e: any) {
      toast.error(e.message || "Failed to receive PO");
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage inventory restock commitments and supplier deliveries."
      />

      <SectionCard title="All Purchase Orders">
        <div className="overflow-x-auto min-h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No purchase orders recorded yet.
            </div>
          ) : (
            <table className="w-full min-w-[950px] text-xs">
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
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {purchaseOrders.map((po) => (
                  <tr key={po.dbId} className="hover:bg-surface/50 transition-colors">
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
                      className="py-3 pl-4 text-muted-foreground truncate max-w-[150px]"
                      title={po.source}
                    >
                      {po.source}
                    </td>
                    <td className="py-3">
                      <StatusPill
                        tone={
                          po.status === "Received"
                            ? "success"
                            : po.status === "Sent" || po.status === "Ordered"
                              ? "warning"
                              : "info"
                        }
                      >
                        {po.status}
                      </StatusPill>
                    </td>
                    <td className="py-3 text-right">
                      {po.status !== "Received" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReceive(po.dbId)}
                          disabled={receivingId === po.dbId}
                          className="h-7 text-[10px] px-2 bg-surface hover:bg-success/20 hover:text-success hover:border-success"
                        >
                          {receivingId === po.dbId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" /> Receive
                            </>
                          )}
                        </Button>
                      )}
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
