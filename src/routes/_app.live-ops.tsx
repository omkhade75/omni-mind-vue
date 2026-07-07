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
import { LIVE_FEED, HOURLY_DEMAND, DEPARTMENTS } from "@/lib/mock-data";
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
        <Live label="Footfall now" v="1,842" delta="+12/min" />
        <Live label="Active checkouts" v="18 / 22" />
        <Live label="Queue pressure" v="Moderate" tone="warning" />
        <Live label="Sales this hour" v="₹1.42L" tone="success" />
        <Live label="Txn/min" v="14.2" />
        <Live label="Active staff" v="142" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Live Sales — hourly" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_DEMAND}>
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
            {LIVE_FEED.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-hairline bg-surface p-2"
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
              <p className="mt-1.5 font-display text-lg font-semibold">{fmt(120 + i * 42)}</p>
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
