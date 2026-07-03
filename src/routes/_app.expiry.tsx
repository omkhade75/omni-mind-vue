import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Timer, AlertTriangle, Sparkles } from "lucide-react";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getExpiryIntelligenceServer } from "@/lib/server-inventory";

export const Route = createFileRoute("/_app/expiry")({
  head: () => ({
    meta: [
      { title: "Expiry Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Perishable goods with expiry deadlines and AI markdown/transfer recommendations.",
      },
    ],
  }),
  component: Expiry,
});

function Expiry() {
  const { applyMarkdown } = useBusinessData();
  const { user } = useAuth();
  const [perishable, setPerishable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const payload = { data: { role: user?.role || "owner", email: user?.email || "" } };
        const data = await getExpiryIntelligenceServer(payload);
        setPerishable(data);
      } catch (err) {
        console.error("Failed to load expiry intelligence", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Calculate metrics based on real perishable database data
  const expiringToday = perishable.filter((p) => p.days === 0).length;
  const within3d = perishable.filter((p) => p.days > 0 && p.days <= 3).length;
  const within7d = perishable.filter((p) => p.days > 3 && p.days <= 7).length;
  const within30d = perishable.filter((p) => p.days > 7 && p.days <= 30).length;

  const expiredValue = perishable
    .filter((p) => p.days < 0)
    .reduce((sum, p) => sum + p.stock * p.cost, 0);
  const atRiskValue = perishable
    .filter((p) => p.days >= 0 && p.days <= 7)
    .reduce((sum, p) => sum + p.stock * p.cost, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiry Intelligence"
        subtitle="Predict, prevent, and recover from perishable stock loss."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi
          label="Expiring Today"
          v={`${expiringToday} SKUs`}
          tone={expiringToday > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Within 3 Days"
          v={`${within3d} SKUs`}
          tone={within3d > 0 ? "warning" : undefined}
        />
        <Kpi
          label="Within 7 Days"
          v={`${within7d} SKUs`}
          tone={within7d > 0 ? "warning" : undefined}
        />
        <Kpi label="Within 30 Days" v={`${within30d} SKUs`} />
        <Kpi
          label="Expired Value"
          v={fmtINR(expiredValue)}
          tone={expiredValue > 0 ? "danger" : undefined}
        />
        <Kpi
          label="At-Risk Value"
          v={fmtINR(atRiskValue)}
          tone={atRiskValue > 0 ? "warning" : undefined}
        />
      </div>

      <SectionCard
        title="Expiring Perishables"
        subtitle="Sorted by days remaining · AI recommendations included"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Batch</th>
                <th className="pb-3 text-right font-semibold">Qty</th>
                <th className="pb-3 font-semibold">Expiry</th>
                <th className="pb-3 text-right font-semibold">Days Remaining</th>
                <th className="pb-3 text-right font-semibold pr-4">Stock Value</th>
                <th className="pb-3 font-semibold">Severity</th>
                <th className="pb-3 font-semibold">AI Action recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {perishable.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No expiring perishable items detected.
                  </td>
                </tr>
              ) : (
                perishable.map((p) => {
                  const severity =
                    p.days <= 0
                      ? "Expired"
                      : p.days <= 2
                        ? "Critical"
                        : p.days <= 7
                          ? "High"
                          : p.days <= 30
                            ? "Medium"
                            : "Safe";
                  const tone =
                    p.days <= 0
                      ? "danger"
                      : severity === "Critical"
                        ? "danger"
                        : severity === "High"
                          ? "warning"
                          : severity === "Medium"
                            ? "info"
                            : "success";
                  const rec =
                    p.days <= 0
                      ? "Dispose & Write-off"
                      : severity === "Critical"
                        ? "Apply 30% markdown"
                        : severity === "High"
                          ? "Apply 20% markdown"
                          : severity === "Medium"
                            ? "Bundle promotion"
                            : "Monitor";

                  return (
                    <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 font-medium">{p.name}</td>
                      <td className="py-3 font-mono text-[11px] text-muted-foreground">
                        {p.batchNumber}
                      </td>
                      <td className="py-3 text-right font-semibold">{fmtNum(p.stock)}</td>
                      <td className="py-3 font-medium">{new Date(p.expiry).toLocaleDateString()}</td>
                      <td
                        className={`py-3 text-right font-bold ${p.days <= 2 ? "text-destructive" : p.days <= 7 ? "text-warning" : ""}`}
                      >
                        {p.days <= 0 ? `Expired (${Math.abs(p.days)}d ago)` : `${p.days} days`}
                      </td>
                      <td className="py-3 text-right font-semibold pr-4">
                        {fmtINR(p.stock * p.cost)}
                      </td>
                      <td className="py-3">
                        <StatusPill tone={tone as any}>{severity}</StatusPill>
                      </td>
                      <td className="py-3">
                        {p.days > 0 ? (
                          <Button
                            size="sm"
                            className="gradient-primary text-primary-foreground font-semibold py-1 h-7 text-[10px]"
                            onClick={() => {
                              applyMarkdown(
                                p.productId,
                                p.batchNumber,
                                p.days <= 2 ? 30 : 20,
                              );
                            }}
                          >
                            <Sparkles className="h-3 w-3 mr-1" /> {rec}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground italic font-medium">
                            Dispose item
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="AI Recovery Playbook">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Play
            title="Markdown"
            desc="Apply dynamic price cuts based on velocity and days-to-expiry."
            icon={<Timer className="h-4 w-4" />}
          />
          <Play
            title="Bundle & Cross-sell"
            desc="Attach expiring items to popular baskets. Historic recovery 62%."
            icon={<Sparkles className="h-4 w-4" />}
          />
          <Play
            title="Return / Donate"
            desc="Coordinate supplier returns or NGO donation for tax benefit."
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>
      </SectionCard>
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

function Play({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
