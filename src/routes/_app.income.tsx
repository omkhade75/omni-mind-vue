import { createFileRoute } from "@tanstack/react-router";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getIncomingPaymentsServer, recordIncomingRevenueServer } from "@/lib/server-ledger";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2, Plus, Wallet, TrendingUp, DollarSign, Layers, ArrowUpRight, Search, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/income")({
  head: () => ({
    meta: [
      { title: "Consolidated Income — OmniMind AI" },
      {
        name: "description",
        content: "Income dashboard showing real-time sales, rent, and ancillary revenue streams.",
      },
    ],
  }),
  component: RouteComponent,
});

interface IncomingPayment {
  id: string;
  journalId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  description: string;
  date: string;
  referenceType: string | null;
  referenceId: string | null;
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b"];

function RouteComponent() {
  const { user } = useAuth();
  const { transactions, activeDate } = useBusinessData();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<IncomingPayment[]>([]);

  // Dialog / Form states
  const [showFormModal, setShowFormModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"Rent" | "Other">("Rent");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      const res = await getIncomingPaymentsServer();
      setPayments(res as IncomingPayment[]);
    } catch (err) {
      toast.error("Failed to load incoming payments history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRecordRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !description.trim()) {
      toast.error("Please enter a valid amount and description.");
      return;
    }

    try {
      setSaving(true);
      await recordIncomingRevenueServer({
        data: {
          amount: Number(amount),
          category,
          description,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        }
      });

      toast.success("Incoming revenue receipt recorded in General Ledger!");
      setAmount("");
      setDescription("");
      setShowFormModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record revenue.");
    } finally {
      setSaving(false);
    }
  };

  // --- Dynamic calculations for active month ---
  const activeYearMonth = activeDate.split("T")[0].slice(0, 7);
  const formattedMonth = new Date(activeDate).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // 1. Sales revenue from transactions
  const thisMonthTxns = transactions.filter(
    (t) => t.date.split("T")[0].startsWith(activeYearMonth) && t.status === "Completed"
  );

  let grossSales = 0;
  let discounts = 0;
  thisMonthTxns.forEach((t) => {
    grossSales += t.subtotal;
    discounts += t.discount;
  });
  const netSales = grossSales - discounts;

  // 2. Rent revenue from ledger payments (plus seeded placeholders if no entries)
  const rentLedgerSum = payments
    .filter((p) => p.accountCode === "4200" && p.date.startsWith(activeYearMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRent = rentLedgerSum;

  // 3. Other ancillary revenue
  const otherLedgerSum = payments
    .filter((p) => p.accountCode === "4300" && p.date.startsWith(activeYearMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOther = otherLedgerSum;

  const totalIncome = netSales + totalRent + totalOther;

  // --- Graph 1: Daily Revenue Trend for Active Month ---
  const dailyDataMap: { [key: string]: number } = {};
  
  // Initialize all days of the active month
  const year = parseInt(activeYearMonth.split("-")[0]);
  const month = parseInt(activeYearMonth.split("-")[1]);
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${activeYearMonth}-${d.toString().padStart(2, "0")}`;
    dailyDataMap[dayStr] = 0;
  }

  // Populate POS sales
  thisMonthTxns.forEach((t) => {
    const dateStr = t.date.split("T")[0];
    if (dailyDataMap[dateStr] !== undefined) {
      dailyDataMap[dateStr] += t.total;
    }
  });

  // Populate logged incoming revenues
  payments.forEach((p) => {
    const dateStr = p.date.split("T")[0];
    if (dailyDataMap[dateStr] !== undefined) {
      dailyDataMap[dateStr] += p.amount;
    }
  });

  const dailyTrendData = Object.keys(dailyDataMap)
    .sort()
    .map((dateStr) => {
      const dayNum = parseInt(dateStr.split("-")[2]);
      return {
        date: `${dayNum}`,
        Amount: dailyDataMap[dateStr],
      };
    });

  // --- Graph 2: Revenue Distribution Pie ---
  const pieData = [
    { name: "POS Sales", value: netSales },
    { name: "Rental Income", value: totalRent },
    { name: "Other Ancillary", value: totalOther },
  ];

  // --- Filtered Payments List for Ledger Log ---
  // Merge POS transactions and miscellaneous ledger receipts
  const allInflows = [
    ...thisMonthTxns.map((t) => ({
      id: t.id,
      source: "POS Sales Receipt",
      account: "Sales Revenue (4000)",
      description: `POS Checkout - Transaction #${t.id.slice(0, 8).toUpperCase()}`,
      amount: t.total,
      date: t.date,
      type: "Sales",
    })),
    ...payments.map((p) => ({
      id: p.id,
      source: p.accountCode === "4200" ? "Lease Tenant Collection" : "Ancillary Receipt",
      account: `${p.accountName} (${p.accountCode})`,
      description: p.description,
      amount: p.amount,
      date: p.date,
      type: p.accountCode === "4200" ? "Rent" : "Other",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredInflows = allInflows.filter((inf) => {
    const query = searchQuery.toLowerCase();
    return (
      inf.description.toLowerCase().includes(query) ||
      inf.source.toLowerCase().includes(query) ||
      inf.account.toLowerCase().includes(query) ||
      inf.amount.toString().includes(query)
    );
  });

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
        title="Consolidated Income Dashboard"
        description="Comprehensive real-time tracking of mall revenue across retail points of sale, sub-lease tenants, parking, and advertising operations."
      />

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Monthly Income"
          value={totalIncome}
          format="inr"
          icon={<Wallet className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="POS Sales (Net Revenue)"
          value={netSales}
          format="inr"
          icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="Sub-lease Rental Income"
          value={totalRent}
          format="inr"
          icon={<DollarSign className="h-5 w-5 text-amber-500" />}
        />
        <KpiCard
          label="Other Ancillary Revenue"
          value={totalOther}
          format="inr"
          icon={<Layers className="h-5 w-5 text-pink-500" />}
        />
      </div>

      {/* Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Monthly Trend Area Chart */}
        <div className="lg:col-span-2">
          <SectionCard title={`Daily Revenue Trend — ${formattedMonth}`} icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}>
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                  />
                  <Tooltip
                    formatter={(value) => [fmtINR(Number(value)), "Inflow"]}
                    labelFormatter={(label) => `Day ${label} of Month`}
                    contentStyle={{ borderRadius: "8px", borderColor: "#e4e4e7" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Amount"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Right: Revenue Stream Allocation Donut Chart */}
        <SectionCard title="Revenue Stream Allocation" icon={<Layers className="h-5 w-5 text-pink-500" />}>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmtINR(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {pieData.map((d, index) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-zinc-600 font-medium">{d.name}</span>
                </div>
                <span className="font-semibold text-zinc-900">
                  {fmtINR(d.value)} ({((d.value / (totalIncome || 1)) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>

      {/* Ledger of Incoming Payments Log */}
      <SectionCard
        title="Ledger of Incoming Payments"
        icon={<FileText className="h-5 w-5 text-emerald-500" />}
        action={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search ledger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs w-48 lg:w-64"
              />
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 h-9 text-xs"
              onClick={() => setShowFormModal(true)}
            >
              <Plus className="h-4 w-4" /> Log Rental/Misc Income
            </Button>
          </div>
        }
      >
        {filteredInflows.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            No matching incoming revenue receipts logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                <tr>
                  <th className="px-4 py-3">Receipt Source</th>
                  <th className="px-4 py-3">Ledger Account</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Inflow Amount</th>
                  <th className="px-4 py-3 text-center">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredInflows.map((inf) => (
                  <tr key={inf.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900">{inf.source}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">ID: {inf.id.toUpperCase().slice(0, 10)}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <span className="font-mono text-xs">{inf.account}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 max-w-xs truncate">{inf.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">+{fmtINR(inf.amount)}</td>
                    <td className="px-4 py-3 text-center text-zinc-500 text-xs">
                      {new Date(inf.date).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Record Miscellaneous Revenue Dialog */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Incoming Miscellaneous Income</DialogTitle>
            <DialogDescription>
              Log incoming payments for rent lease collections or ancillary operations. This automatically posts a debit to Cash (1000) and credits the revenue account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordRevenue} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Revenue Category</Label>
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rent">Rent & Lease Revenue (4200)</SelectItem>
                  <SelectItem value="Other">Other Revenue / Parking / Ads (4300)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Inflow Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Memo Description</Label>
              <Input
                placeholder="e.g. Monthly rent received from Tenant Shop #104"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowFormModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Inflow Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
