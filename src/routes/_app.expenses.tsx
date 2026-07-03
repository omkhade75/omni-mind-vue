import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR } from "@/lib/mock-data";
import { useMemo, useState, useEffect } from "react";
import { getExpensesServer, type ExpenseListItem } from "@/lib/server-expenses";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({
    meta: [
      { title: "Expense Intelligence — OmniMind AI" },
      {
        name: "description",
        content:
          "Track every mall expense with category breakdowns and predictive month-end forecast.",
      },
    ],
  }),
  component: Expenses,
});

function Expenses() {
  const { user } = useAuth();
  const [scopedExpenses, setScopedExpenses] = useState<ExpenseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const payload = { data: { role: user?.role || "owner", email: user?.email || "" } };
        const data = await getExpensesServer(payload);
        setScopedExpenses(data);
      } catch (err) {
        console.error("Failed to load expenses", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const total = useMemo(() => {
    return scopedExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [scopedExpenses]);

  const categoriesData = useMemo(() => {
    const map: Record<string, number> = {};
    scopedExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [scopedExpenses]);

  // Construct a trend
  const trend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      m: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"][i],
      v: Math.round(18000 + Math.sin(i / 2) * 5000 + total * 0.1),
    }));
  }, [total]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Intelligence"
        subtitle="Cost tracking, category breakdowns, and month-end forecast."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Current Scoped Expenses" v={fmtINR(total)} />
        <Kpi label="MoM Change" v="-2.1%" />
        <Kpi label="Expense/Revenue Ratio" v="25.6%" />
        <Kpi
          label="Top Category"
          v={
            categoriesData.length > 0
              ? categoriesData.reduce(
                  (max, c) => (c.value > max.value ? c : max),
                  categoriesData[0],
                ).name
              : "N/A"
          }
        />
        <Kpi label="Predicted Month End" v={fmtINR(total * 1.5)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Monthly Trend" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="e1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `₹${Number(v) / 1000}K`}
                  width={44}
                />
                <Tooltip contentStyle={ttStyle} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-warning)"
                  strokeWidth={2}
                  fill="url(#e1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="By Category">
          <div className="h-64">
            {categoriesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No expense entries found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriesData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                  >
                    {categoriesData.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} formatter={(v: any) => fmtINR(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Expense Log"
        subtitle={`${scopedExpenses.length} entries for current scope`}
      >
        <div className="overflow-x-auto min-h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
                <th className="pb-3 font-semibold">ID</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Description</th>
                <th className="pb-3 font-semibold">Vendor</th>
                <th className="pb-3 text-right font-semibold pr-4">Amount</th>
                <th className="pb-3 font-semibold pl-4">Dept</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {scopedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                [...scopedExpenses].reverse().map((e) => (
                  <tr key={e.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 font-mono text-[11px] text-muted-foreground">{e.id}</td>
                    <td className="py-3">{e.date}</td>
                    <td className="py-3 font-medium text-foreground">{e.category}</td>
                    <td className="py-3 text-muted-foreground">{e.description}</td>
                    <td className="py-3 text-muted-foreground">{e.vendor}</td>
                    <td className="py-3 text-right font-semibold pr-4">{fmtINR(e.amount)}</td>
                    <td className="py-3 pl-4 text-muted-foreground">{e.departmentId || "Mall-wide"}</td>
                    <td className="py-3">
                      <StatusPill tone={e.status === "Paid" ? "success" : "warning"}>
                        {e.status}
                      </StatusPill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function Kpi({ label, v, tone }: { label: string; v: string; tone?: "warning" }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-display text-lg font-semibold ${tone === "warning" ? "text-warning" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
