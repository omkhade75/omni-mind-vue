import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, Brain } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RECOMMENDATIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ai-decisions" as never)({
  head: () => ({
    meta: [
      { title: "AI Decision Center — OmniMind AI" },
      { name: "description", content: "Move from reports to evidence-backed actions. Ask OmniMind, review recommendations, and orchestrate decisions." },
    ],
  }),
  component: AIDecisions,
});

const TABS = ["Ask OmniMind", "Recommendations", "Investigations", "Decisions", "Action History"] as const;

const SUGGESTIONS = [
  "Why did sales decrease this week?",
  "Which products should I reorder?",
  "What caused yesterday's expense spike?",
  "Which department is underperforming?",
  "Which supplier is most reliable?",
  "What will demand look like next weekend?",
  "How can I improve profit?",
];

function AIDecisions() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Ask OmniMind");
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Decision Center"
        subtitle="Move from reports to evidence-backed actions."
      />

      <div className="flex flex-wrap items-center gap-1 rounded-md border border-hairline bg-surface p-1 text-xs">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-sm px-3 py-1.5 font-medium transition-colors",
              tab === t ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ask OmniMind" && <AskOmniMind />}
      {tab === "Recommendations" && <RecList />}
      {tab === "Investigations" && <ScaffoldTab title="Open Investigations" desc="Deep-dive investigations spawned from anomalies or manual triggers." />}
      {tab === "Decisions" && <ScaffoldTab title="Pending Decisions" desc="Approve, dismiss, or route decisions to the right stakeholder." />}
      {tab === "Action History" && <ScaffoldTab title="Action History" desc="A complete audit trail of accepted recommendations and their outcomes." />}
    </div>
  );
}

function AskOmniMind() {
  const [q, setQ] = useState("Why did profit fall this week?");
  const [asked, setAsked] = useState(true);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
      <SectionCard>
        {/* Prompt */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">OmniMind Agent</p>
              <p className="text-[11px] text-muted-foreground">Grounded on 27 datasets · 8 departments</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-hairline bg-surface/70 p-3">
            <div className="flex items-start gap-2">
              <textarea
                value={q}
                onChange={(e) => setQ(e.target.value)}
                rows={2}
                className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                placeholder="Ask anything about your mall operations…"
              />
              <Button
                size="icon"
                className="gradient-primary text-primary-foreground"
                onClick={() => setAsked(true)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQ(s);
                  setAsked(true);
                }}
                className="rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/30 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Response */}
        {asked && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="h-4 w-4" /> Direct Answer
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                Net profit declined <span className="font-semibold text-destructive">11.8%</span> despite
                revenue falling only <span className="font-semibold">3.2%</span> — margin compression is the
                dominant driver, not sales volume.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <AnswerBlock
                title="Key Evidence"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                items={[
                  "Grocery procurement cost +14% (Amul, Nestlé)",
                  "Fashion discount spend +₹2.8L week-over-week",
                  "Electricity expense +23% (HVAC Zone B)",
                  "Returns rate up 9% (Electronics batch B-EL-2604)",
                ]}
              />
              <AnswerBlock
                title="Root Cause"
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                tone="warning"
                items={[
                  "Compressed grocery margins from supplier renegotiation",
                  "Manager discount overrides bypassing policy",
                  "HVAC compressor fault driving overnight electricity",
                ]}
              />
              <AnswerBlock
                title="Predicted Impact (30d)"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                items={[
                  "If unchanged: profit decline extends to −16% by month-end",
                  "Est. loss: ₹18.4L over next 30 days",
                ]}
              />
              <AnswerBlock
                title="Recommended Actions"
                icon={<Lightbulb className="h-3.5 w-3.5" />}
                tone="violet"
                items={[
                  "Review Grocery supplier pricing (target −6%)",
                  "Cap Fashion discounts to 15% without approval",
                  "Dispatch HVAC maintenance to Zone B",
                ]}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-hairline bg-surface p-3 text-xs">
              <span className="text-muted-foreground">
                Confidence <span className="font-semibold text-foreground">91%</span> · Evidence from 14 sources
              </span>
              <div className="flex gap-1.5">
                <button className="rounded-md border border-hairline px-2.5 py-1 text-muted-foreground hover:text-foreground">
                  Copy
                </button>
                <button className="rounded-md bg-primary/15 px-2.5 py-1 text-primary hover:bg-primary/25">
                  Create action plan
                </button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="space-y-3">
        <SectionCard title="Recent Investigations">
          <ul className="space-y-2 text-xs">
            {[
              { t: "Grocery margin compression", when: "2h" },
              { t: "HVAC Zone B electricity", when: "5h" },
              { t: "Electronics return spike", when: "1d" },
              { t: "Weekend footfall drop", when: "2d" },
            ].map((i) => (
              <li key={i.t} className="flex items-center justify-between rounded-md border border-hairline bg-surface p-2.5">
                <span className="truncate font-medium">{i.t}</span>
                <span className="shrink-0 text-muted-foreground">{i.when}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Data Sources">
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {["Sales", "POS", "Inventory", "Suppliers", "HR", "Utilities", "Footfall", "CRM"].map((s) => (
              <span key={s} className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function AnswerBlock({
  title,
  icon,
  items,
  tone = "primary",
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone?: "primary" | "warning" | "violet";
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    warning: "text-warning",
    violet: "text-violet",
  };
  return (
    <div className="rounded-lg border border-hairline bg-surface p-3">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
        {icon} {title}
      </div>
      <ul className="mt-2 space-y-1.5 text-xs text-foreground/90">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className={`mt-0.5 h-3 w-3 shrink-0 ${tones[tone]}`} />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecList() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {RECOMMENDATIONS.map((r) => (
        <div key={r.id} className="card-elevated p-4">
          <div className="flex items-center gap-2">
            <StatusPill
              tone={r.severity === "Critical" ? "danger" : r.severity === "High" ? "warning" : "info"}
            >
              {r.severity}
            </StatusPill>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.category}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{r.generated}</span>
          </div>
          <p className="mt-2 text-sm font-semibold">{r.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{r.evidence}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md border border-hairline bg-surface p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Impact</p>
              <p className="mt-0.5 font-semibold text-success">{r.impact}</p>
            </div>
            <div className="rounded-md border border-hairline bg-surface p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</p>
              <p className="mt-0.5 font-semibold">{r.confidence}%</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button className="flex-1 rounded-md bg-primary/15 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/25">
              Accept
            </button>
            <button className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] hover:bg-surface-2">
              Investigate
            </button>
            <button className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] hover:bg-surface-2">
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScaffoldTab({ title, desc }: { title: string; desc: string }) {
  return (
    <SectionCard title={title} subtitle={desc}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {RECOMMENDATIONS.slice(0, 4).map((r) => (
          <div key={r.id} className="rounded-md border border-hairline bg-surface p-3">
            <div className="flex items-center gap-2">
              <StatusPill tone="info">{r.category}</StatusPill>
              <span className="ml-auto text-[10px] text-muted-foreground">{r.generated}</span>
            </div>
            <p className="mt-1.5 text-sm font-medium">{r.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{r.evidence}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
