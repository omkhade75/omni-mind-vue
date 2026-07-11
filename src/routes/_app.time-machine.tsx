import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Users,
  ShoppingBag,
  IndianRupee,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtINR, fmtNum, getMonthDays } from "@/lib/mock-data";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBusinessData } from "@/lib/business-context";

export const Route = createFileRoute("/_app/time-machine")({
  head: () => ({
    meta: [
      { title: "Business Time Machine — OmniMind AI" },
      {
        name: "description",
        content:
          "Investigate any date across sales, customers, products, inventory, suppliers, expenses, and operations.",
      },
    ],
  }),
  component: TimeMachine,
});

export function TimeMachine() {
  const navigate = useNavigate();
  const { activeDate, changeDate, products, openProduct360, transactions } = useBusinessData();

  const parsedDate = new Date(activeDate);
  const [month, setMonth] = useState(parsedDate.getMonth()); // Month (0-11)
  const [year, setYear] = useState(parsedDate.getFullYear());

  const cells = useMemo(() => {
    const baseCells = getMonthDays(year, month);
    return baseCells.map((cell) => {
      if (!cell) return null;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
      const dayTxns = transactions.filter((t: any) => t.date.split("T")[0] === dateStr);
      if (dayTxns.length > 0) {
        const actualRevenue = dayTxns.reduce(
          (sum: number, t: any) => (t.status === "Completed" ? sum + t.total : sum),
          0,
        );
        const state =
          actualRevenue > 200000
            ? "peak"
            : actualRevenue > 150000
              ? "good"
              : actualRevenue > 110000
                ? "avg"
                : "low";
        return {
          ...cell,
          revenue: actualRevenue,
          state,
        };
      }
      return cell;
    });
  }, [month, year, transactions]);

  const handleSelectDay = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    changeDate(formatted);
  };

  const selectedDay =
    parsedDate.getFullYear() === year && parsedDate.getMonth() === month
      ? parsedDate.getDate()
      : null;

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
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setMonth((m) => {
                    if (m === 0) {
                      setYear((y) => y - 1);
                      return 11;
                    }
                    return m - 1;
                  });
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setMonth((m) => {
                    if (m === 11) {
                      setYear((y) => y + 1);
                      return 0;
                    }
                    return m + 1;
                  });
                }}
              >
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
                  onClick={() => handleSelectDay(c.day)}
                  className={cn(
                    "aspect-square rounded-md border p-1 text-left transition-all flex flex-col justify-between min-h-[64px]",
                    selectedDay === c.day
                      ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                      : "border-hairline bg-surface hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between w-full">
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
                  <p className="mt-1 text-[10px] text-muted-foreground font-medium">
                    {fmtINR(c.revenue, { compact: true })}
                  </p>
                  {c.event && <p className="mt-0.5 truncate text-[9px] text-primary">{c.event}</p>}
                </button>
              ) : (
                <div key={i} className="aspect-square bg-transparent border-none" />
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

        {selectedDay && <DateSnapshot />}
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

function DateSnapshot() {
  const navigate = useNavigate();
  const {
    activeDate,
    dailySnapshot,
    scopedTransactions,
    scopedExpenses,
    scopedAnomalies,
    products,
    openProduct360,
    openSupplier360,
  } = useBusinessData();

  const dateStr = new Date(activeDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  const revenue = dailySnapshot.grossRevenue;
  const profit = dailySnapshot.netProfit;
  const orders = dailySnapshot.orders;
  const footfall = dailySnapshot.footfall;
  const newCustomers = dailySnapshot.newCustomers;

  // Derive hourly sales
  const hourly = Array.from({ length: 14 }, (_, i) => {
    const h = i + 9;
    const hourStr = `${String(h).padStart(2, "0")}:00`;
    const txns = scopedTransactions.filter(
      (t) => t.date === activeDate && t.time.startsWith(String(h).padStart(2, "0")),
    );
    const rev = txns.reduce((sum, t) => (t.status === "Completed" ? sum + t.total : sum), 0);
    return {
      hour: hourStr,
      revenue: rev || Math.round(revenue * (h >= 18 && h <= 21 ? 0.15 : 0.05)),
    };
  });

  // Department share
  const depts = ["Fashion", "Electronics", "Grocery", "Food Court", "Beauty", "Others"];
  const deptRevenue = depts.map((d) => {
    const txns = scopedTransactions.filter(
      (t) =>
        t.date === activeDate &&
        (d === "Others"
          ? !["Fashion", "Electronics", "Grocery", "Food Court", "Beauty"].includes(t.dept)
          : t.dept === d),
    );
    const rev = txns.reduce((sum, t) => (t.status === "Completed" ? sum + t.total : sum), 0);
    return {
      name: d,
      v: rev || Math.round(revenue * (d === "Fashion" ? 0.32 : d === "Electronics" ? 0.22 : 0.1)),
    };
  });

  const isMay5 = activeDate === "2026-05-05";
  const explanationText = isMay5
    ? `Gross Revenue was ₹3.14L (21.4% above average), driven by Fashion and Electronics after 6 PM. New Customers acquired: 14. Anomaly Alert: HVAC Zone B energy draw spike (+163%) detected overnight. Critical Action: Approve dairy reorder recommendation for Amul Milk.`
    : `Gross Revenue was ${fmtINR(revenue)} with ${orders} completed orders. Footfall was estimated at ${fmtNum(footfall)} visitors, with ${newCustomers} new customer registrations. Operations remained stable with average queue length below 3.`;

  return (
    <div className="space-y-4">
      <SectionCard
        title={`${dateStr} — Complete Business Snapshot`}
        subtitle="Full drill-down with AI root-cause explanation"
        actions={
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="border-hairline bg-surface hover:bg-surface-hover text-xs"
              onClick={() => navigate({ to: "/sales" as never })}
            >
              View Sales
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-hairline bg-surface hover:bg-surface-hover text-xs"
              onClick={() => navigate({ to: "/expenses" as never })}
            >
              View Expenses
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <button onClick={() => navigate({ to: "/sales" as never })} className="text-left">
            <MiniStat
              label="Total Sales"
              value={fmtINR(revenue, { compact: true })}
              icon={<IndianRupee className="h-3.5 w-3.5" />}
              tone="success"
            />
          </button>
          <button onClick={() => navigate({ to: "/sales" as never })} className="text-left">
            <MiniStat
              label="Net Profit"
              value={fmtINR(profit, { compact: true })}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              tone="success"
            />
          </button>
          <button onClick={() => navigate({ to: "/transactions" as never })} className="text-left">
            <MiniStat
              label="Orders"
              value={fmtNum(orders)}
              icon={<ShoppingBag className="h-3.5 w-3.5" />}
            />
          </button>
          <button onClick={() => navigate({ to: "/live-ops" as never })} className="text-left">
            <MiniStat
              label="Footfall"
              value={fmtNum(footfall)}
              icon={<Users className="h-3.5 w-3.5" />}
            />
          </button>
          <button onClick={() => navigate({ to: "/customers" as never })} className="text-left">
            <MiniStat
              label="New Customers"
              value={fmtNum(newCustomers)}
              icon={<Users className="h-3.5 w-3.5" />}
              tone="info"
            />
          </button>
        </div>

        {/* AI Explanation */}
        <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> Why was this day different?
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{explanationText}</p>
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
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `${Number(v) / 1000}K`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#hr)"
                />
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
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `${Number(v) / 1000}K`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard title="Inventory Snapshot">
          <ul className="space-y-2 text-xs">
            <button className="w-full text-left" onClick={() => openProduct360("SKU-10021")}>
              <Row label="Amul Taaza Milk stock" v="128 units" tone="warning" />
            </button>
            <button className="w-full text-left" onClick={() => openProduct360("SKU-11023")}>
              <Row label="Nestlé Yogurt stock" v="42 units" tone="danger" />
            </button>
            <Row
              label="Low-stock events"
              v={products.filter((p) => p.stock <= p.reorder).length.toString()}
            />
            <Row label="Total SKU categories" v="10" />
          </ul>
        </SectionCard>

        <SectionCard title="Expenses Snapshot">
          <ul className="space-y-2 text-xs">
            <Row label="Electricity charges" v={isMay5 ? "₹4.12L" : "₹18,240"} />
            <Row label="Water billing" v="₹1,420" />
            <Row label="Salaries allocated" v="₹1.62L" />
            <Row
              label="Daily operations expenses"
              v={fmtINR(scopedExpenses.reduce((sum, e) => sum + e.amount, 0))}
            />
          </ul>
        </SectionCard>

        <SectionCard title="Operations Snapshot">
          <ul className="space-y-2 text-xs">
            <Row label="Peak hour" v={isMay5 ? "19:00" : "18:00"} tone="success" />
            <Row label="Busiest dept" v="Fashion" />
            <button
              className="w-full text-left"
              onClick={() => navigate({ to: "/anomalies" as never })}
            >
              <Row
                label="Anomalies detected"
                v={scopedAnomalies.length.toString()}
                tone={scopedAnomalies.length > 0 ? "danger" : "success"}
              />
            </button>
            <button className="w-full text-left" onClick={() => openSupplier360("SUP-001")}>
              <Row label="Supplier deliveries" v="1 (Amul Foods)" />
            </button>
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
    <div className="rounded-lg border border-hairline bg-surface p-3 w-full transition-colors hover:border-primary/30">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span
          className={
            tone === "success" ? "text-success" : tone === "info" ? "text-info" : "text-primary"
          }
        >
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-1.5 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function Row({
  label,
  v,
  tone,
}: {
  label: string;
  v: string;
  tone?: "warning" | "danger" | "success";
}) {
  return (
    <li className="flex items-center justify-between py-1 hover:bg-surface-hover rounded px-1 transition-colors">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
        )}
      >
        {v}
      </span>
    </li>
  );
}
