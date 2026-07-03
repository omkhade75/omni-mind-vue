import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import { DEPARTMENT_REVENUE, fmtINR } from "@/lib/mock-data";
import { Users, TrendingUp } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Performance snapshot across all mall departments."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DEPARTMENT_REVENUE.map((d, i) => (
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
                    width: `${Math.min(100, (d.value / DEPARTMENT_REVENUE[0].value) * 100)}%`,
                    background: `var(--chart-${(i % 5) + 1})`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Share of total revenue</p>
            </div>
          </div>
        ))}
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
