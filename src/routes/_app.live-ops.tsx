import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import {
  Circle,
  ShoppingBag,
  UserPlus,
  AlertTriangle,
  Truck,
  RefreshCw,
  Sparkles,
  Wallet,
  Activity,
} from "lucide-react";
import { DEPARTMENTS } from "@/lib/mock-data";
import { useBusinessData } from "@/lib/business-context";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/live-ops")({
  head: () => ({
    meta: [
      { title: "Live Operations — OmniMind AI" },
      {
        name: "description",
        content: "Real-time mall operations: footfall, checkouts, sales, and staff.",
      },
    ],
  }),
  component: LiveOps,
});

const ICON: Record<string, React.ReactNode> = {
  sale: <ShoppingBag className="h-3.5 w-3.5 text-success" />,
  customer: <UserPlus className="h-3.5 w-3.5 text-info" />,
  alert: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  delivery: <Truck className="h-3.5 w-3.5 text-primary" />,
  return: <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />,
  ai: <Sparkles className="h-3.5 w-3.5 text-violet" />,
  expense: <Wallet className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function LiveOps() {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 3000);
    return () => clearInterval(id);
  }, []);

  const {
    activeDate,
    transactions,
    expenses,
    recommendations,
    anomalies,
    purchaseOrders,
    staff,
  } = useBusinessData();

  // Filter transactions to the current active date (defaults to today's local date)
  const activeDateStr = activeDate.split("T")[0];
  const dayTxns = transactions.filter((t) => t.date.split("T")[0] === activeDateStr);

  // 1. Footfall & Checkouts pseudo-fluctuations
  const footfallFluctuation =
    Math.floor(Math.sin(t / 10000) * 15) + Math.floor(Math.cos(t / 5000) * 8);
  const displayFootfall = (1842 + footfallFluctuation + dayTxns.length * 5).toLocaleString("en-IN");

  const checkoutFluctuation = Math.abs(Math.floor(Math.sin(t / 8000) * 2));
  const displayCheckouts = `${18 + checkoutFluctuation} / 22`;

  const staffFluctuation = Math.floor(Math.sin(t / 15000) * 3);
  const displayStaff = (staff.length || 142) + staffFluctuation;

  // 2. Sales this hour: base 1.42L + any today sales in the current hour
  const currentHour = new Date().getHours();
  const salesThisHourVal = dayTxns
    .filter((t) => {
      try {
        return new Date(t.date).getHours() === currentHour;
      } catch {
        return false;
      }
    })
    .reduce((sum, t) => sum + (t.total || 0), 0);
  const displaySalesThisHour = `₹${((142000 + salesThisHourVal) / 100000).toFixed(2)}L`;

  // 3. Txn/min: base 14.2 + increment based on daily checkouts
  const displayTxnMin = (14.2 + dayTxns.length * 0.1).toFixed(1);

  // 4. Live Sales - hourly chart data overlay
  const hourlySalesChart = Array.from({ length: 14 }, (_, i) => {
    const hourNum = 9 + i;
    const hourStr = `${String(hourNum).padStart(2, "0")}:00`;
    const liveSales = dayTxns
      .filter((t) => {
        try {
          return new Date(t.date).getHours() === hourNum;
        } catch {
          return false;
        }
      })
      .reduce((sum, t) => sum + (t.total || 0), 0);
    
    // Add baseline for display aesthetics
    const baselineSales = Math.round(15000 + Math.sin(hourNum / 2) * 5000);
    return {
      hour: hourStr,
      sales: baselineSales + liveSales,
    };
  });

  // 5. Activity Feed: Prepend real database transactions at the top
  const getTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      if (diffMs < 0 || diffMs > 24 * 60 * 60 * 1000) {
        return new Date(dateStr).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
        });
      }
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      if (mins < 60) return `${mins} min ago`;
      return `${Math.floor(mins / 60)} hrs ago`;
    } catch {
      return "just now";
    }
  };

  const combinedFeed = [
    ...transactions.map((tx) => ({
      type: "sale",
      text: `New sale ₹${tx.total.toLocaleString("en-IN")} · ${tx.dept} · ${tx.payment}`,
      t: getTimeAgo(tx.date),
      timestamp: new Date(tx.date).getTime(),
    })),
    ...expenses.map((ex) => ({
      type: "expense",
      text: `Expense added ₹${ex.amount.toLocaleString("en-IN")} · ${ex.desc}`,
      t: getTimeAgo(ex.date),
      timestamp: new Date(ex.date).getTime(),
    })),
    ...recommendations.map((rec) => ({
      type: "ai",
      text: `AI generated: "${rec.title}"`,
      t: "recently",
      timestamp: Date.now() - 4 * 60 * 60 * 1000,
    })),
    ...anomalies.map((anom) => ({
      type: "alert",
      text: `Anomaly: ${anom.metric} is ${anom.actual} (expected ${anom.expected})`,
      t: getTimeAgo(anom.date),
      timestamp: new Date(anom.date).getTime(),
    })),
    ...purchaseOrders.map((po) => ({
      type: "delivery",
      text: `PO ${po.id} for ${po.productName} is ${po.status}`,
      t: getTimeAgo(po.date),
      timestamp: new Date(po.date).getTime(),
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15);

  // 6. Departments live visitor fluctuations
  const getDeptVisitors = (index: number) => {
    const fluctuation = Math.floor(Math.sin((t + index * 1200) / 4000) * 8);
    // Overlay base department visitors with real transactions count
    const deptName = DEPARTMENTS[index];
    const deptTxnsCount = transactions.filter((tx) => tx.dept === deptName).length;
    return 120 + index * 42 + fluctuation + deptTxnsCount * 2;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Operations"
        subtitle="Real-time pulse of GrandSquare Mall"
        actions={
          <div className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
            <Circle className="h-2 w-2 animate-pulse fill-success text-success" />
            Mall Open · Live
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Live label="Footfall now" v={displayFootfall} delta="+12/min" />
        <Live label="Active checkouts" v={displayCheckouts} />
        <Live label="Queue pressure" v="Moderate" tone="warning" />
        <Live label="Sales this hour" v={displaySalesThisHour} tone="success" />
        <Live label="Txn/min" v={displayTxnMin} />
        <Live label="Active staff" v={displayStaff.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Live Sales — hourly" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesChart}>
                <defs>
                  <linearGradient id="ls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `${Number(v) / 1000}K`}
                  width={40}
                />
                <Tooltip contentStyle={ttStyle} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#ls)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Activity Feed" subtitle="Streaming events">
          <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
            {combinedFeed.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-hairline bg-surface p-2 animate-fadeIn"
              >
                <span className="mt-0.5">{ICON[f.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground/90">{f.text}</p>
                  <p className="text-[10px] text-muted-foreground">{f.t}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Departments — live">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {DEPARTMENTS.map((d, i) => (
            <div key={d} className="rounded-lg border border-hairline bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{d}</p>
                <Activity className="h-3 w-3 text-primary" />
              </div>
              <p className="mt-1.5 font-display text-lg font-semibold">{fmt(getDeptVisitors(i))}</p>
              <p className="text-[10px] text-muted-foreground">visitors now</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full gradient-primary" style={{ width: `${30 + i * 6}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function Live({
  label,
  v,
  delta,
  tone,
}: {
  label: string;
  v: string;
  delta?: string;
  tone?: "warning" | "success";
}) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-display text-lg font-semibold ${tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : ""}`}
      >
        {v}
      </p>
      {delta && <p className="text-[10px] text-success">{delta}</p>}
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
