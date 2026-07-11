import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtINR, fmtNum } from "@/lib/mock-data";

interface KpiCardProps {
  label: string;
  value: number;
  delta?: number;
  spark?: { i: number; v: number }[];
  format?: "inr" | "inr-compact" | "num";
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  delta,
  spark,
  format = "inr-compact",
  icon,
  onClick,
}: KpiCardProps) {
  const hasDelta = delta !== undefined;
  const positive = hasDelta ? delta! >= 0 : true;
  const display =
    format === "inr"
      ? fmtINR(value)
      : format === "inr-compact"
        ? fmtINR(value, { compact: true })
        : fmtNum(value);

  return (
    <button
      type="button"
      onClick={onClick}
      className="card-elevated group relative w-full overflow-hidden p-4 text-left transition-all hover:border-primary/30 hover:shadow-glow-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            {display}
          </p>
        </div>
        {icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/40 text-primary">
            {icon}
          </span>
        )}
      </div>
      {(hasDelta || spark) && (
        <div className="mt-3 flex items-center justify-between gap-3">
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta!).toFixed(1)}%
            </span>
          )}
          {spark && (
            <div className="h-8 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark}>
                  <defs>
                    <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--color-primary)"
                    strokeWidth={1.5}
                    fill={`url(#spark-${label})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      {hasDelta && <p className="mt-1.5 text-[10px] text-muted-foreground">vs previous period</p>}
    </button>
  );
}
