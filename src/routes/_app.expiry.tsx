import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Timer, AlertTriangle, Sparkles } from "lucide-react";
import { PRODUCTS, fmtINR, fmtNum } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/expiry" as never)({
  head: () => ({
    meta: [
      { title: "Expiry Intelligence — OmniMind AI" },
      { name: "description", content: "Perishable goods with expiry deadlines and AI markdown/transfer recommendations." },
    ],
  }),
  component: Expiry,
});

function Expiry() {
  const perishable = PRODUCTS.filter((p) => p.expiry).map((p) => {
    const days = Math.ceil((new Date(p.expiry!).getTime() - new Date("2026-05-05").getTime()) / 86400000);
    return { ...p, days };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiry Intelligence"
        subtitle="Predict, prevent, and recover from perishable stock loss."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Expiring Today" v="4 SKUs" tone="danger" />
        <Kpi label="Within 3 Days" v="18 SKUs" tone="warning" />
        <Kpi label="Within 7 Days" v="42 SKUs" tone="warning" />
        <Kpi label="Within 30 Days" v="184 SKUs" />
        <Kpi label="Expired Value" v="₹18,240" tone="danger" />
        <Kpi label="At-Risk Value" v="₹1.42L" tone="warning" />
      </div>

      <SectionCard
        title="Expiring Perishables"
        subtitle="Sorted by days remaining · AI recommendations included"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Batch</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 font-medium">Expiry</th>
                <th className="pb-2 text-right font-medium">Days</th>
                <th className="pb-2 text-right font-medium">Stock Value</th>
                <th className="pb-2 font-medium">Severity</th>
                <th className="pb-2 font-medium">AI Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {perishable.map((p) => {
                const severity =
                  p.days <= 2 ? "Critical" : p.days <= 7 ? "High" : p.days <= 30 ? "Medium" : "Safe";
                const tone =
                  severity === "Critical" ? "danger" : severity === "High" ? "warning" : severity === "Medium" ? "info" : "success";
                const rec =
                  severity === "Critical"
                    ? "Apply 30% markdown"
                    : severity === "High"
                      ? "Apply 20% markdown"
                      : severity === "Medium"
                        ? "Bundle promo"
                        : "Monitor";
                return (
                  <tr key={p.id} className="hover:bg-surface-2/40">
                    <td className="py-2.5 font-medium">{p.name}</td>
                    <td className="py-2.5 font-mono text-[11px] text-muted-foreground">B-{p.id.slice(-4)}</td>
                    <td className="py-2.5 text-right">{fmtNum(Math.round(p.stock * 0.4))}</td>
                    <td className="py-2.5">{p.expiry}</td>
                    <td className={`py-2.5 text-right font-semibold ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : ""}`}>
                      {p.days}
                    </td>
                    <td className="py-2.5 text-right">{fmtINR(p.stock * 0.4 * p.cost, { compact: true })}</td>
                    <td className="py-2.5">
                      <StatusPill tone={tone as any}>{severity}</StatusPill>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Sparkles className="h-3 w-3" /> {rec}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="AI Recovery Playbook">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Play title="Markdown" desc="Apply dynamic price cuts based on velocity and days-to-expiry." icon={<Timer className="h-4 w-4" />} />
          <Play title="Bundle & Cross-sell" desc="Attach expiring items to popular baskets. Historic recovery 62%." icon={<Sparkles className="h-4 w-4" />} />
          <Play title="Return / Donate" desc="Coordinate supplier returns or NGO donation for tax benefit." icon={<AlertTriangle className="h-4 w-4" />} />
        </div>
      </SectionCard>
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

function Play({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm font-semibold">{title}</span></div>
      <p className="mt-1.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
