import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
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
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLedgerBalancesServer } from "@/lib/server-ledger";
import {
  getInvestmentsServer,
  investCorporateCashServer,
  liquidateInvestmentServer,
  getLiveMarketDataServer,
  type InvestmentItem,
} from "@/lib/server-investments";
import {
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  DollarSign,
  Activity,
  Coins,
  Globe,
  Landmark,
  Zap,
  Database,
} from "lucide-react";
import { fmtINR } from "@/lib/mock-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_app/market-intelligence")({
  head: () => ({
    meta: [
      { title: "Market Intelligence & Investments — OmniMind AI" },
      { name: "description", content: "Corporate treasury cash investment portal." },
    ],
  }),
  component: MarketIntelligencePage,
});

const DEFAULT_COMMODITIES = [
  { name: "Gold (XAU)", symbol: "XAU", price: 62450, unit: "10g", trend: 1.2, color: "#eab308" },
  { name: "Silver (XAG)", symbol: "XAG", price: 74200, unit: "kg", trend: -0.4, color: "#94a3b8" },
  {
    name: "Bitcoin (BTC)",
    symbol: "BTC",
    price: 5500000,
    unit: "coin",
    trend: 2.1,
    color: "#f7931a",
  },
  {
    name: "Retail Industry Index (RTL)",
    symbol: "RTL",
    price: 12800,
    unit: "share",
    trend: 0.8,
    color: "#10b981",
  },
  {
    name: "Crude Oil (WTI)",
    symbol: "WTI",
    price: 6450,
    unit: "barrel",
    trend: -1.5,
    color: "#f97316",
  },
];

const HISTORICAL_CHART_DATA = [
  { day: "Mon", XAU: 61800, XAG: 74500, BTC: 5400000, RTL: 12700, WTI: 6600 },
  { day: "Tue", XAU: 62100, XAG: 74100, BTC: 5450000, RTL: 12750, WTI: 6520 },
  { day: "Wed", XAU: 62300, XAG: 74300, BTC: 5300000, RTL: 12720, WTI: 6480 },
  { day: "Thu", XAU: 62200, XAG: 73900, BTC: 5480000, RTL: 12780, WTI: 6510 },
  { day: "Fri", XAU: 62450, XAG: 74200, BTC: 5500000, RTL: 12800, WTI: 6450 },
];


function MarketIntelligencePage() {
  const { user } = useAuth();

  // Data states
  const [cashBalance, setCashBalance] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [holdings, setHoldings] = useState<InvestmentItem[]>([]);
  const [commodities, setCommodities] = useState(DEFAULT_COMMODITIES);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedAsset, setSelectedAsset] = useState("XAU");
  const [investQty, setInvestQty] = useState("1");
  const [investing, setInvesting] = useState(false);
  const [liquidatingId, setLiquidatingId] = useState<string | null>(null);

  const activeAsset = commodities.find((c) => c.symbol === selectedAsset) || commodities[0];
  const totalCost = activeAsset.price * (Number(investQty) || 0);

  const loadData = async () => {
    try {
      // 1. Load general ledger balances to find Cash (code 1000)
      const res = (await getLedgerBalancesServer()) as any;
      const trialBalance = res?.trialBalance || [];
      const cashAc = trialBalance.find((b: any) => b.code === "1000");
      setCashBalance(cashAc ? Number(cashAc.balance) : 0);

      // 2. Load investment holdings
      const invs = await getInvestmentsServer({});
      setHoldings(invs);

      // 3. Load live market data
      try {
        const liveData = (await getLiveMarketDataServer({})) as typeof DEFAULT_COMMODITIES;
        setCommodities(liveData);
      } catch (err) {
        console.error("Failed to load live market data, falling back to mock data", err);
      }

      // Calculate portfolio total value (only active ones)
      const activeVal = invs
        .filter((inv) => inv.status === "Active")
        .reduce((sum, inv) => sum + Number(inv.totalCost), 0);
      setPortfolioValue(activeVal);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load investment profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(investQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid investment quantity.");
      return;
    }

    if (totalCost > cashBalance) {
      toast.error("Insufficient Cash in General Ledger to execute purchase.");
      return;
    }

    try {
      setInvesting(true);
      await investCorporateCashServer({
        data: {
          assetName: activeAsset.name,
          symbol: activeAsset.symbol,
          purchasePrice: activeAsset.price,
          quantity: qty,
          totalCost,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        },
      });

      toast.success(`Treasury Purchase Complete!`, {
        description: `Successfully invested ${qty} units in ${activeAsset.name} for ${fmtINR(totalCost)}.`,
      });

      setInvestQty("1");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Investment purchase failed.");
    } finally {
      setInvesting(false);
    }
  };

  const handleLiquidate = async (id: string, price: number, name: string) => {
    try {
      setLiquidatingId(id);
      await liquidateInvestmentServer({
        data: {
          investmentId: id,
          liquidatedPrice: price,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        },
      });

      toast.success(`Asset Liquidated!`, {
        description: `Successfully sold holdings of ${name} and returned cash to General Ledger.`,
      });

      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Liquidation failed.");
    } finally {
      setLiquidatingId(null);
    }
  };

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
        title="Market Intelligence & Corporate Investments"
        subtitle="Monitor macro-economic commodities and deploy mall treasury reserves in high-yield assets."
      />

      {/* Clean Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Corporate Cash Reserves
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">
                {fmtINR(cashBalance)}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">GL CODE: 1000</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Active Investment Assets
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">
                {fmtINR(portfolioValue)}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">GL CODE: 1400</p>
            </div>
            <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
              <Landmark className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Total Capital Assets
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">
                {fmtINR(cashBalance + portfolioValue)}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">CASH + INVESTMENTS</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <Coins className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Live Commodity Board */}
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tickers & Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" /> Macro Market Tickers
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {commodities.map((c) => (
                <div
                  key={c.symbol}
                  onClick={() => setSelectedAsset(c.symbol)}
                  className={`relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                    selectedAsset === c.symbol
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                      : "bg-surface hover:bg-accent hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">{c.symbol}</span>
                    <span
                      className={`flex items-center text-xs font-bold ${
                        c.trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {c.trend >= 0 ? "+" : ""}
                      {c.trend}%
                      {c.trend >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 ml-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 ml-0.5" />
                      )}
                    </span>
                  </div>
                  <h4 className="font-semibold text-base text-foreground truncate">
                    {c.name.split(" (")[0]}
                  </h4>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-bold text-foreground">{fmtINR(c.price)}</span>
                    <span className="text-xs text-muted-foreground">/ {c.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Historical charts */}
            <div className="h-72 w-full pt-6 border-t">
              <h4 className="text-sm font-medium mb-6 text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Price Index Trend — {activeAsset.name}
              </h4>
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HISTORICAL_CHART_DATA}>
                    <defs>
                      <linearGradient id="assetColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeAsset.color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={activeAsset.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="day" className="text-xs font-medium" stroke="var(--color-muted-foreground)" axisLine={false} tickLine={false} />
                    <YAxis className="text-xs font-medium" stroke="var(--color-muted-foreground)" domain={["auto", "auto"]} axisLine={false} tickLine={false} tickFormatter={(val: number) => `₹${(val/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "8px", color: "var(--color-foreground)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
                      itemStyle={{ color: activeAsset.color, fontWeight: "600" }}
                      formatter={(value: any) => [fmtINR(Number(value)), activeAsset.symbol]}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeAsset.symbol}
                      stroke={activeAsset.color}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#assetColor)"
                      activeDot={{ r: 4, strokeWidth: 0, fill: activeAsset.color }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Action Form */}
        <div className="h-full">
          <div className="rounded-xl border bg-card p-6 shadow-sm h-full flex flex-col">
            <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Deploy Treasury Reserves
            </h3>
            <form onSubmit={handleInvest} className="space-y-6 flex-1 flex flex-col">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Asset</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commodities.map((c) => (
                      <SelectItem key={c.symbol} value={c.symbol}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Asset Price</Label>
                  <div className="h-10 px-3 rounded-md border bg-muted/50 text-foreground font-semibold flex items-center">
                    {fmtINR(activeAsset.price)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quantity ({activeAsset.unit})</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={investQty}
                    onChange={(e) => setInvestQty(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="p-4 mt-auto rounded-lg bg-surface border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">GL Cash Reserves</span>
                  <span className="font-semibold text-foreground">{fmtINR(cashBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Purchase</span>
                  <span className="font-bold text-primary">
                    {fmtINR(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Resulting Cash</span>
                  <span
                    className={`font-bold ${
                      cashBalance - totalCost < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"
                    }`}
                  >
                    {fmtINR(cashBalance - totalCost)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium shadow-sm"
                disabled={investing || totalCost > cashBalance}
              >
                {investing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing Order...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" /> Execute Investment
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Holdings Portfolio Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" /> Corporate Investment Ledger (GL Code: 1400)
          </h3>
        </div>
        
        {holdings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
            No active or liquidated investments on file.<br/>Deploy treasury reserves above to populate the ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs font-medium border-b">
                  <th className="px-6 py-3 font-medium">Asset</th>
                  <th className="px-6 py-3 font-medium text-right">Purchase Price</th>
                  <th className="px-6 py-3 font-medium text-right">Quantity</th>
                  <th className="px-6 py-3 font-medium text-right">Total Cost</th>
                  <th className="px-6 py-3 font-medium text-right">Current Value</th>
                  <th className="px-6 py-3 font-medium text-right">Gain / Loss</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {holdings.map((h) => {
                  const gainLoss = h.currentValue - h.totalCost;
                  const pct = ((gainLoss / h.totalCost) * 100).toFixed(1);
                  return (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{h.assetName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">ID: {h.id.slice(-8)}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{fmtINR(h.purchasePrice)}</td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground">{h.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">{fmtINR(h.totalCost)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-foreground">
                        {fmtINR(h.currentValue)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-medium ${gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}
                      >
                        {gainLoss >= 0 ? "+" : ""}
                        {fmtINR(gainLoss)} <span className="text-xs ml-1 opacity-80">({pct}%)</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-[11px] rounded-md font-medium ${
                            h.status === "Active"
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                              : "bg-surface text-muted-foreground border border-border"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {h.status === "Active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                            onClick={() =>
                              handleLiquidate(
                                h.id,
                                h.purchasePrice *
                                  (1 +
                                    (commodities.find((c) => c.symbol === h.symbol)?.trend || 0) /
                                      100),
                                h.assetName,
                              )
                            }
                            disabled={liquidatingId === h.id}
                          >
                            {liquidatingId === h.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            ) : <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
                            Sell Asset
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium">Liquidated</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
