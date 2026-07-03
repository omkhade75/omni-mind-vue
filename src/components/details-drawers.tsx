import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { db, Product, Customer, Supplier, Transaction } from "@/lib/db";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Package,
  Users,
  Truck,
  AlertTriangle,
  FileText,
  ShoppingCart,
  DollarSign,
  Calendar,
  Clock,
  Star,
} from "lucide-react";

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Product360Drawer: React.FC<DetailDrawerProps & { productId: string | null }> = ({
  open,
  onOpenChange,
  productId,
}) => {
  const { products, transactions, addPurchaseOrder } = useBusinessData();
  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  // Filter transactions containing this product
  const prodTransactions = transactions.filter((t) =>
    t.items.some((item) => item.productId === productId),
  );

  const batches = db.getProductBatches(product.id);
  const margin = Math.round(((product.price - product.cost) / product.price) * 100);

  const handleQuickReorder = () => {
    addPurchaseOrder({
      productId: product.id,
      productName: product.name,
      supplierId: "SUP-001", // Default Amul or first supplier
      supplierName: product.supplier,
      quantity: product.reorder,
      unitCost: product.cost,
      totalCost: product.reorder * product.cost,
      status: "Draft",
      source: "Product 360 Quick Reorder",
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-sidebar border-l border-hairline text-foreground overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-hairline">
          <div className="flex items-center gap-2 text-primary">
            <Package className="h-5 w-5" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              Product 360 Profile
            </span>
          </div>
          <SheetTitle className="text-xl font-bold mt-1 text-foreground">{product.name}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            SKU: {product.id} | Department: {product.dept}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status Alert */}
          {product.stock <= product.reorder && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-warning">Stock Warning Alert</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current inventory level ({product.stock} units) is below the reorder threshold (
                  {product.reorder} units). Suggested order volume: {product.reorder} units.
                </p>
              </div>
            </div>
          )}

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Stock Level
              </span>
              <p className="text-lg font-bold mt-1 text-foreground">{product.stock}</p>
              <Badge
                variant={product.stock > product.reorder ? "secondary" : "destructive"}
                className="mt-1.5 text-[9px] py-0.5"
              >
                {product.stock > product.reorder ? "In Stock" : "Low Stock"}
              </Badge>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Retail Price
              </span>
              <p className="text-lg font-bold mt-1 text-foreground">{fmtINR(product.price)}</p>
              <span className="text-[10px] text-muted-foreground">
                Cost: {fmtINR(product.cost)}
              </span>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Gross Margin
              </span>
              <p className="text-lg font-bold mt-1 text-foreground">{margin}%</p>
              <span className="text-[10px] text-emerald-500 font-medium">
                ₹{product.price - product.cost} profit/unit
              </span>
            </div>
          </div>

          {/* Details */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Specifications & Supplier
            </h3>
            <div className="rounded-lg border border-hairline bg-surface divide-y divide-hairline text-sm">
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{product.brand}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{product.category}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Supplier Partner</span>
                <span className="font-medium text-primary hover:underline cursor-pointer">
                  {product.supplier}
                </span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Reorder Point</span>
                <span className="font-medium">{product.reorder} units</span>
              </div>
            </div>
          </div>

          {/* Batches */}
          {batches.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                Active Batches & Expiries
              </h3>
              <div className="space-y-2">
                {batches.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-hairline bg-surface p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-semibold">{b.batchNumber}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Expires: {b.expiryDate} (Mfg: {b.mfgDate})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">
                        {b.remainingQty} / {b.quantity} units
                      </p>
                      <Badge
                        variant={
                          b.status === "expired"
                            ? "destructive"
                            : b.status === "expiring"
                              ? "destructive"
                              : "secondary"
                        }
                        className="mt-1 text-[9px]"
                      >
                        {b.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales History */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Sales & Velocity
            </h3>
            <div className="rounded-lg border border-hairline bg-surface p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Total Sold
                  </span>
                  <p className="text-xl font-bold mt-0.5 text-foreground">{product.sold} units</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Total Revenue Generated
                  </span>
                  <p className="text-xl font-bold mt-0.5 text-emerald-500">
                    {fmtINR(product.revenue)}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-hairline">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Recent Sales Activity ({prodTransactions.length} orders)
                </span>
                {prodTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    No sales recorded on this snapshot range.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                    {prodTransactions.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="flex justify-between text-xs py-1 border-b border-hairline/40"
                      >
                        <span className="text-muted-foreground">
                          {t.date} {t.time}
                        </span>
                        <span className="font-semibold">
                          {t.customerName} (x
                          {t.items.find((i) => i.productId === productId)?.quantity})
                        </span>
                        <span className="font-bold">{fmtINR(t.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-2">
            <Button
              onClick={handleQuickReorder}
              className="flex-1 gradient-primary text-primary-foreground font-semibold"
            >
              Create Purchase Order
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-hairline text-foreground"
            >
              Close Profile
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const Customer360Drawer: React.FC<DetailDrawerProps & { customerId: string | null }> = ({
  open,
  onOpenChange,
  customerId,
}) => {
  const { customers, transactions } = useBusinessData();
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return null;

  // Filter transactions for this customer
  const customerTransactions = transactions.filter((t) => t.customerId === customerId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-sidebar border-l border-hairline text-foreground overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-hairline">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              Customer 360 Intelligence
            </span>
          </div>
          <SheetTitle className="text-xl font-bold mt-1 text-foreground">
            {customer.name}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            ID: {customer.id} | Joined: {customer.joined}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Segment and Risk */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-hairline bg-surface p-3.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Customer Segment
              </span>
              <p className="text-base font-bold mt-1 text-foreground">{customer.segment}</p>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Favorite Dept: {customer.favDept}
              </span>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-3.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Churn Risk
              </span>
              <p className="text-base font-bold mt-1 text-foreground">{customer.churn}%</p>
              <Badge
                variant={
                  customer.churn > 50
                    ? "destructive"
                    : customer.churn > 25
                      ? "outline"
                      : "secondary"
                }
                className="mt-1 text-[9px]"
              >
                {customer.churn > 50 ? "At Risk" : customer.churn > 25 ? "Caution" : "Stable"}
              </Badge>
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Total Visits
              </span>
              <p className="text-base font-bold mt-1 text-foreground">{customer.visits}</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Total Spend
              </span>
              <p className="text-base font-bold mt-1 text-foreground">{fmtINR(customer.spend)}</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">AOV</span>
              <p className="text-base font-bold mt-1 text-foreground">{fmtINR(customer.aov)}</p>
            </div>
          </div>

          {/* Behavior Profile */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Behavior Intelligence
            </h3>
            <div className="rounded-lg border border-hairline bg-surface p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preferred Dept</span>
                <span className="font-medium">{customer.favDept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Visit Date</span>
                <span className="font-medium">{customer.lastVisit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loyalty Status</span>
                <span className="font-medium text-emerald-500">Active</span>
              </div>
            </div>
          </div>

          {/* Purchase History */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Recent Purchase History
            </h3>
            {customerTransactions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No recent transactions recorded for this customer.
              </p>
            ) : (
              <div className="space-y-2">
                {customerTransactions.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-hairline bg-surface p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-semibold">{t.id}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t.date} {t.time} | {t.items.length} items ({t.dept})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{fmtINR(t.total)}</p>
                      <Badge
                        variant={t.status === "Completed" ? "secondary" : "destructive"}
                        className="text-[8px] mt-1 py-0 px-1"
                      >
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const Supplier360Drawer: React.FC<DetailDrawerProps & { supplierId: string | null }> = ({
  open,
  onOpenChange,
  supplierId,
}) => {
  const { suppliers, purchaseOrders } = useBusinessData();
  const supplier = suppliers.find((s) => s.id === supplierId);
  if (!supplier) return null;

  // Filter purchase orders from this supplier
  const activePOs = purchaseOrders.filter((po) => po.supplierId === supplierId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-sidebar border-l border-hairline text-foreground overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-hairline">
          <div className="flex items-center gap-2 text-primary">
            <Truck className="h-5 w-5" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              Supplier Intelligence Profile
            </span>
          </div>
          <SheetTitle className="text-xl font-bold mt-1 text-foreground">
            {supplier.name}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Supplier ID: {supplier.id} | Contact: {supplier.contact}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Reliability Score
              </span>
              <p className="text-lg font-bold mt-1 text-primary">{supplier.score} / 100</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                On-Time Delivery
              </span>
              <p className="text-lg font-bold mt-1 text-foreground">{supplier.onTime}%</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Quality Score
              </span>
              <p className="text-lg font-bold mt-1 text-foreground">{supplier.quality}%</p>
            </div>
          </div>

          {/* Score Explanation */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              AI Score Breakdown
            </h3>
            <div className="rounded-lg border border-hairline bg-surface p-4 space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">On-Time Delivery (35% weight)</span>
                  <span className="font-semibold">{supplier.onTime}%</span>
                </div>
                <div className="w-full bg-hairline rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${supplier.onTime}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">
                    Product Quality & Damage Rate (25% weight)
                  </span>
                  <span className="font-semibold">{supplier.quality}%</span>
                </div>
                <div className="w-full bg-hairline rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${supplier.quality}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Lead Time Consistency (20% weight)</span>
                  <span className="font-semibold">92%</span>
                </div>
                <div className="w-full bg-hairline rounded-full h-1.5">
                  <div className="bg-violet h-1.5 rounded-full" style={{ width: `92%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Price Competitiveness (20% weight)</span>
                  <span className="font-semibold">88%</span>
                </div>
                <div className="w-full bg-hairline rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `88%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Details */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Supplier Summary
            </h3>
            <div className="rounded-lg border border-hairline bg-surface p-3 text-sm divide-y divide-hairline">
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold">{supplier.category}</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Average Lead Time</span>
                <span className="font-semibold">{supplier.lead} days</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Total Spend</span>
                <span className="font-semibold text-emerald-500">{fmtINR(supplier.spend)}</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Outstanding Balances</span>
                <span className="font-semibold text-warning">{fmtINR(supplier.pending)}</span>
              </div>
            </div>
          </div>

          {/* Active Purchase Orders */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Active Purchase Orders ({activePOs.length})
            </h3>
            {activePOs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active purchase orders created yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activePOs.map((po) => (
                  <div
                    key={po.id}
                    className="rounded-lg border border-hairline bg-surface p-3 flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-semibold">
                        {po.id} | {po.productName}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Quantity: {po.quantity} units | Created: {po.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{fmtINR(po.totalCost)}</p>
                      <Badge variant="secondary" className="mt-1 text-[9px] py-0 px-1.5">
                        {po.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const RecommendationInvestigateDrawer: React.FC<
  DetailDrawerProps & { recId: string | null }
> = ({ open, onOpenChange, recId }) => {
  const { recommendations, acceptRecommendation, rejectRecommendation } = useBusinessData();
  const rec = recommendations.find((r) => r.id === recId);
  if (!rec) return null;

  const handleAccept = () => {
    acceptRecommendation(rec.id);
    onOpenChange(false);
  };

  const handleReject = () => {
    rejectRecommendation(rec.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-sidebar border-l border-hairline text-foreground overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-hairline">
          <div className="flex items-center gap-2 text-primary">
            <Star className="h-5 w-5 fill-primary/10" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              AI Recommendation Audit
            </span>
          </div>
          <SheetTitle className="text-xl font-bold mt-1 text-foreground">{rec.title}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            ID: {rec.id} | Department: {rec.dept} | Confidence: {rec.confidence}%
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Severity & Impact Banner */}
          <div className="rounded-lg border border-primary/20 bg-primary/8 p-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Projected Impact
              </span>
              <p className="text-lg font-bold text-emerald-500 mt-0.5">{rec.impact}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                AI Priority Level
              </span>
              <p className="text-sm font-bold mt-0.5 text-primary">{rec.severity.toUpperCase()}</p>
            </div>
          </div>

          {/* Core Explanation */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2.5">
              Why AI Flagged This
            </h3>
            <div className="rounded-lg border border-hairline bg-surface p-4 text-sm leading-relaxed text-foreground/90">
              {rec.explanation}
            </div>
          </div>

          {/* Evidence Data */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2.5">
              Supporting Evidence
            </h3>
            <div className="rounded-lg border border-hairline bg-surface p-4 flex gap-3.5 items-start">
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-foreground">Statistical Evidence</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.evidence}</p>
              </div>
            </div>
          </div>

          {/* Actionable recommendation */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2.5">
              Proposed Action Workflow
            </h3>
            <div className="rounded-lg border border-hairline bg-surface p-4 flex gap-3.5 items-start">
              <Clock className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-foreground">Recommended Resolution</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {rec.suggestedAction}
                </p>
              </div>
            </div>
          </div>

          {/* Consequences of inaction */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2.5">
              Predicted Consequence of Inaction
            </h3>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex gap-3.5 items-start">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-destructive">Inaction Penalty</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {rec.id === "REC-01"
                    ? "Inability to fulfill customer demand starting Thursday evening, leading to estimated direct revenue loss of ₹16.3K, and drop in customer satisfaction score for dairy category."
                    : rec.id === "REC-04"
                      ? "Loss of full cost value (₹1,764 cost price) for 42 units of yogurt which must be thrown out after May 7 expiry. Zero recovery value."
                      : "Failure to optimize target KPI, leading to operational friction and missed savings."}
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">Current Status</span>
            <Badge
              variant={
                rec.status === "Accepted"
                  ? "secondary"
                  : rec.status === "Rejected"
                    ? "destructive"
                    : "outline"
              }
              className="text-xs py-0.5 px-2"
            >
              {rec.status.toUpperCase()}
            </Badge>
          </div>

          {/* Actions */}
          {rec.status === "New" || rec.status === "Investigating" ? (
            <div className="pt-4 flex gap-2">
              <Button
                onClick={handleAccept}
                className="flex-1 gradient-primary text-primary-foreground font-semibold"
              >
                Accept & Execute
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                className="flex-1 border-hairline text-destructive hover:bg-destructive/10"
              >
                Reject
              </Button>
            </div>
          ) : (
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full border-hairline text-foreground"
              >
                Close Audit Panel
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
