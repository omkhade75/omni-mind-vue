import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Area, AreaChart, Cell, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EXPENSE_CATEGORIES, EXPENSES, fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/expenses" as never)({
  head: () => ({
    meta: [
      { title: "Expense Intelligence — OmniMind AI" },
      { name: "description", content: "Track every mall expense with category breakdowns and predictive month-end forecast." },
    ],
  }),
  component: Expenses,
});

function Expenses() {
  const total = EXPENSE_CATEGORIES.reduce((a, b) => a + b.value, 0);
  const trend = Array.from({ length: 12 }, (_, i) => ({
    m: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"][i],
    v: Math.round(9800000 + Math.sin(i / 2) * 400000 + Math.random() * 300000),
  }));
  return (
    <div className="space-y-6">
      <PageHeader title="Expense Intelligence" subtitle="Cost tracking, category breakdowns, and month-end forecast." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="This Month" v={fmtINR(total, { compact: true })} />
        <Kpi label="MoM Change" v="+5.4%" tone="warning" />
        <Kpi label="Expense/Revenue" v="25.6%" />
        <Kpi label="Top Category" v="Salaries" />
        <Kpi label="Predicted EOM" v="₹1.08Cr" />
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
                <XAxis dataKey="m" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 100000}L`} width={44} />
                <Tooltip contentStyle={ttStyle} />
                <Area type="monotone" dataKey="v" stroke="var(--color-warning)" strokeWidth={2} fill="url(#e1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="By Category">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={EXPENSE_CATEGORIES} dataKey="value" nameKey="name" innerRadius={50} outerRadius={88} paddingAngle={2} stroke="var(--color-background)" strokeWidth={2}>
                  {EXPENSE_CATEGORIES.map((_, i) => (
                    <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Expense Log">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 font-medium">ID</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Vendor</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2 font-medium">Dept</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {EXPENSES.map((e) => (
                <tr key={e.id} className="hover:bg-surface-2/40">
                  <td className="py-2.5 font-mono text-[11px] text-muted-foreground">{e.id}</td>
                  <td className="py-2.5">{e.date}</td>
                  <td className="py-2.5">{e.category}</td>
                  <td className="py-2.5">{e.desc}</td>
                  <td className="py-2.5 text-muted-foreground">{e.vendor}</td>
                  <td className="py-2.5 text-right font-semibold">{fmtINR(e.amount)}</td>
                  <td className="py-2.5 text-muted-foreground">{e.dept}</td>
                  <td className="py-2.5">
                    <StatusPill tone={e.status === "Paid" ? "success" : "warning"}>{e.status}</StatusPill>
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

function Kpi({ label, v, tone }: { label: string; v: string; tone?: "warning" }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1.5 font-display text-lg font-semibold ${tone === "warning" ? "text-warning" : ""}`}>{v}</p>
    </div>
  );
}

const ttStyle = { background: "var(--color-popover)", border: "1px solid var(--color-hairline)", borderRadius: 6, fontSize: 12 } as const;
