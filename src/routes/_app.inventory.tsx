import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  ArrowLeftRight,
  History,
  Plus,
  Minus,
  Settings,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getInventoryStockServer,
  mutateInventoryServer,
  getInventoryMovementsServer,
  type StockListItem,
  type MovementHistoryItem,
} from "@/lib/server-inventory";
import { getProductsServer, type ProductListItem } from "@/lib/server-products";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Inventory value, low stock, stockouts, overstock, and predicted risk.",
      },
    ],
  }),
  component: Inventory,
});

function Inventory() {
  const { openProduct360 } = useBusinessData();
  const { user } = useAuth();

  // Stock and movement states
  const [stockList, setStockList] = useState<StockListItem[]>([]);
  const [productList, setProductList] = useState<ProductListItem[]>([]);
  const [movements, setMovements] = useState<MovementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog forms state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mutationType, setMutationType] = useState<"ADD" | "REMOVE" | "TRANSFER" | "ADJUST">("ADD");
  const [saving, setSaving] = useState(false);

  // Form values
  const [formProductId, setFormProductId] = useState("");
  const [formLocationId, setFormLocationId] = useState("loc-warehouse");
  const [formTargetLocationId, setFormTargetLocationId] = useState("loc-retail");
  const [formQty, setFormQty] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formMovementSubtype, setFormMovementSubtype] = useState<
    "PURCHASE_RECEIPT" | "RETURN" | "DAMAGE" | "EXPIRED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"
  >("PURCHASE_RECEIPT");

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const payload = {
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
        },
      };
      const stocks = await getInventoryStockServer(payload);
      const prods = await getProductsServer(payload);
      const mvs = await getInventoryMovementsServer(payload);

      setStockList(stocks);
      setProductList(prods);
      setMovements(mvs);

      if (prods.length > 0) {
        setFormProductId(prods[0].id);
      }
    } catch (e) {
      toast.error("Failed to load inventory data from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, [user]);

  const handleInventoryMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId || !formQty) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      let movementType: any = "PURCHASE_RECEIPT";
      if (mutationType === "TRANSFER") {
        movementType = "TRANSFER";
      } else if (mutationType === "ADD") {
        movementType = formMovementSubtype; // PURCHASE_RECEIPT, RETURN, ADJUSTMENT_IN
      } else if (mutationType === "REMOVE") {
        movementType = formMovementSubtype; // DAMAGE, EXPIRED, ADJUSTMENT_OUT
      } else if (mutationType === "ADJUST") {
        movementType = formMovementSubtype;
      }

      await mutateInventoryServer({
        data: {
          productId: formProductId,
          locationId: formLocationId,
          targetLocationId: mutationType === "TRANSFER" ? formTargetLocationId : undefined,
          movementType,
          quantity: Number(formQty),
          reason: formReason || undefined,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        },
      });

      toast.success("Inventory ledger updated successfully.");
      setDialogOpen(false);
      setFormQty("");
      setFormReason("");
      loadInventoryData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update inventory.");
    } finally {
      setSaving(false);
    }
  };

  const openMutationDialog = (type: "ADD" | "REMOVE" | "TRANSFER" | "ADJUST") => {
    setMutationType(type);
    setFormLocationId(type === "TRANSFER" ? "loc-warehouse" : "loc-warehouse");
    setFormTargetLocationId(type === "TRANSFER" ? "loc-retail" : "loc-retail");

    // set default subtypes
    if (type === "ADD") setFormMovementSubtype("PURCHASE_RECEIPT");
    else if (type === "REMOVE") setFormMovementSubtype("DAMAGE");
    else if (type === "ADJUST") setFormMovementSubtype("ADJUSTMENT_IN");

    setDialogOpen(true);
  };

  // KPIs
  const totalSKUs = stockList.length;
  // Calculate average cost fallback if cost missing
  const totalValue = stockList.reduce((sum, s) => {
    const prod = productList.find((p) => p.id === s.productId);
    const cost = prod ? prod.cost : 100;
    return sum + s.totalQty * cost;
  }, 0);

  const lowStockProducts = stockList.filter((s) => s.status === "Low Stock");
  const stockoutProducts = stockList.filter((s) => s.status === "Stockout");
  const overstockProducts = stockList.filter((s) => s.totalQty > s.reorderLevel * 2.5);

  // Group by department
  const depts = [
    "Fashion",
    "Electronics",
    "Grocery",
    "Beauty & Cosmetics",
    "Sports & Outdoors",
    "Others",
  ];
  const deptData = depts.map((d) => {
    const value = stockList
      .filter((s) => s.dept === d)
      .reduce((sum, s) => {
        const prod = productList.find((p) => p.id === s.productId);
        const cost = prod ? prod.cost : 100;
        return sum + s.totalQty * cost;
      }, 0);
    return { name: d.split(" ")[0], v: value };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Inventory Intelligence"
          subtitle="Real-time stock across every SKU with predictive stockout and ledger control."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => openMutationDialog("ADD")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Stock In
          </Button>
          <Button
            size="sm"
            onClick={() => openMutationDialog("REMOVE")}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
          >
            <Minus className="h-3.5 w-3.5" /> Stock Out
          </Button>
          <Button
            size="sm"
            onClick={() => openMutationDialog("TRANSFER")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openMutationDialog("ADJUST")}
            className="border-hairline bg-surface text-foreground font-semibold flex items-center gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" /> Adjust
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Total SKUs" v={fmtNum(totalSKUs)} />
        <Kpi label="Inventory Value" v={fmtINR(totalValue, { compact: true })} />
        <Kpi
          label="Low Stock SKUs"
          v={fmtNum(lowStockProducts.length)}
          tone={lowStockProducts.length > 0 ? "warning" : undefined}
        />
        <Kpi
          label="Stockouts"
          v={fmtNum(stockoutProducts.length)}
          tone={stockoutProducts.length > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Overstock SKUs"
          v={fmtNum(overstockProducts.length)}
          tone={overstockProducts.length > 0 ? "warning" : undefined}
        />
        <Kpi label="Wastage Estimate" v={fmtINR(totalValue * 0.004)} tone="danger" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-surface border border-hairline w-full justify-start p-1 h-auto mb-4">
          <TabsTrigger value="overview" className="text-xs py-1.5 px-3">
            Overview Analytics
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs py-1.5 px-3 flex items-center gap-1">
            <History className="h-3 w-3" /> Stock Movement Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard title="Inventory Value by Department" className="lg:col-span-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData}>
                    <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: any) => `₹${Number(v) / 100000}L`}
                      width={44}
                      style={{ fontSize: 10 }}
                    />
                    <Tooltip contentStyle={ttStyle} formatter={(v: any) => fmtINR(Number(v))} />
                    <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Movement Velocity Profile">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Fast moving",
                          v:
                            stockList.filter((s) => s.stockoutRiskDays && s.stockoutRiskDays < 15)
                              .length + 2,
                        },
                        {
                          name: "Moderate",
                          v:
                            stockList.filter(
                              (s) =>
                                s.stockoutRiskDays &&
                                s.stockoutRiskDays >= 15 &&
                                s.stockoutRiskDays < 45,
                            ).length + 4,
                        },
                        { name: "Slow", v: overstockProducts.length + 1 },
                        { name: "Dead", v: stockoutProducts.length + 1 },
                      ]}
                      dataKey="v"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={86}
                      paddingAngle={2}
                      stroke="var(--color-background)"
                      strokeWidth={2}
                    >
                      {[0, 1, 2, 3].map((i) => (
                        <Cell key={i} fill={`var(--chart-${i + 1})`} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={ttStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="AI Stockout Risk"
              subtitle="Products likely to run out soon based on velocity"
            >
              <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {lowStockProducts.length + stockoutProducts.length} products flagged at risk
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Estimated revenue at risk: {fmtINR(totalValue * 0.08)}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {lowStockProducts.slice(0, 5).map((r) => (
                  <li
                    key={r.productId}
                    className="flex items-center gap-2 rounded-md border border-hairline bg-surface p-2 hover:border-primary/45 cursor-pointer transition-colors"
                    onClick={() => openProduct360(r.productId)}
                  >
                    <Package className="h-4 w-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.totalQty} units left · reorder trigger: {r.reorderLevel} · Est:{" "}
                        {r.stockoutRiskDays || "N/A"} days out
                      </p>
                    </div>
                    <StatusPill tone="warning">low stock</StatusPill>
                  </li>
                ))}
                {stockoutProducts.slice(0, 5).map((r) => (
                  <li
                    key={r.productId}
                    className="flex items-center gap-2 rounded-md border border-hairline bg-surface p-2 hover:border-primary/45 cursor-pointer transition-colors"
                    onClick={() => openProduct360(r.productId)}
                  >
                    <Package className="h-4 w-4 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        0 units remaining · reorder trigger: {r.reorderLevel}
                      </p>
                    </div>
                    <StatusPill tone="danger">stockout</StatusPill>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="Overstock & Slow Moving"
              subtitle="Capital locked in low-velocity SKUs"
            >
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/8 p-3">
                <TrendingDown className="h-8 w-8 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {fmtINR(
                      overstockProducts.reduce((sum, s) => {
                        const prod = productList.find((p) => p.id === s.productId);
                        const cost = prod ? prod.cost : 100;
                        return sum + s.totalQty * cost;
                      }, 0),
                      { compact: true },
                    )}{" "}
                    capital in slow-moving inventory
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {overstockProducts.length} SKUs turning slowly
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {overstockProducts.slice(0, 8).map((o) => {
                  const prod = productList.find((p) => p.id === o.productId);
                  const cost = prod ? prod.cost : 100;
                  return (
                    <li
                      key={o.productId}
                      className="flex items-center justify-between rounded-md border border-hairline bg-surface p-2 hover:border-primary/45 cursor-pointer transition-colors"
                      onClick={() => openProduct360(o.productId)}
                    >
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{o.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {o.totalQty} units on hand · Whse: {o.warehouseQty} / Retail:{" "}
                          {o.retailQty}
                        </p>
                      </div>
                      <span className="font-semibold text-warning">
                        {fmtINR(o.totalQty * cost)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <SectionCard
            title="Ledger Stock Movement History"
            subtitle="Full auditable trail of mutations on PostgreSQL"
          >
            <div className="overflow-x-auto min-h-[300px] relative text-xs">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : movements.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No stock ledger entries found in the database.
                </div>
              ) : (
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
                      <th className="pb-2 font-medium">Occurred At</th>
                      <th className="pb-2 font-medium">SKU / Product</th>
                      <th className="pb-2 font-medium">Location</th>
                      <th className="pb-2 font-medium">Mutation Type</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 font-medium pl-6">Reason / Reference</th>
                      <th className="pb-2 font-medium">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-surface/30">
                        <td className="py-2.5 text-muted-foreground">{m.occurredAt}</td>
                        <td className="py-2.5">
                          <p className="font-semibold">{m.productName}</p>
                          <p className="text-[10px] text-muted-foreground">{m.sku}</p>
                        </td>
                        <td className="py-2.5 text-muted-foreground">{m.locationName}</td>
                        <td className="py-2.5">
                          <StatusPill
                            tone={
                              ["SALE", "ADJUSTMENT_OUT", "DAMAGE", "EXPIRED"].includes(
                                m.movementType,
                              )
                                ? "danger"
                                : "success"
                            }
                          >
                            {m.movementType}
                          </StatusPill>
                        </td>
                        <td className="py-2.5 text-right font-bold">{m.quantity}</td>
                        <td
                          className="py-2.5 pl-6 text-muted-foreground italic truncate max-w-[200px]"
                          title={m.reason || ""}
                        >
                          {m.reason || "N/A"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {m.performedBy || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Stock Mutation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar border border-hairline text-foreground">
          <DialogHeader>
            <DialogTitle>
              {mutationType === "ADD" && "Receive Stock (Stock In)"}
              {mutationType === "REMOVE" && "Deduct Stock (Stock Out)"}
              {mutationType === "TRANSFER" && "Internal Location Transfer"}
              {mutationType === "ADJUST" && "Inventory Adjustments"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInventoryMutation} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Select Product SKU *</Label>
              <Select value={formProductId} onValueChange={setFormProductId}>
                <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-hairline text-xs">
                  {productList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mutationType === "ADD" && (
              <div className="space-y-1.5">
                <Label>Incoming Subtype *</Label>
                <Select
                  value={formMovementSubtype}
                  onValueChange={(val: any) => setFormMovementSubtype(val)}
                >
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    <SelectItem value="PURCHASE_RECEIPT">Purchase Receipt addition</SelectItem>
                    <SelectItem value="RETURN">Customer Return</SelectItem>
                    <SelectItem value="ADJUSTMENT_IN">Adjustment In (Surplus)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mutationType === "REMOVE" && (
              <div className="space-y-1.5">
                <Label>Outbound Subtype *</Label>
                <Select
                  value={formMovementSubtype}
                  onValueChange={(val: any) => setFormMovementSubtype(val)}
                >
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    <SelectItem value="DAMAGE">Damaged Goods deduction</SelectItem>
                    <SelectItem value="EXPIRED">Expired Batch deduction</SelectItem>
                    <SelectItem value="ADJUSTMENT_OUT">Adjustment Out (Deficit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mutationType === "ADJUST" && (
              <div className="space-y-1.5">
                <Label>Adjustment Type *</Label>
                <Select
                  value={formMovementSubtype}
                  onValueChange={(val: any) => setFormMovementSubtype(val)}
                >
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    <SelectItem value="ADJUSTMENT_IN">Adjustment In (Add)</SelectItem>
                    <SelectItem value="ADJUSTMENT_OUT">Adjustment Out (Deduct)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{mutationType === "TRANSFER" ? "Source Location" : "Location"} *</Label>
                <Select value={formLocationId} onValueChange={setFormLocationId}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    <SelectItem value="loc-warehouse">Central Warehouse</SelectItem>
                    <SelectItem value="loc-retail">Retail Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mutationType === "TRANSFER" ? (
                <div className="space-y-1.5">
                  <Label>Target Location *</Label>
                  <Select value={formTargetLocationId} onValueChange={setFormTargetLocationId}>
                    <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-hairline text-xs">
                      <SelectItem value="loc-warehouse">Central Warehouse</SelectItem>
                      <SelectItem value="loc-retail">Retail Floor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Quantity *</Label>
                  <Input
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    className="bg-surface border-hairline h-8 text-xs"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                  />
                </div>
              )}
            </div>

            {mutationType === "TRANSFER" && (
              <div className="space-y-1.5">
                <Label>Transfer Quantity *</Label>
                <Input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mut-reason">Reason / Reference Notes</Label>
              <Textarea
                id="mut-reason"
                required={["REMOVE", "ADJUST"].includes(mutationType)}
                placeholder="e.g. Broken packaging override or PO order receipt reference"
                className="bg-surface border-hairline text-xs"
                rows={3}
                value={formReason}
                onChange={(e: any) => setFormReason(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Process Mutation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, v, tone }: { label: string; v: string; tone?: "warning" | "danger" }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display text-lg font-semibold",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-warning",
        )}
      >
        {v}
      </p>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
