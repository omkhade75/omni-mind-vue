import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { db, Product, Customer, Supplier, Transaction } from "@/lib/db";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { getCustomer360Server, type Customer360Profile } from "@/lib/server-customers";
import { getProduct360Server, type Product360Details } from "@/lib/server-products";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { initiateVapiCallServer } from "@/lib/server-vapi";
import { toast } from "sonner";
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
  Phone,
  Loader2,
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<Product360Details | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !open) {
      setProfile(null);
      return;
    }
    setLoading(true);
    getProduct360Server({
      data: {
        id: productId,
        role: user?.role || "owner",
        email: user?.email || "",
      }
    })
      .then((res) => {
        setProfile(res);
      })
      .catch((err) => {
        console.error("Error loading Product 360 profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId, open, user]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-sidebar border-l border-hairline text-foreground overflow-y-auto">
        {loading ? (
          <div className="h-full flex flex-col justify-center items-center py-20 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-xs text-muted-foreground animate-pulse">
              Assembling 360° Product Profile from database...
            </p>
          </div>
        ) : !profile ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Product details could not be found or access was restricted.
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4 border-b border-hairline">
              <div className="flex items-center gap-2 text-primary">
                <Package className="h-5 w-5" />
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Product 360 Profile
                </span>
              </div>
              <SheetTitle className="text-xl font-bold mt-1 text-foreground">{profile.name}</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                SKU: {profile.sku} | Barcode: {profile.barcode} | Dept: {profile.dept}
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Status Alert */}
              {profile.currentStock <= profile.reorder && (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3.5 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-warning">Stock Warning Alert</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Current inventory level ({profile.currentStock} {profile.unit}) is below the reorder threshold (
                      {profile.reorder} {profile.unit}).
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
                  <p className="text-lg font-bold mt-1 text-foreground">{profile.currentStock}</p>
                  <Badge
                    variant={profile.currentStock > profile.reorder ? "secondary" : "destructive"}
                    className="mt-1.5 text-[9px] py-0.5 font-semibold"
                  >
                    {profile.currentStock > profile.reorder ? "In Stock" : "Low Stock"}
                  </Badge>
                </div>
                <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Retail Price
                  </span>
                  <p className="text-lg font-bold mt-1 text-foreground">{fmtINR(profile.price)}</p>
                  <span className="text-[10px] text-muted-foreground">
                    Cost: {fmtINR(profile.cost)}
                  </span>
                </div>
                <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Gross Margin
                  </span>
                  <p className="text-lg font-bold mt-1 text-foreground">{profile.margin}%</p>
                  <span className="text-[10px] text-emerald-500 font-medium">
                    ₹{(profile.price - profile.cost).toFixed(0)} profit/unit
                  </span>
                </div>
              </div>

              {/* Stock By Location */}
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                  Stock distribution by Location
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {profile.stocksByLocation.map((item) => (
                    <div key={item.locationId} className="rounded-lg border border-hairline bg-surface p-3 flex justify-between">
                      <span className="text-muted-foreground">{item.locationName}</span>
                      <span className="font-bold">{item.quantity} {profile.unit}</span>
                    </div>
                  ))}
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
                    <span className="font-medium">{profile.brand}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{profile.category}</span>
                  </div>
                  {profile.supplier && (
                    <div className="flex justify-between p-3">
                      <span className="text-muted-foreground">Supplier Partner</span>
                      <span className="font-medium text-primary">
                        {profile.supplier.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Reorder Point</span>
                    <span className="font-medium">{profile.reorder} {profile.unit}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Expiry Risk Status</span>
                    <span className={cn("font-medium", profile.expiryRisk === "High" || profile.expiryRisk === "Expired" ? "text-destructive font-bold" : "text-success")}>
                      {profile.expiryRisk.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Batches */}
              {profile.batches.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                    Active Batches & Expiries
                  </h3>
                  <div className="space-y-2">
                    {profile.batches.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-lg border border-hairline bg-surface p-3 flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-semibold">{b.batchNumber}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Expires: {b.expiryDate || "N/A"} (Mfg: {b.mfgDate || "N/A"})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {b.remainingQty} / {b.receivedQty} units
                          </p>
                          <Badge
                            variant={
                              b.status === "Expired" || b.status === "expired"
                                ? "destructive"
                                : b.status === "Warning" || b.status === "expiring"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="mt-1 text-[9px] font-semibold"
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
                  Sales & Velocity (Last 30d)
                </h3>
                <div className="rounded-lg border border-hairline bg-surface p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Units Sold
                      </span>
                      <p className="text-lg font-bold mt-0.5 text-foreground">{profile.unitsSold30d} {profile.unit}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Revenue
                      </span>
                      <p className="text-lg font-bold mt-0.5 text-emerald-500">
                        {fmtINR(profile.revenue30d)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Profit Est.
                      </span>
                      <p className="text-lg font-bold mt-0.5 text-primary">
                        {fmtINR(profile.profit30d)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-hairline">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      AI Demand Reorder Recommendation
                    </span>
                    <p className="mt-1 leading-relaxed text-foreground/90">
                      {profile.reorderRecommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ledger Movements */}
              {profile.movements.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                    Recent Ledger Stock Movements
                  </h3>
                  <div className="space-y-1.5 text-xs max-h-40 overflow-y-auto border border-hairline rounded-lg p-2 bg-surface">
                    {profile.movements.map((m) => (
                      <div key={m.id} className="flex justify-between py-1 border-b border-hairline last:border-0">
                        <span className="text-muted-foreground">{m.occurredAt}</span>
                        <span className="font-semibold text-primary">{m.type}</span>
                        <span className="font-medium text-foreground">{m.quantity} {profile.unit}</span>
                        <span className="text-muted-foreground italic truncate max-w-[150px]">{m.reason || "N/A"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-hairline text-foreground"
                >
                  Close Profile
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};



export const Customer360Drawer: React.FC<DetailDrawerProps & { customerId: string | null }> = ({
  open,
  onOpenChange,
  customerId,
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Customer360Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [calling, setCalling] = useState(false);

  const handleCall = async () => {
    if (!profile || !profile.phone) {
      toast.error("Customer phone number is missing.");
      return;
    }
    setCalling(true);
    try {
      const res = await initiateVapiCallServer({
        data: {
          phoneNumber: profile.phone,
          recipientName: profile.name,
          role: "customer",
          messageContext: `Calling customer ${profile.name} to check on their recent shopping experience, offer loyalty discounts, and invite them back to GrandSquare Mall.`,
        }
      });
      if (res.success) {
        toast.success(`AI voice call triggered! Reference ID: ${res.callId}`);
      } else {
        toast.error(`Failed to trigger voice call: ${res.error}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to start voice call: " + err.message);
    } finally {
      setCalling(false);
    }
  };

  useEffect(() => {
    if (!customerId || !open) {
      setProfile(null);
      return;
    }
    setLoading(true);
    getCustomer360Server({
      data: {
        id: customerId,
        role: user?.role || "owner",
        email: user?.email || "",
      }
    })
      .then((res) => {
        setProfile(res);
      })
      .catch((err) => {
        console.error("Error loading Customer 360 profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [customerId, open, user]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-sidebar border-l border-hairline text-foreground overflow-y-auto">
        {loading ? (
          <div className="h-full flex flex-col justify-center items-center py-20 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-xs text-muted-foreground animate-pulse">
              Assembling 360° Customer Profile from database...
            </p>
          </div>
        ) : !profile ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Customer details could not be found or access was restricted.
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4 border-b border-hairline">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Customer 360 Intelligence
                </span>
              </div>
              <SheetTitle className="text-xl font-bold mt-1 text-foreground">
                {profile.name}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Customer Code: {profile.customerCode} | Joined: {profile.joined} | Status: <span className="font-semibold text-primary">{profile.status}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Segment and Risk */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-hairline bg-surface p-3.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Loyalty Tier
                  </span>
                  <p className="text-base font-bold mt-1 text-foreground">{profile.loyaltyTier}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Points: {profile.loyaltyPoints} · Pref Dept: {profile.preferredDept}
                  </span>
                </div>
                <div className="rounded-lg border border-hairline bg-surface p-3.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Churn Risk Score
                  </span>
                  <p className="text-base font-bold mt-1 text-foreground">{profile.churn}%</p>
                  <Badge
                    variant={
                      profile.churn > 50
                        ? "destructive"
                        : profile.churn > 25
                          ? "outline"
                          : "secondary"
                    }
                    className="mt-1 text-[9px]"
                  >
                    {profile.churnRisk}
                  </Badge>
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Total Visits
                  </span>
                  <p className="text-base font-bold mt-1 text-foreground">{profile.visits}</p>
                </div>
                <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Total Spend
                  </span>
                  <p className="text-base font-bold mt-1 text-foreground">{fmtINR(profile.spend)}</p>
                </div>
                <div className="rounded-lg border border-hairline bg-surface p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">AOV</span>
                  <p className="text-base font-bold mt-1 text-foreground">{fmtINR(profile.aov)}</p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="rounded-lg border border-hairline bg-surface p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email Address</span>
                  <span className="font-semibold">{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-semibold">{profile.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Visit Date</span>
                  <span className="font-semibold">{profile.lastVisit}</span>
                </div>
                {profile.notes && (
                  <div className="mt-2 pt-2 border-t border-hairline">
                    <span className="text-muted-foreground block mb-1">Profile Notes:</span>
                    <p className="text-foreground italic">{profile.notes}</p>
                  </div>
                )}
              </div>

              {/* Purchased Products */}
              {profile.recentProducts.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                    Top Purchased Products
                  </h3>
                  <div className="space-y-2">
                    {profile.recentProducts.map((p) => (
                      <div key={p.id} className="rounded-lg border border-hairline bg-surface p-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{p.brand} · ID: {p.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{p.qty} units</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Last: {p.lastPurchased}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment & Spending trends */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                    Payment Methods
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {profile.paymentPreferences.map((pref) => (
                      <div key={pref.method} className="rounded-md border border-hairline bg-surface p-2 flex justify-between">
                        <span className="text-muted-foreground">{pref.method}</span>
                        <span className="font-semibold">{pref.count}x ({fmtINR(pref.amount, { compact: true })})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                    Acquisition Period
                  </h3>
                  <div className="rounded-md border border-hairline bg-surface p-3 text-xs flex flex-col justify-center h-full">
                    <span className="text-muted-foreground">Joined Store:</span>
                    <span className="font-bold text-sm text-primary mt-1">{profile.joined}</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Acquired during GrandSquare Spring Promo campaign.</span>
                  </div>
                </div>
              </div>

              {/* CRM Insight */}
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-xs">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="uppercase tracking-wider text-[10px]">AI CRITICAL CRM OUTREACH DETAILS</span>
                </div>
                <p className="mt-2 text-foreground/90 leading-relaxed">
                  {profile.aiInsight}
                </p>
              </div>

              {/* Purchase History */}
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                  Recent Transaction Log
                </h3>
                {profile.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No transactions recorded for this customer.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profile.transactions.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-hairline bg-surface p-3 flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-semibold">{t.transactionNumber}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {t.date} | {t.itemCount} items · Method: {t.paymentMethod}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{fmtINR(t.totalAmount)}</p>
                          <Badge
                            variant={t.status === "Completed" || t.status === "Paid" ? "secondary" : "destructive"}
                            className="text-[8px] mt-1 py-0 px-1 font-semibold"
                          >
                            {t.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              {/* Outreach Actions */}
              <div className="pt-4 border-t border-hairline mt-4">
                <Button
                  onClick={handleCall}
                  disabled={calling}
                  className="w-full bg-violet hover:bg-violet/90 text-white font-semibold flex items-center justify-center gap-2 animate-pulse-subtle"
                >
                  {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  Call Customer with AI Voice Agent
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
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
  const [calling, setCalling] = useState(false);

  const handleCall = async () => {
    if (!supplier || !supplier.phone) {
      toast.error("Supplier phone number is missing.");
      return;
    }
    setCalling(true);
    try {
      const res = await initiateVapiCallServer({
        data: {
          phoneNumber: supplier.phone,
          recipientName: supplier.name,
          role: "supplier",
          messageContext: `Calling supplier ${supplier.name} to discuss stock reordering status, fulfillment rates, and delivery logistics for GrandSquare Mall.`,
        }
      });
      if (res.success) {
        toast.success(`AI voice call triggered! Reference ID: ${res.callId}`);
      } else {
        toast.error(`Failed to trigger voice call: ${res.error}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to start voice call: " + err.message);
    } finally {
      setCalling(false);
    }
  };

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

          {/* Actions */}
          <div className="pt-4 border-t border-hairline space-y-2">
            <Link to="/purchase-orders" onClick={() => onOpenChange(false)}>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2">
                <Package className="h-4 w-4" />
                Give Order / Create PO
              </Button>
            </Link>
            <Button
              onClick={handleCall}
              disabled={calling}
              className="w-full bg-violet hover:bg-violet/90 text-white font-semibold flex items-center justify-center gap-2"
            >
              {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              Call Supplier with AI Voice Agent
            </Button>
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
