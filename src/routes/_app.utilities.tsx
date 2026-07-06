import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles, Zap, Droplets, AlertTriangle } from "lucide-react";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtNum, fmtINR } from "@/lib/mock-data";
import { useMemo, useState, useEffect } from "react";
import { getUtilitiesServer } from "@/lib/server-utilities";

export const Route = createFileRoute("/_app/utilities")({
  head: () => ({
    meta: [
      { title: "Utilities Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Electricity and water usage analytics, anomaly detection, and cost forecasting.",
      },
    ],
  }),
  component: Utilities,
});

function Utilities() {
  const { activeDate, utilities } = useBusinessData();
  const { user } = useAuth();
  
  const [electricityToday, setElectricityToday] = useState(12450);
  const [waterToday, setWaterToday] = useState(8120);
  const [dbAnomaly, setDbAnomaly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const payload = { data: { role: user?.role || "owner", email: user?.email || "", activeDate } };
        const data = await getUtilitiesServer(payload);
        setElectricityToday(data.electricityToday);
        setWaterToday(data.waterToday);
        setDbAnomaly(data.isAnomaly);
      } catch (err) {
        console.error("Failed to load utilities", err);
      }
    }
    load();
  }, [user, activeDate]);

  const isMay5 = activeDate === "2026-05-05" || dbAnomaly;

  const hourly = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => {
      const isAnomalyHour = h >= 1 && h <= 4;
      const normal = h < 9 ? 8 : h < 22 ? 24 + Math.sin(h / 3) * 6 : 10;
      const actual = normal + (isAnomalyHour && isMay5 ? 14 : (Math.random() - 0.5) * 1.5);
      return {
        h: `${h}:00`,
        normal: Math.round(normal * 10) / 10,
        actual: Math.round(actual * 10) / 10,
      };
    });
  }, [isMay5]);

  const monthly = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => {
      const monthPrefix = `2026-0${3 + i}`;
      const elecReadings = utilities.filter(
        (u) => u.date.startsWith(monthPrefix) && u.type === "Electricity",
      );
      const waterReadings = utilities.filter(
        (u) => u.date.startsWith(monthPrefix) && u.type === "Water",
      );
      return {
        m: ["March", "April", "May"][i],
        electricity: Math.round(
          (elecReadings.reduce((sum, u) => sum + u.consumption, 0) || 360000) / 1000,
        ), // kWh in thousands
        water: Math.round(
          (waterReadings.reduce((sum, u) => sum + u.consumption, 0) || 240000) / 1000,
        ), // Liters in thousands
      };
    });
  }, [utilities]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilities Intelligence"
        subtitle="Electricity and water usage with AI anomaly detection."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Electricity Today"
          v={`${fmtNum(electricityToday)} kWh`}
          icon={<Zap className="h-4 w-4" />}
        />
        <Kpi label="Monthly Bill (Est.)" v={fmtINR(electricityToday * 30 * 9.5)} tone="warning" />
        <Kpi
          label="Water Today"
          v={`${fmtNum(waterToday)} L`}
          icon={<Droplets className="h-4 w-4" />}
        />
        <Kpi label="Peak Hour" v={isMay5 ? "02:00" : "19:00"} />
      </div>

      <SectionCard
        title="Electricity — 24 hour usage"
        subtitle={
          isMay5
            ? "Actual vs baseline · anomaly detected 01:00–04:00 (HVAC Zone B)"
            : "Actual vs baseline · normal grid conditions"
        }
      >
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
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: any) => `${v} kW`}
                width={54}
              />
              <Tooltip contentStyle={ttStyle} />
              <Area
                type="monotone"
                dataKey="normal"
                stroke="var(--color-cyan)"
                strokeWidth={2}
                fill="url(#norm)"
                name="Baseline"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="var(--color-warning)"
                strokeWidth={2}
                fill="url(#act)"
                name="Actual"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Monthly Consumption Trends (kilo-units)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={ttStyle} />
                <Bar
                  dataKey="electricity"
                  fill="var(--color-primary)"
                  name="Electricity (kwh)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="water"
                  fill="var(--color-cyan)"
                  name="Water (Liters)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="AI Utility Audit">
          {isMay5 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">HVAC Zone B — overnight draw</span>
              </div>
              <p className="mt-2 text-xs text-foreground/90">
                Electricity usage increased{" "}
                <span className="font-semibold">163% between 1 AM and 4 AM</span> despite the mall
                being closed. This has persisted for 11 consecutive days.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Estimated unnecessary monthly cost:{" "}
                <span className="font-semibold text-foreground">₹38,400</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">No critical grid anomalies</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Electricity and water draw remain within normal operational deviation boundaries.
              </p>
            </div>
          )}

          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Recommended AI Action
            </div>
            <p className="mt-1 text-foreground/90 leading-relaxed">
              {isMay5
                ? "Dispatch CoolTech maintenance team to inspect compressor systems and ventilation dampers in Zone B. Expected monthly savings: ₹38.4K."
                : "Schedule automated cleaning of solar power generation panels on rooftop to maintain high baseline output efficiency."}
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Kpi({
  label,
  v,
  tone,
  icon,
}: {
  label: string;
  v: string;
  tone?: "warning";
  icon?: React.ReactNode;
}) {
  return (
    <div className="card-elevated p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {icon && <span className="text-primary">{icon}</span>}
      </div>
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
