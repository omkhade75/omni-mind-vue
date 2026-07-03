import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, ArrowLeft, ArrowRight, TrendingUp, Users, ShoppingBag, IndianRupee, AlertTriangle, Sparkles } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtINR, fmtNum, getMonthDays, seeded } from "@/lib/mock-data";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/time-machine" as never)({
  head: () => ({
    meta: [
      { title: "Business Time Machine — OmniMind AI" },
      { name: "description", content: "Investigate any date across sales, customers, products, inventory, suppliers, expenses, and operations." },
    ],
  }),
  component: TimeMachine,
});

function TimeMachine() {
  const [month, setMonth] = useState(4); // May
  const year = 2026;
  const cells = useMemo(() => getMonthDays(year, month), [month]);
  const [selected, setSelected] = useState<number | null>(5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Time Machine"
        subtitle="Click any date to open a complete business snapshot with root-cause AI explanation."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_1.4fr]">
        {/* Calendar */}
        <SectionCard
          title={new Date(year, month).toLocaleString("en-IN", { month: "long", year: "numeric" })}
          actions={
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => setMonth((m) => Math.max(0, m - 1))}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setMonth((m) => Math.min(11, m + 1))}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) =>
              c ? (
                <button
                  key={i}
                  onClick={() => setSelected(c.day)}
                  className={cn(
                    "aspect-square rounded-md border p-1 text-left transition-all",
                    selected === c.day
                      ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                      : "border-hairline bg-surface hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{c.day}</span>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        c.state === "peak" && "bg-success",
                        c.state === "good" && "bg-info",
                        c.state === "avg" && "bg-warning",
                        c.state === "low" && "bg-destructive",
                      )}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {fmtINR(c.revenue, { compact: true })}
                  </p>
                  {c.event && (
                    <p className="mt-0.5 truncate text-[9px] text-primary">{c.event}</p>
                  )}
                </button>
              ) : (
                <div key={i} />
              ),
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <Legend color="bg-success" label="Peak day" />
            <Legend color="bg-info" label="Good" />
            <Legend color="bg-warning" label="Average" />
            <Legend color="bg-destructive" label="Low" />
          </div>
        </SectionCard>

        {selected && <DateSnapshot day={selected} month={month} year={year} />}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function DateSnapshot({ day, month, year }: { day: number; month: number; year: number }) {
  const r = seeded(year * 10000 + month * 100 + day);
  const revenue = Math.round(140000 + r() * 120000);
  const profit = Math.round(revenue * (0.16 + r() * 0.08));
  const orders = Math.round(300 + r() * 250);
  const footfall = Math.round(800 + r() * 500);
  const newCustomers = Math.round(30 + r() * 60);
  const dateStr = new Date(year, month, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  const hourly = Array.from({ length: 14 }, (_, i) => {
    const h = i + 9;
    const rr = seeded(day * 100 + h);
    const v = (h >= 18 && h <= 21 ? 32000 : h >= 12 && h <= 14 ? 22000 : 12000) + rr() * 8000;
    return { hour: `${h}:00`, revenue: Math.round(v) };
  });

  const deptRevenue = [
    { name: "Fashion", v: Math.round(revenue * 0.28) },
    { name: "Electronics", v: Math.round(revenue * 0.22) },
    { name: "Grocery", v: Math.round(revenue * 0.18) },
    { name: "Food Court", v: Math.round(revenue * 0.12) },
    { name: "Beauty", v: Math.round(revenue * 0.08) },
    { name: "Others", v: Math.round(revenue * 0.12) },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title={`${dateStr} — Complete Business Snapshot`}
        subtitle="Full drill-down with AI root-cause explanation"
        actions={
          <>
            <Button size="sm" variant="outline" className="border-hairline bg-surface">
              vs Yesterday
            </Button>
            <Button size="sm" variant="outline" className="border-hairline bg-surface">
              vs Last Week
            </Button>
            <Button size="sm" variant="outline" className="border-hairline bg-surface">
              vs Monthly Avg
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <MiniStat label="Total Sales" value={fmtINR(revenue, { compact: true })} icon={<IndianRupee className="h-3.5 w-3.5" />} tone="success" />
          <MiniStat label="Net Profit" value={fmtINR(profit, { compact: true })} icon={<TrendingUp className="h-3.5 w-3.5" />} tone="success" />
          <MiniStat label="Orders" value={fmtNum(orders)} icon={<ShoppingBag className="h-3.5 w-3.5" />} />
          <MiniStat label="Footfall" value={fmtNum(footfall)} icon={<Users className="h-3.5 w-3.5" />} />
          <MiniStat label="New Customers" value={fmtNum(newCustomers)} icon={<Users className="h-3.5 w-3.5" />} tone="info" />
        </div>

        {/* AI Explanation */}
        <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> Why was this day different?
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            Sales on {dateStr.split(",")[0]} were <span className="font-semibold text-success">18.6% above</span> the
            monthly daily average. Primary drivers: a <span className="font-semibold">32% increase in Fashion sales
            between 6 PM and 9 PM</span> and <span className="font-semibold">214 first-time customers</span>.
            Electronics revenue declined 9%, mainly because two high-demand SKUs were out of stock.
          </p>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Hourly Revenue">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly}>
                <defs>
                  <linearGradient id="hr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}K`} width={40} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-hairline)", borderRadius: 6, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#hr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Department Revenue">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptRevenue}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}K`} width={40} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-hairline)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard title="Inventory">
          <ul className="space-y-2 text-xs">
            <Row label="Stock received" v="₹4.2L" />
            <Row label="Stock sold" v="₹1.42L" />
            <Row label="Low-stock events" v="6" />
            <Row label="Stockouts" v="2" tone="danger" />
            <Row label="Expired units" v="14" tone="warning" />
            <Row label="Wastage" v="₹1,240" />
          </ul>
        </SectionCard>

        <SectionCard title="Expenses">
          <ul className="space-y-2 text-xs">
            <Row label="Electricity" v="₹18,240" />
            <Row label="Water" v="₹1,420" />
            <Row label="Salaries allocated" v="₹1.62L" />
            <Row label="Marketing" v="₹8,400" />
            <Row label="Cleaning" v="₹2,800" />
            <Row label="Miscellaneous" v="₹3,140" />
          </ul>
        </SectionCard>

        <SectionCard title="Operations">
          <ul className="space-y-2 text-xs">
            <Row label="Peak hour" v="19:00" tone="success" />
            <Row label="Lowest demand" v="15:00" />
            <Row label="Busiest dept" v="Fashion" />
            <Row label="Staff utilization" v="82%" />
            <Row label="Checkout queue peaks" v="4" />
            <Row label="Anomalies" v="1" tone="warning" />
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "info";
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className={tone === "success" ? "text-success" : tone === "info" ? "text-info" : "text-primary"}>{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, v, tone }: { label: string; v: string; tone?: "warning" | "danger" | "success" }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "font-medium",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-destructive",
        tone === "success" && "text-success",
      )}>
        {v}
      </span>
    </li>
  );
}
