import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";
import { Sparkles, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/suppliers")({
  head: () => ({
    meta: [
      { title: "Supplier Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Supplier 360° with AI scoring across price, reliability, quality, and delivery.",
      },
    ],
  }),
  component: Suppliers,
});

function Suppliers() {
  const { suppliers, openSupplier360 } = useBusinessData();
  const [sel, setSel] = useState<any>(null);

  useEffect(() => {
    if (suppliers.length > 0) {
      setSel(suppliers[0]);
    } else {
      setSel(null);
    }
  }, [suppliers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Intelligence"
        subtitle="AI-scored supplier performance across the mall's vendor network."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Active Suppliers" v={suppliers.length.toString()} />
        <Kpi label="Pending Payments" v="₹28.6L" tone="warning" />
        <Kpi label="Open POs" v="34" />
        <Kpi label="Delayed" v="6" tone="danger" />
        <Kpi label="Avg Lead Time" v="4.3 days" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="All Suppliers">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Spend</th>
                  <th className="pb-2 text-right font-medium">Pending</th>
                  <th className="pb-2 text-right font-medium">On-time</th>
                  <th className="pb-2 text-right font-medium">Score</th>
                  <th className="pb-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSel(s)}
                    className={cn(
                      "cursor-pointer hover:bg-surface/50",
                      sel?.id === s.id && "bg-primary/10",
                    )}
                  >
                    <td className="py-2.5">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.contact}</p>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{s.category}</td>
                    <td className="py-2.5 text-right">{fmtINR(s.spend, { compact: true })}</td>
                    <td className="py-2.5 text-right text-warning">
                      {fmtINR(s.pending, { compact: true })}
                    </td>
                    <td className="py-2.5 text-right">{s.onTime}%</td>
                    <td className="py-2.5 text-right font-semibold">{s.score}</td>
                    <td className="py-2.5">
                      <StatusPill
                        tone={
                          s.risk === "High" ? "danger" : s.risk === "Medium" ? "warning" : "success"
                        }
                      >
                        {s.risk}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {sel && (
          <SectionCard
            title="Supplier 360° Profile"
            subtitle={sel.name}
            actions={
              <Button
                size="sm"
                variant="outline"
                className="border-hairline bg-surface text-xs font-semibold"
                onClick={() => openSupplier360(sel.id)}
              >
                Open Full 360° Profile
              </Button>
            }
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg gradient-primary text-primary-foreground">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{sel.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {sel.category} · Contact: {sel.contact}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <ScoreBar label="Price" v={94 - (100 - sel.score) / 2} />
              <ScoreBar label="Reliability" v={sel.onTime} />
              <ScoreBar label="Quality" v={sel.quality} />
              <ScoreBar label="Delivery" v={100 - sel.lead * 6} />
              <div className="hairline-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall AI Score</span>
                  <span className="font-display text-xl font-semibold text-primary">
                    {sel.score}/100
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> AI Analysis
              </div>
              <p className="mt-1 text-foreground/90 leading-relaxed">
                {sel.risk === "High"
                  ? "Delivery risk is elevated. Consider dual-sourcing critical SKUs and negotiating a service-level agreement."
                  : sel.risk === "Medium"
                    ? "Overall solid supplier but lead time is trending up. Explore alternate pricing terms."
                    : "Reliable partner. Maintain current relationship. Explore volume discount on next quarterly review."}
              </p>
            </div>
          </SectionCard>
        )}
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

function ScoreBar({ label, v }: { label: string; v: number }) {
  const p = Math.max(0, Math.min(100, v));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(p)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full gradient-primary" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
