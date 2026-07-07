import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/departments")({
  head: () => ({
    meta: [
      { title: "Departments — OmniMind AI" },
      { name: "description", content: "Department performance, margins, and staff overview." },
    ],
  }),
  component: Departments,
});

function Departments() {
  const { departmentRevenue } = useBusinessData();

  const totalDeptRevenue = departmentRevenue.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Performance snapshot across all mall departments."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departmentRevenue.map((d, i) => {
          const sharePercent = ((d.value / totalDeptRevenue) * 100).toFixed(1);
          
          return (
            <div key={d.name} className="card-elevated p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Department
                  </p>
                  <p className="mt-1 text-lg font-semibold">{d.name}</p>
                </div>
                <span
                  className="grid h-9 w-9 place-items-center rounded-md text-primary"
                  style={{
                    background: `color-mix(in oklab, var(--chart-${(i % 5) + 1}) 20%, transparent)`,
                  }}
                >
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <Kv label="Revenue" v={fmtINR(d.value, { compact: true })} />
                <Kv label="Margin" v={`${d.margin.toFixed(1)}%`} tone="success" />
                <Kv label="Staff" v={`${12 + i * 3}`} />
              </div>
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full"
                    style={{
                      width: `${sharePercent}%`,
                      background: `var(--chart-${(i % 5) + 1})`,
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <p>Share of total revenue</p>
                  <p className="font-semibold text-foreground">{sharePercent}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kv({ label, v, tone }: { label: string; v: string; tone?: "success" }) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-semibold ${tone === "success" ? "text-success" : ""}`}>{v}</p>
    </div>
  );
}
