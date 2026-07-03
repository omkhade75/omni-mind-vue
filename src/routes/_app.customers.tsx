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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({
    meta: [
      { title: "Customer Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Segments, lifetime value, churn risk, and customer 360° profiles.",
      },
    ],
  }),
  component: Customers,
});

const SEGMENTS = [
  { name: "VIP", v: 4 },
  { name: "Loyal", v: 2 },
  { name: "Frequent", v: 1 },
  { name: "New", v: 1 },
  { name: "At Risk", v: 1 },
  { name: "Dormant", v: 1 },
];

function Customers() {
  const { scopedCustomers, openCustomer360 } = useBusinessData();
  const [sel, setSel] = useState<any>(null);

  // Sync selected customer when scopedCustomers changes
  useEffect(() => {
    if (scopedCustomers.length > 0) {
      setSel(scopedCustomers[0]);
    } else {
      setSel(null);
    }
  }, [scopedCustomers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Intelligence"
        subtitle="Segments, lifetime value, retention, and churn prediction."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Total Customers" v={fmtNum(scopedCustomers.length * 12 + 1400)} />
        <Kpi label="New (30d)" v="1,284" />
        <Kpi label="Returning" v="68%" />
        <Kpi label="Repeat Rate" v="42%" />
        <Kpi label="Avg LTV" v="₹28.4K" />
        <Kpi label="Churn Risk" v="86" tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Segments" className="xl:col-span-1">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SEGMENTS}
                  dataKey="v"
                  nameKey="name"
                  innerRadius={44}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                >
                  {SEGMENTS.map((_, i) => (
                    <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Acquisition — Last 30 days" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Array.from({ length: 30 }, (_, i) => ({
                  d: `${i + 1}`,
                  new: Math.round(20 + Math.sin(i / 2) * 12 + (i % 3) * 5),
                  returning: Math.round(60 + Math.cos(i / 3) * 20 + (i % 4) * 8),
                }))}
              >
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={ttStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new" fill="var(--color-primary)" name="New" radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="returning"
                  fill="var(--color-cyan)"
                  name="Returning"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="All Customers">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 text-right font-medium">Visits</th>
                  <th className="pb-2 text-right font-medium">Total Spend</th>
                  <th className="pb-2 text-right font-medium">AOV</th>
                  <th className="pb-2 font-medium">Favorite</th>
                  <th className="pb-2 font-medium">Segment</th>
                  <th className="pb-2 text-right font-medium">Churn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {scopedCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSel(c)}
                    className={cn(
                      "cursor-pointer hover:bg-surface/50",
                      sel?.id === c.id && "bg-primary/10",
                    )}
                  >
                    <td className="py-2.5">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.id} · joined {c.joined}
                      </p>
                    </td>
                    <td className="py-2.5 text-right">{fmtNum(c.visits)}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {fmtINR(c.spend, { compact: true })}
                    </td>
                    <td className="py-2.5 text-right">{fmtINR(c.aov)}</td>
                    <td className="py-2.5 text-muted-foreground">{c.favDept}</td>
                    <td className="py-2.5">
                      <StatusPill
                        tone={
                          c.segment === "VIP"
                            ? "violet"
                            : c.segment === "Loyal"
                              ? "success"
                              : c.segment === "At Risk"
                                ? "warning"
                                : c.segment === "Dormant"
                                  ? "danger"
                                  : "info"
                        }
                      >
                        {c.segment}
                      </StatusPill>
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-right font-medium",
                        c.churn > 60
                          ? "text-destructive"
                          : c.churn > 25
                            ? "text-warning"
                            : "text-success",
                      )}
                    >
                      {c.churn}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {sel && (
          <SectionCard
            title="Customer Profile Summary"
            subtitle={sel.name}
            actions={
              <Button
                size="sm"
                variant="outline"
                className="border-hairline bg-surface text-xs font-semibold"
                onClick={() => openCustomer360(sel.id)}
              >
                Open Full 360° Profile
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Total Spend" v={fmtINR(sel.spend, { compact: true })} />
              <Stat label="Avg Basket" v={fmtINR(sel.aov)} />
              <Stat label="Visits" v={fmtNum(sel.visits)} />
              <Stat label="Last Visit" v={sel.lastVisit} />
              <Stat label="Segment" v={sel.segment} />
              <Stat
                label="Churn Risk"
                v={`${sel.churn}%`}
                tone={sel.churn > 60 ? "danger" : "default"}
              />
            </div>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Favorite Department
              </p>
              <p className="mt-1 text-sm font-semibold">{sel.favDept}</p>
            </div>

            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
              <p className="font-semibold text-primary">Recommended CRM Action</p>
              <p className="mt-1 text-foreground/90">
                {sel.churn > 60
                  ? `Trigger win-back offer targeting ${sel.favDept}. Estimated recovery value ₹${(sel.spend / 12).toFixed(0)}.`
                  : sel.segment === "VIP"
                    ? "Enroll in early access for new Fashion arrivals. Historical uplift 22%."
                    : "Send personalized offer bundle from favorite category."}
              </p>
            </div>
          </SectionCard>
        )}
      </div>
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

function Stat({ label, v, tone }: { label: string; v: string; tone?: "default" | "danger" }) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${tone === "danger" ? "text-destructive" : ""}`}>
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
