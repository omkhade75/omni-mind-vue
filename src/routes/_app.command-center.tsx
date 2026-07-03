import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  IndianRupee,
  ShoppingBag,
  Users,
  Wallet,
  Package,
  Receipt,
  TrendingUp,
  Warehouse,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FORECAST, HEATMAP, HOURLY_DEMAND, fmtINR, fmtNum } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useBusinessData, type KpiItem } from "@/lib/business-context";
import { getCommandCenterServer } from "@/lib/server-analytics";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/command-center")({
  head: () => ({
    meta: [
      { title: "Command Center — OmniMind AI" },
      {
        name: "description",
        content:
          "Executive command center for mall owners: KPIs, AI briefs, revenue analytics, forecasts, and recommendations.",
      },
    ],
  }),
  component: CommandCenter,
});

const ICONS: Record<string, React.ReactNode> = {
  revenue: <IndianRupee className="h-4 w-4" />,
  profit: <TrendingUp className="h-4 w-4" />,
  orders: <ShoppingBag className="h-4 w-4" />,
  footfall: <Users className="h-4 w-4" />,
  newCustomers: <Users className="h-4 w-4" />,
  aov: <Receipt className="h-4 w-4" />,
  inventory: <Warehouse className="h-4 w-4" />,
  expenses: <Wallet className="h-4 w-4" />,
};

function CommandCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const greeting = greetingFor(new Date());

  const {
    timeSeriesData,
    departmentRevenue,
    scopedRecommendations,
    scopedTransactions,
    transactions,
    activeDate,
  } = useBusinessData();

  const [liveKpis, setLiveKpis] = useState<KpiItem[]>([]);
  
  useEffect(() => {
    async function load() {
      const res = await getCommandCenterServer({ data: { role: user?.role || "owner", email: user?.email || "", activeDate } });
      setLiveKpis([
        { key: "revenue", label: "Gross Revenue", value: res.grossRevenue, delta: 8.4 },
        { key: "profit", label: "Net Profit", value: res.netProfit, delta: 4.1 },
        { key: "orders", label: "Total Orders", value: res.orders, delta: 6.2 },
        { key: "expenses", label: "Total Expenses", value: res.expenses, delta: 5.4 },
      ]);
    }
    load();
  }, [activeDate, user]);

  const [chartResolution, setChartResolution] = useState<"Hourly" | "Daily" | "Weekly" | "Monthly">(
    "Daily",
  );

  // Construct chart data based on resolution
  const resolvedChartData = useMemo(() => {
    if (chartResolution === "Hourly") {
      // 9:00 to 22:00
      return Array.from({ length: 14 }, (_, i) => {
        const hour = 9 + i;
        const hourStr = `${String(hour).padStart(2, "0")}:00`;
        const txns = scopedTransactions.filter((t) =>
          t.time.startsWith(String(hour).padStart(2, "0")),
        );
        const revenue = txns.reduce(
          (sum, t) => (t.status === "Completed" ? sum + t.total : sum),
          0,
        );
        const profit = Math.round(revenue * 0.18); // 18% margin
        return {
          day: hourStr,
          revenue,
          profit,
        };
      });
    }

    if (chartResolution === "Weekly") {
      // Group timeSeriesData into weeks (e.g. 7 days each)
      const chunks: any[] = [];
      const chunkSize = 7;
      for (let i = 0; i < timeSeriesData.length; i += chunkSize) {
        const chunk = timeSeriesData.slice(i, i + chunkSize);
        const revenue = chunk.reduce((sum, d) => sum + d.revenue, 0);
        const profit = chunk.reduce((sum, d) => sum + d.profit, 0);
        chunks.push({
          day: `Week ${chunks.length + 1}`,
          revenue,
          profit,
        });
      }
      return chunks;
    }

    if (chartResolution === "Monthly") {
      // Show March, April, May from the whole database
      const monthsList = ["March", "April", "May"];
      return monthsList.map((m, idx) => {
        const monthPrefix = `2026-0${3 + idx}`;
        const txns = transactions.filter((t) => t.date.startsWith(monthPrefix));
        const revenue = txns.reduce(
          (sum, t) => (t.status === "Completed" ? sum + t.total : sum),
          0,
        );
        const profit = Math.round(revenue * 0.18);
        return {
          day: m,
          revenue,
          profit,
        };
      });
    }

    // Default "Daily" resolution
    return timeSeriesData;
  }, [chartResolution, timeSeriesData, scopedTransactions, transactions, activeDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.name.split(" ")[0] ?? "Owner"}`}
        subtitle={
          user?.role === "manager"
            ? "Here is what is happening across your Fashion department today."
            : "Here is what is happening across GrandSquare Mall today."
        }
        actions={
          <>
            <DateRange />
            <Button
              variant="outline"
              size="sm"
              className="border-hairline bg-surface"
              onClick={() => navigate({ to: "/time-machine" as never })}
            >
              Time Machine
            </Button>
            <Button
              size="sm"
              className="gap-1.5 gradient-primary text-primary-foreground"
              onClick={() => navigate({ to: "/ai-decisions" as never })}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask OmniMind
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {liveKpis.length > 0 ? liveKpis.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={k.value}
            delta={k.delta}
            spark={k.spark}
            icon={ICONS[k.key]}
            format={
              k.key === "orders" || k.key === "footfall" || k.key === "newCustomers"
                ? "num"
                : "inr-compact"
            }
          />
        )) : (
          <div className="col-span-4 text-center text-muted-foreground p-4">Loading KPIs from database...</div>
        )}
      </div>

      {/* Executive brief */}
      <ExecutiveBrief />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title={`Revenue vs Profit — ${chartResolution}`}
          subtitle={`${chartResolution} gross revenue against realized net profit`}
          className="xl:col-span-2"
          actions={
            <div className="flex gap-1 rounded-md border border-hairline bg-surface p-0.5 text-[11px]">
              {(["Hourly", "Daily", "Weekly", "Monthly"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setChartResolution(t)}
                  className={
                    chartResolution === t
                      ? "rounded-sm bg-primary/20 px-2 py-0.5 text-foreground font-semibold"
                      : "px-2 py-0.5 text-muted-foreground hover:text-foreground"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resolvedChartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `₹${Number(v) / 1000}K`}
                  width={54}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2}
                  fill="url(#prof)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Department Contribution" subtitle="Revenue share this period">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentRevenue}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={92}
                  paddingAngle={2}
                >
                  {departmentRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => fmtINR(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            {departmentRevenue.slice(0, 5).map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="min-w-0 truncate text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-medium">{fmtINR(d.value, { compact: true })}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Heatmap + forecast */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title="Sales Heatmap"
          subtitle="Day of week × hour · footfall intensity"
          className="xl:col-span-2"
        >
          <Heatmap />
        </SectionCard>
        <SectionCard title="Revenue Forecast" subtitle="Next 7 days · with confidence band">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={FORECAST}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} hide />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `${Number(v) / 1000}K`}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="var(--color-primary)"
                  fillOpacity={0.08}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="var(--color-background)"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-cyan)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 rounded-md border border-hairline bg-surface p-3 text-xs">
            <p className="font-medium">Next Saturday</p>
            <p className="mt-1 text-muted-foreground">
              Predicted revenue <span className="font-semibold text-foreground">₹62.4L</span> ±
              ₹4.1L · Confidence 89%
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Recommendations feed */}
      <SectionCard
        title="AI Recommendations"
        subtitle="Evidence-backed next actions ranked by expected impact"
        actions={
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs"
            onClick={() => navigate({ to: "/ai-decisions" as never })}
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scopedRecommendations.slice(0, 3).map((r) => (
            <RecCard key={r.id} r={r} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ExecutiveBrief() {
  const { executiveBrief } = useBusinessData();
  return (
    <section className="card-elevated relative overflow-hidden">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-violet/10 blur-3xl" />
      <div className="relative p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Today's Executive Brief
          </span>
          <span className="text-[11px] text-muted-foreground">
            Generated 2 min ago · Confidence 92%
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{executiveBrief.summary}</p>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <BriefBlock
            tone="success"
            title="Positive developments"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            items={executiveBrief.positives}
          />
          <BriefBlock
            tone="danger"
            title="Risks"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            items={executiveBrief.risks}
          />
          <BriefBlock
            tone="violet"
            title="Opportunities"
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            items={executiveBrief.opportunities}
          />
        </div>
      </div>
    </section>
  );
}

function BriefBlock({
  tone,
  title,
  icon,
  items,
}: {
  tone: "success" | "danger" | "violet";
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  const toneClass: Record<string, string> = {
    success: "text-success",
    danger: "text-destructive",
    violet: "text-violet",
  };
  return (
    <div className="rounded-lg border border-hairline bg-surface/60 p-3">
      <div
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${toneClass[tone]}`}
      >
        {icon} {title}
      </div>
      <ul className="mt-2 space-y-1.5 text-xs text-foreground/90">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${toneClass[tone]} bg-current`}
            />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecCard({ r }: { r: any }) {
  const { acceptRecommendation, openRecommendation } = useBusinessData();
  const tone = r.severity === "Critical" ? "danger" : r.severity === "High" ? "warning" : "info";
  const isAccepted = r.status === "Accepted";
  return (
    <div className="rounded-lg border border-hairline bg-surface p-3.5 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-2">
        <StatusPill tone={tone}>{r.severity}</StatusPill>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {r.category}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">{r.generated}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{r.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.evidence}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-medium text-success">{r.impact}</span>
        <span className="text-[11px] text-muted-foreground">
          <span className="text-foreground">{r.confidence}%</span> conf.
        </span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {isAccepted ? (
          <span className="flex-1 text-center py-1.5 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 rounded-md">
            Accepted
          </span>
        ) : (
          <>
            <button
              onClick={() => acceptRecommendation(r.id)}
              className="flex-1 rounded-md bg-primary/15 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/25"
            >
              Accept
            </button>
            <button
              onClick={() => openRecommendation(r.id)}
              className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            >
              Investigate
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Heatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 14 }, (_, i) => 9 + i);
  const max = Math.max(...HEATMAP.map((d) => d.v));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="mb-1 grid grid-cols-[40px_repeat(14,minmax(0,1fr))] gap-1">
          <span />
          {hours.map((h) => (
            <span key={h} className="text-center text-[10px] text-muted-foreground">
              {h}
            </span>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className="mb-1 grid grid-cols-[40px_repeat(14,minmax(0,1fr))] gap-1">
            <span className="flex items-center text-[11px] text-muted-foreground">{d}</span>
            {hours.map((h) => {
              const cell = HEATMAP.find((c) => c.day === d && c.hour === `${h}`)!;
              const intensity = cell.v / max;
              return (
                <div
                  key={h}
                  className="h-6 rounded-sm border border-hairline"
                  style={{
                    background: `color-mix(in oklab, var(--color-primary) ${Math.round(
                      intensity * 90,
                    )}%, transparent)`,
                  }}
                  title={`${d} ${h}:00 · ${cell.v}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DateRange() {
  const { timeRange, changeTimeRange } = useBusinessData();
  const ranges: { label: string; value: any }[] = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "Custom", value: "custom" },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-hairline bg-surface p-0.5 text-[11px]">
      {ranges.map((r) => (
        <button
          key={r.value}
          onClick={() => changeTimeRange(r.value)}
          className={
            timeRange === r.value
              ? "rounded-sm bg-primary/20 px-2 py-1 text-foreground font-semibold"
              : "px-2 py-1 text-muted-foreground hover:text-foreground"
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-md px-2.5 py-1.5 text-xs shadow-elevated">
      {label && (
        <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      )}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color ?? p.fill }} />
          <span className="text-muted-foreground">{p.name ?? p.dataKey}</span>
          <span className="ml-auto font-semibold">
            {typeof p.value === "number" ? fmtINR(p.value, { compact: true }) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
