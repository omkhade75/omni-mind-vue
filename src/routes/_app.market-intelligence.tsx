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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Corporate Cash Reserves (GL Code 1000)"
          value={cashBalance}
          format="inr"
          icon={<Wallet className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Active Investment Assets (GL Code 1400)"
          value={portfolioValue}
          format="inr"
          icon={<Landmark className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="Total Corporate Capital Assets"
          value={cashBalance + portfolioValue}
          format="inr"
          icon={<Coins className="h-5 w-5 text-yellow-500" />}
        />
      </div>

      {/* Live Commodity Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Macro Market Tickers">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {commodities.map((c) => (
                <div
                  key={c.symbol}
                  onClick={() => setSelectedAsset(c.symbol)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedAsset === c.symbol
                      ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
                      : "border-border/60 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">{c.symbol}</span>
                    <span
                      className={`flex items-center text-xs font-bold ${
                        c.trend >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {c.trend >= 0 ? "+" : ""}
                      {c.trend}%
                      {c.trend >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-zinc-900 truncate">
                    {c.name.split(" (")[0]}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Price: <span className="font-semibold text-zinc-800">{fmtINR(c.price)}</span> /{" "}
                    {c.unit}
                  </p>
                </div>
              ))}
            </div>

            {/* Historical charts */}
            <div className="h-72 w-full pt-4">
              <h4 className="text-sm font-semibold mb-4 text-zinc-700 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-indigo-600" />
                Historical Price Index trend — {activeAsset.name}
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HISTORICAL_CHART_DATA}>
                  <defs>
                    <linearGradient id="assetColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeAsset.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={activeAsset.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100" />
                  <XAxis dataKey="day" className="text-xs text-muted-foreground" />
                  <YAxis className="text-xs text-muted-foreground" domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(value: any) => [fmtINR(Number(value)), activeAsset.symbol]}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeAsset.symbol}
                    stroke={activeAsset.color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#assetColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Investment Action Form */}
        <div>
          <SectionCard title="Deploy Treasury Reserves">
            <form onSubmit={handleInvest} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Select Asset</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commodities.map((c) => (
                      <SelectItem key={c.symbol} value={c.symbol}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Asset Price</Label>
                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-zinc-50 text-zinc-900 font-semibold flex items-center dark:bg-zinc-900 dark:text-zinc-100">
                    {fmtINR(activeAsset.price)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity ({activeAsset.unit})</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={investQty}
                    onChange={(e) => setInvestQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50/60 rounded-xl border border-zinc-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">GL Cash Reserves:</span>
                  <span className="font-semibold text-zinc-900">{fmtINR(cashBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total Purchase Cost:</span>
                  <span className="font-semibold text-zinc-900 text-indigo-600">
                    {fmtINR(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t text-xs">
                  <span className="text-zinc-500">Resulting Cash Balance:</span>
                  <span
                    className={`font-semibold ${
                      cashBalance - totalCost < 0 ? "text-rose-600" : "text-zinc-700"
                    }`}
                  >
                    {fmtINR(cashBalance - totalCost)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-6 text-base bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2"
                disabled={investing || totalCost > cashBalance}
              >
                {investing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Processing Order...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5" /> Buy Investment Assets
                  </>
                )}
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>

      {/* Holdings Portfolio Table */}
      <SectionCard title="Corporate Investment Ledger (Ledger code 1400)">
        {holdings.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No active or liquidated investments on file. Deploy treasury reserves above to populate
            the ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3 text-right">Purchase Price</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Total Cost</th>
                  <th className="px-4 py-3 text-right">Current Value</th>
                  <th className="px-4 py-3 text-right">Gain / Loss</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const gainLoss = h.currentValue - h.totalCost;
                  const pct = ((gainLoss / h.totalCost) * 100).toFixed(1);
                  return (
                    <tr key={h.id} className="border-b hover:bg-zinc-50/50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-zinc-950">{h.assetName}</div>
                        <div className="text-xs text-zinc-500 font-mono">ID: {h.id.slice(-6)}</div>
                      </td>
                      <td className="px-4 py-4 text-right">{fmtINR(h.purchasePrice)}</td>
                      <td className="px-4 py-4 text-right font-mono">{h.quantity}</td>
                      <td className="px-4 py-4 text-right font-semibold">{fmtINR(h.totalCost)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-zinc-900">
                        {fmtINR(h.currentValue)}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-bold ${gainLoss >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {gainLoss >= 0 ? "+" : ""}
                        {fmtINR(gainLoss)} ({pct}%)
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                            h.status === "Active"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {h.status === "Active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
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
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Sell Asset
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-400">Sold</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
