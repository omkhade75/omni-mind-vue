import { createFileRoute } from "@tanstack/react-router";
import { Filter, Download, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { getTransactionsServer, createTransactionServer, type TransactionListItem } from "@/lib/server-transactions";
import { getProductsServer, getProductOptionsServer, type ProductListItem } from "@/lib/server-products";
import { getCustomersServer, type CustomerListItem } from "@/lib/server-customers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({
    meta: [
      { title: "Sales Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Sales intelligence with department, category, hourly, weekday, and payment splits.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { openCustomer360 } = useBusinessData();
  const { user } = useAuth();

  // Data states
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // POS Checkout Dialog state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form values
  const [formCustomerId, setFormCustomerId] = useState<string>("walkin");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("UPI");
  const [cartItems, setCartItems] = useState<Array<{ productId: string; quantity: number; discount: number }>>([]);

  // Temp item selection
  const [selectedItemSku, setSelectedItemSku] = useState("");
  const [selectedItemQty, setSelectedItemQty] = useState("1");
  const [selectedItemDiscount, setSelectedItemDiscount] = useState("0");

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const payload = {
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
        }
      };
      const txs = await getTransactionsServer(payload);
      const prods = await getProductsServer(payload);
      const custs = await getCustomersServer({
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
          status: "Active"
        }
      });
      const opts = await getProductOptionsServer(payload);

      setTransactions(txs);
      setProducts(prods);
      setCustomers(custs);
      setDepartments(opts.departments);

      if (opts.departments.length > 0) {
        setFormDepartmentId(opts.departments[0].id);
      }
      if (prods.length > 0) {
        setSelectedItemSku(prods[0].id);
      }
    } catch (e) {
      toast.error("Failed to load sales database records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [user]);

  const addToCart = () => {
    if (!selectedItemSku || Number(selectedItemQty) <= 0) return;
    
    // Check if item already exists in cart
    const existingIndex = cartItems.findIndex(i => i.productId === selectedItemSku);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += Number(selectedItemQty);
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        productId: selectedItemSku,
        quantity: Number(selectedItemQty),
        discount: Number(selectedItemDiscount) || 0
      }]);
    }
    toast.success("Added product to transaction cart.");
  };

  const removeFromCart = (index: number) => {
    const updated = cartItems.filter((_, idx) => idx !== index);
    setCartItems(updated);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error("POS transaction cart is empty.");
      return;
    }
    setSaving(true);
    try {
      await createTransactionServer({
        data: {
          customerId: formCustomerId === "walkin" ? null : formCustomerId,
          departmentId: formDepartmentId,
          items: cartItems,
          paymentMethod: formPaymentMethod,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        }
      });
      toast.success("Transaction billed and stock updated successfully.");
      setCheckoutOpen(false);
      setCartItems([]);
      loadSalesData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process sale checkout.");
    } finally {
      setSaving(false);
    }
  };

  // KPIs
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalDiscount = transactions.reduce((sum, t) => sum + t.discount, 0);
  const totalCost = transactions.reduce((sum, t) => {
    // calculate COGS from transaction items cost snapshot
    const itemCogs = t.items.reduce((itemSum, item) => {
      // Find matching cost snapshot or product cost
      const prod = products.find(p => p.id === item.productId);
      const cost = prod ? prod.cost : item.price * 0.6;
      return itemSum + item.quantity * cost;
    }, 0);
    return sum + itemCogs;
  }, 0);
  const totalProfit = totalRevenue - totalCost - totalDiscount;

  const totalOrders = transactions.length;
  const avgOrderVal = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Department splits
  const deptRevenueMap: Record<string, number> = {};
  transactions.forEach((t) => {
    deptRevenueMap[t.dept] = (deptRevenueMap[t.dept] || 0) + t.total;
  });

  const departmentRevenue = Object.keys(deptRevenueMap).map(name => ({
    name,
    value: deptRevenueMap[name]
  })).sort((a, b) => b.value - a.value);

  // Payment splits
  const payMap: Record<string, number> = {};
  transactions.forEach((t) => {
    payMap[t.payment] = (payMap[t.payment] || 0) + 1;
  });
  const paymentSplit = Object.keys(payMap).map(name => ({
    name,
    v: payMap[name]
  }));

  // Group by date for 30-day Area chart (using completed transaction totals)
  const dateRevenueMap: Record<string, number> = {};
  transactions.forEach((t) => {
    dateRevenueMap[t.date] = (dateRevenueMap[t.date] || 0) + t.total;
  });

  // Rebuild 30 day timeseries data dynamically
  const timeSeriesData = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const dateStr = `2026-05-${String(day).padStart(2, "0")}`;
    const dailyRev = dateRevenueMap[dateStr] || 0;
    return {
      day: `${day}`,
      revenue: Math.round(dailyRev),
      prev: Math.round(dailyRev * 0.9 + 5000), // simulated comparison baseline
    };
  });

  // Estimate total cart amount
  const cartTotal = cartItems.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId);
    const price = prod ? prod.price : 0;
    return sum + (price * item.quantity - item.discount);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Sales Intelligence"
          subtitle="Real-time transactional revenue, profit, and customer basket analytics."
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setCartItems([]);
              setCheckoutOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> New Sale (POS)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Gross Revenue" value={totalRevenue} delta={8.4} format="inr-compact" />
        <KpiCard label="Net Profit Est." value={totalProfit} delta={5.2} format="inr-compact" />
        <KpiCard label="Total Orders" value={totalOrders} delta={12.6} format="num" />
        <KpiCard label="Average Order Value" value={avgOrderVal} delta={3.1} format="inr-compact" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title="Sales vs Target"
          subtitle="30-day real transaction volumes"
          className="xl:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `${Number(v) / 1000}K`}
                  width={48}
                  style={{ fontSize: 10 }}
                />
                <Tooltip contentStyle={ttStyle} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#s1)"
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="prev"
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  name="Prev period"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Payment Splits">
          <div className="h-64">
            {paymentSplit.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No payment data found
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentSplit}
                    dataKey="v"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                  >
                    {paymentSplit.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Department Sales" subtitle="Grouped revenue contribution">
          <div className="h-64">
            {departmentRevenue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No sales contribution data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentRevenue} layout="vertical">
                  <CartesianGrid stroke="var(--color-hairline)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: any) => `₹${Number(v) / 100000}L`}
                    style={{ fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    style={{ fontSize: 10 }}
                  />
                  <Tooltip contentStyle={ttStyle} formatter={(v: any) => fmtINR(Number(v))} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Hourly Demand Split" subtitle="Busy transaction hours (today)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={Array.from({ length: 14 }, (_, i) => {
                  const hour = 9 + i;
                  return {
                    hour: `${hour}:00`,
                    sales: transactions.filter(t => t.time.startsWith(String(hour).padStart(2, "0"))).length,
                  };
                })}
              >
                <defs>
                  <linearGradient id="hd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} width={40} style={{ fontSize: 10 }} />
                <Tooltip contentStyle={ttStyle} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-cyan)"
                  strokeWidth={2}
                  fill="url(#hd)"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Transactions Log"
        subtitle={`${transactions.length} bills synced on PostgreSQL`}
      >
        <div className="overflow-x-auto min-h-[250px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No recent transactions recorded in database.
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-xs table-fixed">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
                  <th className="pb-3 w-[120px] font-semibold">Txn ID</th>
                  <th className="pb-3 w-[80px] font-semibold">Time</th>
                  <th className="pb-3 w-[150px] font-semibold">Customer</th>
                  <th className="pb-3 w-[120px] font-semibold">Dept</th>
                  <th className="pb-3 w-[80px] text-right font-semibold">Items</th>
                  <th className="pb-3 w-[120px] text-right font-semibold pr-4">Amount</th>
                  <th className="pb-3 w-[100px] font-semibold pl-4">Payment</th>
                  <th className="pb-3 w-[100px] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {transactions.slice(0, 12).map((t) => (
                  <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 font-mono text-[11px] text-muted-foreground">{t.transactionNumber}</td>
                    <td className="py-3">{t.date} {t.time}</td>
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

      {/* POS Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px] bg-sidebar border border-hairline text-foreground overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Point-of-Sale (POS) Checkout</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckout} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer Profiler</Label>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    <SelectItem value="walkin">Walk-in Customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.customerCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Store Department *</Label>
                <Select value={formDepartmentId} onValueChange={setFormDepartmentId}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cart Builder */}
            <div className="border border-hairline rounded-lg p-3 space-y-3 bg-surface/50">
              <span className="font-semibold text-primary block">Transaction Cart Builder</span>
              
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <Label>Product SKU</Label>
                  <Select value={selectedItemSku} onValueChange={setSelectedItemSku}>
                    <SelectTrigger className="bg-surface border-hairline h-8 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-hairline text-[10px] max-h-40">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({fmtINR(p.price)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    className="bg-surface border-hairline h-8 text-xs"
                    value={selectedItemQty}
                    onChange={(e) => setSelectedItemQty(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={addToCart} className="bg-primary hover:bg-primary/95 text-primary-foreground h-8 text-xs font-semibold">
                  Add Item
                </Button>
              </div>

              {/* Cart List */}
              {cartItems.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">Cart is empty.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {cartItems.map((item, idx) => {
                    const prod = products.find(p => p.id === item.productId);
                    return (
                      <div key={idx} className="flex justify-between items-center text-[10px] bg-sidebar border border-hairline p-2 rounded">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{prod ? prod.name : item.productId}</p>
                          <p className="text-muted-foreground">Qty: {item.quantity} · Rate: {prod ? fmtINR(prod.price) : 0}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{prod ? fmtINR((prod.price * item.quantity) - item.discount) : 0}</span>
                          <button type="button" onClick={() => removeFromCart(idx)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
              <div className="space-y-1.5">
                <Label>Payment Gateway Channel</Label>
                <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    <SelectItem value="UPI">UPI (Unified Payments Interface)</SelectItem>
                    <SelectItem value="Card">Credit/Debit Card</SelectItem>
                    <SelectItem value="Cash">Cash Transaction</SelectItem>
                    <SelectItem value="Wallet">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 flex flex-col justify-center text-right">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Billed Total Amount</span>
                <span className="text-lg font-bold text-primary mt-0.5">{fmtINR(cartTotal)}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setCheckoutOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || cartItems.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Complete Checkout
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
