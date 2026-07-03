import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { PRODUCTS, fmtINR, fmtNum } from "@/lib/mock-data";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_app/inventory" as never)({
  head: () => ({
    meta: [
      { title: "Inventory Intelligence — OmniMind AI" },
      { name: "description", content: "Inventory value, low stock, stockouts, overstock, and predicted risk." },
    ],
  }),
  component: Inventory,
});

function Inventory() {
  const rows = PRODUCTS;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Intelligence"
        subtitle="Real-time stock across every SKU with predictive stockout and overstock risk."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Total SKUs" v="8,412" />
        <Kpi label="Inventory Value" v="₹3.82Cr" />
        <Kpi label="Low Stock" v="128" tone="warning" />
        <Kpi label="Out of Stock" v="14" tone="danger" />
        <Kpi label="Overstock" v="42" tone="warning" />
        <Kpi label="Dead Stock" v="₹8.4L" tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Inventory by Department" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Grocery", v: 8400000 },
                  { name: "Fashion", v: 12200000 },
                  { name: "Electronics", v: 9800000 },
                  { name: "Beauty", v: 3200000 },
                  { name: "Home", v: 2900000 },
                  { name: "Food Court", v: 620000 },
                  { name: "Pharmacy", v: 780000 },
                ]}
              >
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 100000}L`} width={44} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Movement Speed">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Fast moving", v: 62 },
                    { name: "Moderate", v: 24 },
                    { name: "Slow", v: 10 },
                    { name: "Dead", v: 4 },
                  ]}
                  dataKey="v"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={86}
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
        <SectionCard title="AI Stockout Risk" subtitle="Products likely to run out within 7 days">
          <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">14 products may run out within 7 days</p>
              <p className="text-xs text-muted-foreground">Estimated revenue at risk: ₹4.8L</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {rows.filter((r) => r.status === "low" || r.status === "critical").map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-md border border-hairline bg-surface p-2">
                <Package className="h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.stock} / {r.reorder} reorder</p>
                </div>
                <StatusPill tone={r.status === "critical" ? "danger" : "warning"}>{r.status}</StatusPill>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Overstock & Slow Moving" subtitle="Capital locked in low-velocity SKUs">
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <TrendingDown className="h-8 w-8 text-destructive" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">₹8.4L capital in slow-moving inventory</p>
              <p className="text-xs text-muted-foreground">42 SKUs turning under 4× annually</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {[
              { n: "Winter Down Jackets XL", v: "₹1.2L", d: "78 units · 12mo old" },
              { n: 'Dell 27" 4K Monitor', v: "₹96K", d: "8 units · 220 days" },
              { n: "Nescafé Refill 500g", v: "₹42K", d: "148 units · 90 days" },
              { n: "Home Décor Vases", v: "₹28K", d: "36 units · 180 days" },
            ].map((o) => (
              <li key={o.n} className="flex items-center justify-between rounded-md border border-hairline bg-surface p-2">
                <div>
                  <p className="font-medium">{o.n}</p>
                  <p className="text-[10px] text-muted-foreground">{o.d}</p>
                </div>
                <span className="font-semibold text-warning">{o.v}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function Kpi({ label, v, tone }: { label: string; v: string; tone?: "warning" | "danger" }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1.5 font-display text-lg font-semibold ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : ""}`}>
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
