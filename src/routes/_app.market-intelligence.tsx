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

      {/* Premium KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cash Reserves */}
        <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-black border border-white/5 p-6 shadow-2xl transition-all duration-300 hover:shadow-emerald-500/10 hover:border-emerald-500/20">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">
                Corporate Cash Reserves
              </p>
              <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-400">
                {fmtINR(cashBalance)}
              </h3>
              <p className="text-[10px] text-emerald-400/80 mt-1 font-mono">GL CODE: 1000</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Investment Assets */}
        <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-black border border-white/5 p-6 shadow-2xl transition-all duration-300 hover:shadow-indigo-500/10 hover:border-indigo-500/20">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">
                Active Investment Assets
              </p>
              <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-400">
                {fmtINR(portfolioValue)}
              </h3>
              <p className="text-[10px] text-indigo-400/80 mt-1 font-mono">GL CODE: 1400</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] transition-all duration-300">
              <Landmark className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Total Assets */}
        <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-black border border-white/5 p-6 shadow-2xl transition-all duration-300 hover:shadow-amber-500/10 hover:border-amber-500/20">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">
                Total Capital Assets
              </p>
              <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-amber-100">
                {fmtINR(cashBalance + portfolioValue)}
              </h3>
              <p className="text-[10px] text-amber-400/80 mt-1 font-mono">CASH + INVESTMENTS</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] group-hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all duration-300">
              <Coins className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Live Commodity Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-surface/50 to-black/50 backdrop-blur-xl p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Macro Market Tickers
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {commodities.map((c) => (
                <div
                  key={c.symbol}
                  onClick={() => setSelectedAsset(c.symbol)}
                  className={`relative overflow-hidden p-5 rounded-xl cursor-pointer transition-all duration-300 ${
                    selectedAsset === c.symbol
                      ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.15)] scale-[1.02]"
                      : "bg-surface border-white/5 hover:border-white/20 hover:bg-surface/80 hover:scale-[1.01]"
                  } border`}
                >
                  {selectedAsset === c.symbol && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <span className="text-[11px] font-bold text-muted-foreground tracking-widest">{c.symbol}</span>
                    <span
                      className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        c.trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
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
                  <h4 className="font-bold text-lg text-foreground truncate relative z-10">
                    {c.name.split(" (")[0]}
                  </h4>
                  <div className="text-sm mt-1 flex items-end gap-1.5 relative z-10">
                    <span className="font-bold text-zinc-100">{fmtINR(c.price)}</span>
                    <span className="text-xs text-muted-foreground pb-0.5">/ {c.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Historical charts */}
            <div className="h-72 w-full pt-6 border-t border-white/5 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none opacity-50" />
              <h4 className="text-sm font-semibold mb-6 text-zinc-300 flex items-center gap-2 relative z-10">
                <Activity className="h-4 w-4 text-primary" />
                Historical Price Index trend — {activeAsset.name}
              </h4>
              <div className="relative z-10 h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HISTORICAL_CHART_DATA}>
                    <defs>
                      <linearGradient id="assetColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeAsset.color} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={activeAsset.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" className="text-xs font-medium" stroke="rgba(255,255,255,0.4)" tick={{fill: "rgba(255,255,255,0.5)"}} axisLine={false} tickLine={false} />
                    <YAxis className="text-xs font-medium" stroke="rgba(255,255,255,0.4)" tick={{fill: "rgba(255,255,255,0.5)"}} domain={["auto", "auto"]} axisLine={false} tickLine={false} tickFormatter={(val: number) => `₹${(val/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)" }}
                      itemStyle={{ color: activeAsset.color, fontWeight: "bold" }}
                      formatter={(value: any) => [fmtINR(Number(value)), activeAsset.symbol]}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeAsset.symbol}
                      stroke={activeAsset.color}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#assetColor)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: activeAsset.color, style: { filter: `drop-shadow(0px 0px 5px ${activeAsset.color})` } }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Action Form */}
        <div className="relative h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent blur-3xl opacity-20 pointer-events-none" />
          <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl h-full flex flex-col relative z-10">
            <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Deploy Treasury Reserves
            </h3>
            <form onSubmit={handleInvest} className="space-y-5 flex-1 flex flex-col">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Select Asset</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger className="bg-surface/50 border-white/10 h-12">
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
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Asset Price</Label>
                  <div className="h-12 px-4 rounded-lg border border-white/5 bg-surface/30 text-zinc-100 font-bold flex items-center text-lg">
                    {fmtINR(activeAsset.price)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Quantity ({activeAsset.unit})</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={investQty}
                    onChange={(e) => setInvestQty(e.target.value)}
                    className="h-12 bg-surface/50 border-white/10 text-lg font-bold"
                  />
                </div>
              </div>

              <div className="p-5 mt-auto rounded-xl bg-surface/40 border border-white/5 space-y-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">GL Cash Reserves</span>
                  <span className="font-bold text-zinc-300">{fmtINR(cashBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Purchase</span>
                  <span className="font-bold text-lg text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]">
                    {fmtINR(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Resulting Cash</span>
                  <span
                    className={`font-bold ${
                      cashBalance - totalCost < 0 ? "text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" : "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]"
                    }`}
                  >
                    {fmtINR(cashBalance - totalCost)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 mt-6 text-base font-bold tracking-wide rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-400 text-white"
                disabled={investing || totalCost > cashBalance}
              >
                {investing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing Order...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2 fill-current" /> Execute Investment
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Holdings Portfolio Table */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-surface/50 to-black/50 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Corporate Investment Ledger (GL Code: 1400)
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
                <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Asset</th>
                  <th className="px-6 py-4 text-right">Purchase Price</th>
                  <th className="px-6 py-4 text-right">Quantity</th>
                  <th className="px-6 py-4 text-right">Total Cost</th>
                  <th className="px-6 py-4 text-right">Current Value</th>
                  <th className="px-6 py-4 text-right">Gain / Loss</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {holdings.map((h) => {
                  const gainLoss = h.currentValue - h.totalCost;
                  const pct = ((gainLoss / h.totalCost) * 100).toFixed(1);
                  return (
                    <tr key={h.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-100">{h.assetName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase">ID: {h.id.slice(-8)}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300 font-medium">{fmtINR(h.purchasePrice)}</td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-400">{h.quantity}</td>
                      <td className="px-6 py-4 text-right font-bold text-zinc-200">{fmtINR(h.totalCost)}</td>
                      <td className="px-6 py-4 text-right font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                        {fmtINR(h.currentValue)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${gainLoss >= 0 ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]"}`}
                      >
                        {gainLoss >= 0 ? "+" : ""}
                        {fmtINR(gainLoss)} <span className="text-[10px] ml-1 opacity-80">({pct}%)</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-wider ${
                            h.status === "Active"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                              : "bg-surface text-muted-foreground border border-white/10"
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
                            className="text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
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
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Liquidated</span>
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
