import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { ANOMALIES } from "@/lib/mock-data";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/anomalies" as never)({
  head: () => ({
    meta: [
      { title: "Anomaly & Risk Center — OmniMind AI" },
      { name: "description", content: "Detect sudden sales drops, expense spikes, and abnormal operations in real time." },
    ],
  }),
  component: Anomalies,
});

function Anomalies() {
  return (
    <div className="space-y-6">
      <PageHeader title="Anomaly & Risk Center" subtitle="Real-time deviations detected across all mall operations." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Active Anomalies" v={ANOMALIES.length.toString()} />
        <Kpi label="Critical" v={ANOMALIES.filter((a) => a.severity === "Critical").length.toString()} tone="danger" />
        <Kpi label="High" v={ANOMALIES.filter((a) => a.severity === "High").length.toString()} tone="warning" />
        <Kpi label="Medium" v={ANOMALIES.filter((a) => a.severity === "Medium").length.toString()} />
        <Kpi label="Resolved (30d)" v="42" />
      </div>

      <SectionCard title="Anomaly Timeline">
        <ul className="space-y-3">
          {ANOMALIES.map((a) => {
            const tone =
              a.severity === "Critical" ? "danger" : a.severity === "High" ? "warning" : a.severity === "Medium" ? "info" : "default";
            return (
              <li key={a.id} className="rounded-lg border border-hairline bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={tone as any}>{a.severity}</StatusPill>
                  <span className="text-sm font-semibold">{a.metric}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{a.when}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <Data label="Expected" v={a.expected} />
                  <Data label="Actual" v={a.actual} />
                  <Data label="Deviation" v={a.deviation} tone={tone as any} />
                  <Data label="Recommended action" v={a.action} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="text-foreground/90 font-medium">Possible cause:</span> {a.cause}
                </p>
                <div className="mt-3 flex gap-1.5">
                  <button className="rounded-md bg-primary/15 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/25">
                    Investigate
                  </button>
                  <button className="rounded-md border border-hairline px-3 py-1 text-[11px] hover:bg-surface-2">
                    Assign
                  </button>
                  <button className="rounded-md border border-hairline px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                    Dismiss
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}

function Data({ label, v, tone }: { label: string; v: string; tone?: "danger" | "warning" | "info" }) {
  return (
    <div className="rounded-md border border-hairline bg-background p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-semibold ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : ""}`}>{v}</p>
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
