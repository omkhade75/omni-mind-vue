import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { getPurchaseOrders, receivePurchaseOrderGoodsServer, updatePurchaseOrderStatusServer, createPurchaseOrder, getSuppliers } from "@/lib/server-suppliers";
import { getProductsServer } from "@/lib/server-products";
import { toast } from "sonner";
import { Loader2, Check, Plus, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/purchase-orders")({
  validateSearch: (search: Record<string, unknown>): { supplier?: string } => {
    return {
      supplier: search.supplier as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Purchase Orders — OmniMind AI" },
      { name: "description", content: "Open purchase orders, delivery status, and supplier commitments." },
    ],
  }),
  component: PurchaseOrders,
});

function PurchaseOrders() {
  const { openProduct360, openSupplier360 } = useBusinessData();
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // PO Creation State
  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selSupplier, setSelSupplier] = useState<string>("");
  const [poItems, setPoItems] = useState<Array<{productId: string, quantity: number, unitCost: number}>>([]);
  const [poNotes, setPoNotes] = useState("");
  const [savingPo, setSavingPo] = useState(false);

  // Receiving State
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState<any>(null);
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getPurchaseOrders();
      setPurchaseOrders(res);
      if (user) {
        const supps = await getSuppliers();
        setSuppliers(supps);
        const prods = await getProductsServer({ data: { role: user.role, email: user.email } });
        setProducts(prods);
      }
    } catch (e) {
      toast.error("Failed to load PO data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const search = Route.useSearch();
  useEffect(() => {
    if (search.supplier && suppliers.length > 0) {
      setSelSupplier(search.supplier);
      setCreateOpen(true);
    }
  }, [search.supplier, suppliers.length]);

  const handleUpdateStatus = async (dbId: string, status: string) => {
    if (!user) return;
    try {
      await updatePurchaseOrderStatusServer({ data: { poId: dbId, status, role: user.role, emailUser: user.email } });
      toast.success(`PO status updated to ${status}`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const openCreatePO = () => {
    setSelSupplier("");
    setPoItems([]);
    setPoNotes("");
    setCreateOpen(true);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selSupplier) return toast.error("Select a supplier");
    if (poItems.length === 0) return toast.error("Add at least one item");
    
    setSavingPo(true);
    try {
      await createPurchaseOrder({
        data: {
          supplierId: selSupplier,
          notes: poNotes,
          createdBy: user.email,
          status: "Draft",
          items: poItems,
        }
      });
      toast.success("Purchase Order Draft Created");
      setCreateOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to create PO");
    } finally {
      setSavingPo(false);
    }
  };

  const openReceiveModal = (po: any) => {
    // Need full PO details with items. Since getPurchaseOrders returns summary, 
    // we should fetch full details or use a server fn. For now, since the items are embedded in getPurchaseOrders
    // Wait, getPurchaseOrders didn't return all item details, only summaries. 
    // We can fetch from server using getPurchaseOrderDetailsServer.
    setReceivingPo(po);
    // Fetch full details
    import("@/lib/server-suppliers").then(m => {
      m.getPurchaseOrderDetailsServer({ data: { poId: po.dbId } }).then(fullPo => {
        setReceivingPo(fullPo);
        const initialReceive: Record<string, number> = {};
        fullPo?.items.forEach((i: any) => {
          initialReceive[i.id] = Math.max(0, i.quantity - i.receivedQuantity);
        });
        setReceiveItems(initialReceive);
        setReceiveOpen(true);
      });
    });
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !receivingPo) return;
    
    const itemsToReceive = Object.keys(receiveItems).map(itemId => {
      const qty = receiveItems[itemId];
      const poItem = receivingPo.items.find((i: any) => i.id === itemId);
      return {
        itemId,
        productId: poItem.productId,
        quantity: qty
      };
    }).filter(i => i.quantity > 0);

    if (itemsToReceive.length === 0) return toast.error("No items to receive");

    setReceiving(true);
    try {
      await receivePurchaseOrderGoodsServer({
        data: {
          poId: receivingPo.id,
          receivedByEmail: user.email,
          role: user.role,
          itemsToReceive
        }
      });
      toast.success("Goods received successfully");
      setReceiveOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to receive goods");
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Purchase Orders"
          subtitle="Manage inventory restock commitments and supplier deliveries."
        />
        {(user?.role === "owner" || user?.role === "admin" || user?.role === "manager") && (
          <Button
            onClick={openCreatePO}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create PO
          </Button>
        )}
      </div>

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
                  <th className="pb-3 text-right font-semibold">Received / Qty</th>
                  <th className="pb-3 text-right font-semibold">Total Cost</th>
                  <th className="pb-3 font-semibold pl-4">Status</th>
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
                    <td className="py-3 text-right font-semibold">
                      <span className={po.receivedQuantity >= po.quantity ? "text-success" : po.receivedQuantity > 0 ? "text-warning" : "text-muted-foreground"}>
                        {po.receivedQuantity}
                      </span>
                      {" / "}{po.quantity}
                    </td>
                    <td className="py-3 text-right font-bold text-foreground">
                      {fmtINR(po.totalCost)}
                    </td>
                    <td className="py-3 pl-4">
                      <StatusPill
                        tone={
                          po.status === "Received" ? "success"
                          : po.status === "Partially_Received" ? "info"
                          : po.status === "Ordered" || po.status === "Sent" ? "warning"
                          : "default"
                        }
                      >
                        {po.status}
                      </StatusPill>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {po.status === "Draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(po.dbId, "Submitted")} className="h-7 text-[10px] px-2">Submit</Button>
                      )}
                      {po.status === "Submitted" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(po.dbId, "Ordered")} className="h-7 text-[10px] px-2 bg-primary/10 text-primary">Order</Button>
                      )}
                      {(po.status === "Ordered" || po.status === "Partially_Received" || po.status === "Sent") && (
                        <Button size="sm" variant="outline" onClick={() => openReceiveModal(po)} className="h-7 text-[10px] px-2 bg-success/10 text-success border-success/30 hover:bg-success/20">
                          Receive Goods
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

      {/* Create PO Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[600px] bg-sidebar border border-hairline text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePO} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={selSupplier || undefined} onValueChange={setSelSupplier} required>
                <SelectTrigger className="bg-surface border-hairline">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-hairline max-h-48">
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.supplierCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Line Items *</Label>
              <div className="border border-hairline rounded-md p-2 space-y-2 bg-surface/30">
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select 
                      value={item.productId || undefined} 
                      onValueChange={(val) => {
                        const newItems = [...poItems];
                        newItems[idx].productId = val;
                        const prod = products.find(p => p.id === val);
                        if (prod) newItems[idx].unitCost = Number(prod.cost) || 0;
                        setPoItems(newItems);
                      }}
                    >
                      <SelectTrigger className="bg-surface border-hairline flex-1 h-8 text-xs">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-hairline max-h-48">
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {fmtINR(p.cost)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      placeholder="Qty" 
                      className="w-20 h-8 text-xs bg-surface border-hairline" 
                      value={item.quantity} 
                      onChange={e => {
                        const newItems = [...poItems];
                        newItems[idx].quantity = Number(e.target.value);
                        setPoItems(newItems);
                      }}
                    />
                    <Input 
                      type="number" 
                      placeholder="Cost" 
                      className="w-24 h-8 text-xs bg-surface border-hairline" 
                      value={item.unitCost} 
                      onChange={e => {
                        const newItems = [...poItems];
                        newItems[idx].unitCost = Number(e.target.value);
                        setPoItems(newItems);
                      }}
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-hairline" onClick={() => setPoItems([...poItems, { productId: "", quantity: 1, unitCost: 0 }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Product
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                className="bg-surface border-hairline"
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>

            <div className="text-right text-sm font-semibold">
              Subtotal: {fmtINR(poItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0))}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingPo} className="bg-primary text-primary-foreground font-semibold">
                {savingPo && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create Draft PO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Goods Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="sm:max-w-[500px] bg-sidebar border border-hairline text-foreground">
          <DialogHeader>
            <DialogTitle>Receive Goods: {receivingPo?.poNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceiveGoods} className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-hairline">
                    <th className="pb-1">Product</th>
                    <th className="pb-1 text-right">Ordered</th>
                    <th className="pb-1 text-right">Rcvd</th>
                    <th className="pb-1 text-right">Now Receiving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {receivingPo?.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-2 font-medium truncate max-w-[200px]">{item.product.name}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right text-success font-semibold">{item.receivedQuantity}</td>
                      <td className="py-2 text-right">
                        <Input 
                          type="number" 
                          max={item.quantity - item.receivedQuantity} 
                          min={0}
                          className="w-20 h-7 text-xs bg-surface border-hairline ml-auto text-right" 
                          value={receiveItems[item.id] ?? 0}
                          onChange={(e) => setReceiveItems({...receiveItems, [item.id]: Number(e.target.value)})}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setReceiveOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={receiving} className="bg-success hover:bg-success/90 text-success-foreground font-semibold">
                {receiving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
