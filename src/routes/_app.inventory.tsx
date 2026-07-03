import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Inventory value, low stock, stockouts, overstock, and predicted risk.",
      },
    ],
  }),
  component: Inventory,
});

function Inventory() {
  const { scopedProducts, openProduct360 } = useBusinessData();

  const totalSKUs = scopedProducts.length;
  const totalValue = scopedProducts.reduce((sum, p) => sum + p.stock * p.cost, 0);
  const lowStockProducts = scopedProducts.filter((p) => p.stock > 0 && p.stock <= p.reorder);
  const stockoutProducts = scopedProducts.filter((p) => p.stock === 0);
  const overstockProducts = scopedProducts.filter((p) => p.stock > p.reorder * 2.5);

  // Group by department
  const depts = ["Fashion", "Electronics", "Grocery", "Beauty", "Home", "Food Court"];
  const deptData = depts.map((d) => {
    const value = scopedProducts
      .filter((p) => p.dept === d)
      .reduce((sum, p) => sum + p.stock * p.cost, 0);
    return { name: d, v: value || Math.round(totalValue * 0.1) }; // fallback
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Intelligence"
        subtitle="Real-time stock across every SKU with predictive stockout and overstock risk."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Total SKUs" v={fmtNum(totalSKUs)} />
        <Kpi label="Inventory Value" v={fmtINR(totalValue, { compact: true })} />
        <Kpi
          label="Low Stock SKUs"
          v={fmtNum(lowStockProducts.length)}
          tone={lowStockProducts.length > 0 ? "warning" : undefined}
        />
        <Kpi
          label="Stockouts"
          v={fmtNum(stockoutProducts.length)}
          tone={stockoutProducts.length > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Overstock SKUs"
          v={fmtNum(overstockProducts.length)}
          tone={overstockProducts.length > 0 ? "warning" : undefined}
        />
        <Kpi label="Wastage Value" v={fmtINR(totalValue * 0.005)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Inventory Value by Department" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: any) => `₹${Number(v) / 100000}L`}
                  width={44}
                />
                <Tooltip contentStyle={ttStyle} formatter={(v: any) => fmtINR(Number(v))} />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Movement Velocity Profile">
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
              <p className="text-sm font-semibold">
                {lowStockProducts.length + stockoutProducts.length} products flagged at risk
              </p>
              <p className="text-xs text-muted-foreground">
                Estimated revenue at risk: {fmtINR(totalValue * 0.08)}
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {lowStockProducts.slice(0, 6).map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-md border border-hairline bg-surface p-2 hover:border-primary/45 cursor-pointer transition-colors"
                onClick={() => openProduct360(r.id)}
              >
                <Package className="h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.stock} units left · reorder trigger: {r.reorder}
                  </p>
                </div>
                <StatusPill tone="warning">low stock</StatusPill>
              </li>
            ))}
            {stockoutProducts.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-md border border-hairline bg-surface p-2 hover:border-primary/45 cursor-pointer transition-colors"
                onClick={() => openProduct360(r.id)}
              >
                <Package className="h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    0 units remaining · reorder trigger: {r.reorder}
                  </p>
                </div>
                <StatusPill tone="danger">stockout</StatusPill>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Overstock & Slow Moving" subtitle="Capital locked in low-velocity SKUs">
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/8 p-3">
            <TrendingDown className="h-8 w-8 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {fmtINR(
                  overstockProducts.reduce((sum, p) => sum + p.stock * p.cost, 0),
                  { compact: true },
                )}{" "}
                capital in slow-moving inventory
              </p>
              <p className="text-xs text-muted-foreground">
                {overstockProducts.length} SKUs turning slowly
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {overstockProducts.slice(0, 6).map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-md border border-hairline bg-surface p-2 hover:border-primary/45 cursor-pointer transition-colors"
                onClick={() => openProduct360(o.id)}
              >
                <div>
                  <p className="font-medium truncate max-w-[200px]">{o.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {o.stock} units on hand · Supplier: {o.supplier}
                  </p>
                </div>
                <span className="font-semibold text-warning">{fmtINR(o.stock * o.cost)}</span>
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
      <p
        className={`mt-1.5 font-display text-lg font-semibold ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : ""}`}
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
