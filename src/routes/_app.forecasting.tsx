import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FORECAST } from "@/lib/mock-data";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/forecasting")({
  head: () => ({
    meta: [
      { title: "Forecasting — OmniMind AI" },
      {
        name: "description",
        content: "Revenue, footfall, inventory and expense forecasts with scenario planning.",
      },
    ],
  }),
  component: Forecasting,
});

const SCENARIOS = [
  "Normal",
  "Festival Demand",
  "Promotion Campaign",
  "Rainy Weekend",
  "Supplier Delay",
];

function Forecasting() {
  const [scenario, setScenario] = useState("Normal");
  const [horizon, setHorizon] = useState("7d");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecasting Center"
        subtitle="Predict revenue, footfall, and inventory across scenarios."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface p-0.5 text-[11px]">
          {["7d", "30d", "90d"].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                "rounded-sm px-2.5 py-1",
                horizon === h ? "bg-primary/20 text-foreground" : "text-muted-foreground",
              )}
            >
              Next {h}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface p-0.5 text-[11px]">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={cn(
                "rounded-sm px-2.5 py-1",
                scenario === s
                  ? "bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <SectionCard title="Revenue Forecast" subtitle={`${horizon} · scenario: ${scenario}`}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={FORECAST}>
              <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: any) => `${Number(v) / 1000}K`}
                width={44}
              />
              <Tooltip contentStyle={ttStyle} />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="var(--color-primary)"
                fillOpacity={0.08}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--color-background)"
                fillOpacity={1}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--color-cyan)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-primary)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Forecast Summary
          </div>
          <p className="mt-1 text-foreground/90">
            Next Saturday revenue is forecast at{" "}
            <span className="font-semibold text-foreground">₹62.4L ± ₹4.1L</span>. Under the{" "}
            <span className="font-semibold">{scenario}</span> scenario, expect Fashion contribution
            to shift by ±6.2% and Grocery baseline to hold within 2%.
          </p>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { t: "Footfall", v: "34.2K", c: "+9.4%" },
          { t: "Orders", v: "13,820", c: "+6.1%" },
          { t: "Inventory Draw", v: "₹1.42Cr", c: "+11.8%" },
        ].map((k) => (
          <div key={k.t} className="card-elevated p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Forecast · {k.t}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">{k.v}</p>
            <p className="mt-1 text-xs text-success">{k.c} vs current period</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
