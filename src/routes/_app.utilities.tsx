import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles, Zap, Droplets, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/utilities" as never)({
  head: () => ({
    meta: [
      { title: "Utilities Intelligence — OmniMind AI" },
      { name: "description", content: "Electricity and water usage analytics, anomaly detection, and cost forecasting." },
    ],
  }),
  component: Utilities,
});

function Utilities() {
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    h: `${h}:00`,
    normal: h < 9 ? 8 : h < 22 ? 24 + Math.sin(h / 3) * 6 : 10,
    actual: h < 9 ? (h >= 1 && h <= 4 ? 22 : 8) : h < 22 ? 26 + Math.sin(h / 3) * 6 : 12,
  }));

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    m: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i],
    electricity: Math.round(9800 + Math.sin(i / 2) * 800),
    water: Math.round(3200 + Math.cos(i / 2) * 400),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Utilities Intelligence" subtitle="Electricity and water usage with AI anomaly detection." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Electricity Today" v="382 kWh" icon={<Zap className="h-4 w-4" />} />
        <Kpi label="Monthly Bill (Est.)" v="₹4.12L" tone="warning" />
        <Kpi label="Water Today" v="1,240 L" icon={<Droplets className="h-4 w-4" />} />
        <Kpi label="Peak Hour" v="19:00" />
      </div>

      <SectionCard title="Electricity — 24 hour usage" subtitle="Actual vs baseline · anomaly detected 01:00–04:00">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly}>
              <defs>
                <linearGradient id="norm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
              <XAxis dataKey="h" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}kW`} width={44} />
              <Tooltip contentStyle={ttStyle} />
              <Area type="monotone" dataKey="normal" stroke="var(--color-cyan)" strokeWidth={2} fill="url(#norm)" name="Baseline" />
              <Area type="monotone" dataKey="actual" stroke="var(--color-warning)" strokeWidth={2} fill="url(#act)" name="Actual" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Monthly Consumption">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="electricity" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="water" fill="var(--color-cyan)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="AI Anomaly">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">HVAC Zone B — overnight draw</span>
            </div>
            <p className="mt-2 text-xs text-foreground/90">
              Electricity usage increased <span className="font-semibold">23% between 1 AM and 4 AM</span> despite
              the mall being closed. This has persisted for 11 consecutive days.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Estimated unnecessary monthly cost:{" "}
              <span className="font-semibold text-foreground">₹38,400</span>
            </p>
          </div>

          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Recommended Action
            </div>
            <p className="mt-1 text-foreground/90">
              Dispatch maintenance to inspect HVAC Zone B compressor and refrigeration systems. Root cause is
              likely a stuck compressor or coolant leak.
            </p>
            <button className="mt-2 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
              Create work order
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Kpi({ label, v, tone, icon }: { label: string; v: string; tone?: "warning"; icon?: React.ReactNode }) {
  return (
    <div className="card-elevated p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p className={`mt-1.5 font-display text-lg font-semibold ${tone === "warning" ? "text-warning" : ""}`}>{v}</p>
    </div>
  );
}

const ttStyle = { background: "var(--color-popover)", border: "1px solid var(--color-hairline)", borderRadius: 6, fontSize: 12 } as const;
