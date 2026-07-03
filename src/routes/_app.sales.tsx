import { createFileRoute } from "@tanstack/react-router";
import { Filter, Download } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
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
import { DEPARTMENT_REVENUE, HOURLY_DEMAND, KPIS, REVENUE_30D, TRANSACTIONS, fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/sales" as never)({
  head: () => ({
    meta: [
      { title: "Sales Intelligence — OmniMind AI" },
      { name: "description", content: "Sales intelligence with department, category, hourly, weekday, and payment splits." },
    ],
  }),
  component: Sales,
});

function Sales() {
  const salesKpis = KPIS.filter((k) => ["revenue", "profit", "orders", "aov"].includes(k.key));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Intelligence"
        subtitle="Real-time and historical sales across departments, categories, and channels."
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5 border-hairline bg-surface">
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-hairline bg-surface">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {salesKpis.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={k.value}
            delta={k.delta}
            spark={k.spark}
            format={k.key === "orders" ? "num" : "inr-compact"}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Sales vs Target" subtitle="30-day performance" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_30D}>
                <defs>
                  <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}K`} width={48} />
                <Tooltip contentStyle={ttStyle} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#s1)" name="Revenue" />
                <Line type="monotone" dataKey="prev" stroke="var(--color-muted-foreground)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Prev period" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Payment Split">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "UPI", v: 48 },
                    { name: "Card", v: 32 },
                    { name: "Cash", v: 14 },
                    { name: "Wallet", v: 6 },
                  ]}
                  dataKey="v"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <Cell key={i} fill={`var(--chart-${i + 1})`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Department Sales" subtitle="Current period">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPARTMENT_REVENUE.slice(0, 8)} layout="vertical">
                <CartesianGrid stroke="var(--color-hairline)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 100000}L`} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Hourly Demand" subtitle="Peak checkout windows">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_DEMAND}>
                <defs>
                  <linearGradient id="hd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={ttStyle} />
                <Area type="monotone" dataKey="footfall" stroke="var(--color-cyan)" strokeWidth={2} fill="url(#hd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent Transactions" subtitle={`${TRANSACTIONS.length} bills · today`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 font-medium">Txn ID</th>
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Dept</th>
                <th className="pb-2 text-right font-medium">Items</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {TRANSACTIONS.slice(0, 12).map((t) => (
                <tr key={t.id} className="hover:bg-surface-2/40">
                  <td className="py-2.5 font-mono text-[11px] text-muted-foreground">{t.id}</td>
                  <td className="py-2.5">{t.time}</td>
                  <td className="py-2.5">{t.customer}</td>
                  <td className="py-2.5 text-muted-foreground">{t.dept}</td>
                  <td className="py-2.5 text-right">{t.items}</td>
                  <td className="py-2.5 text-right font-semibold">{fmtINR(t.amount)}</td>
                  <td className="py-2.5">{t.payment}</td>
                  <td className="py-2.5">
                    <StatusPill tone={t.status === "Completed" ? "success" : "warning"}>{t.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
