import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Brain,
  ChevronDown,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import { toast } from "sonner";
import { askOmniMindServer, AIResponseContract } from "@/lib/server-ai";
import { buildAIContext, localQueryFallback } from "@/lib/ai-context-builder";

export const Route = createFileRoute("/_app/ai-decisions")({
  head: () => ({
    meta: [
      { title: "AI Decision Center — OmniMind AI" },
      {
        name: "description",
        content:
          "Move from reports to evidence-backed actions. Ask OmniMind, review recommendations, and orchestrate decisions.",
      },
    ],
  }),
  component: AIDecisions,
});

const TABS = [
  "Ask OmniMind",
  "Recommendations",
  "Investigations",
  "Decisions",
  "Action History",
] as const;

const SUGGESTIONS = [
  "What happened on 5 May?",
  "What should I do today?",
  "Which products should I reorder?",
  "Why is electricity usage high?",
  "Compare 5 May with 4 May",
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
              tab === t
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ask OmniMind" && <AskOmniMind />}
      {tab === "Recommendations" && <RecList />}
      {tab === "Investigations" && (
        <ScaffoldTab
          title="Open Investigations"
          desc="Deep-dive investigations spawned from anomalies or manual triggers."
        />
      )}
      {tab === "Decisions" && (
        <ScaffoldTab
          title="Pending Decisions"
          desc="Approve, dismiss, or route decisions to the right stakeholder."
        />
      )}
      {tab === "Action History" && (
        <ScaffoldTab
          title="Action History"
          desc="A complete audit trail of accepted recommendations and their outcomes."
        />
      )}
    </div>
  );
}

function AskOmniMind() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    activeDate,
    addPurchaseOrder,
    applyMarkdown,
    openProduct360,
    openCustomer360,
    openSupplier360,
  } = useBusinessData();

  const [q, setQ] = useState("What should I do today?");
  const [loading, setLoading] = useState(false);
  const [answerData, setAnswerData] = useState<AIResponseContract | null>(null);
  const [mode, setMode] = useState<"AI Reasoning" | "Local Intelligence">("Local Intelligence");
  const [metadata, setMetadata] = useState<any>(null);
  const [history, setHistory] = useState<
    Array<{
      query: string;
      response: AIResponseContract;
      mode: "AI Reasoning" | "Local Intelligence";
      metadata: any;
    }>
  >([]);
  const [pendingAction, setPendingAction] = useState<any | null>(null);

  const handleQuerySubmit = async (queryOverride?: string) => {
    const queryToSubmit = queryOverride || q;
    if (!queryToSubmit.trim()) return;

    setLoading(true);
    setPendingAction(null);

    // Local context builder evaluates intent and applies security scoping
    const ctx = buildAIContext(queryToSubmit, activeDate, user?.role);

    try {
      // 1. Dispatch Gemini server action
      const response = await askOmniMindServer({
        data: {
          query: queryToSubmit,
          evidenceText: ctx.evidenceText,
          intent: ctx.intent,
          resolvedDate: ctx.resolvedDate,
          role: user?.role || "owner",
          email: user?.email || "",
        },
      });

      const meta = {
        query: queryToSubmit,
        resolvedIntent: ctx.intent,
        resolvedDate: ctx.resolvedDate,
        roleScope: user?.role || "owner",
        evidenceIdsUsed: ctx.evidenceIds,
        mode: "AI Reasoning",
        timestamp: new Date().toISOString(),
      };

      setAnswerData(response);
      setMode("AI Reasoning");
      setMetadata(meta);

      setHistory((prev) => [
        { query: queryToSubmit, response, mode: "AI Reasoning", metadata: meta },
        ...prev.filter((h) => h.query !== queryToSubmit),
      ]);
    } catch (err: any) {
      console.warn("Gemini service unavailable. Falling back to local intelligence...", err);

      // 2. Hybrid Fallback Mode
      const response = localQueryFallback(queryToSubmit, activeDate, user?.role);
      const meta = {
        query: queryToSubmit,
        resolvedIntent: ctx.intent,
        resolvedDate: ctx.resolvedDate,
        roleScope: user?.role || "owner",
        evidenceIdsUsed: ctx.evidenceIds,
        mode: "Local Intelligence (Fallback: " + (err?.message || String(err)) + ")",
        timestamp: new Date().toISOString(),
      };

      setAnswerData(response);
      setMode("Local Intelligence");
      setMetadata(meta);

      setHistory((prev) => [
        { query: queryToSubmit, response, mode: "Local Intelligence", metadata: meta },
        ...prev.filter((h) => h.query !== queryToSubmit),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionConfirm = (action: any) => {
    try {
      if (action.actionType === "CREATE_PO") {
        addPurchaseOrder({
          productId:
            action.entityId === "rec-dairy-reorder-001" ? "prod-dairy-milk" : "prod-elec-sony",
          productName:
            action.entityId === "rec-dairy-reorder-001"
              ? "Amul Taaza Milk 1L"
              : "Sony Premium Audio System",
          supplierId: action.entityId === "rec-dairy-reorder-001" ? "sup-amul" : "sup-sony",
          supplierName: action.entityId === "rec-dairy-reorder-001" ? "Amul Dairy" : "Sony India",
          quantity: action.entityId === "rec-dairy-reorder-001" ? 240 : 25,
          unitCost: action.entityId === "rec-dairy-reorder-001" ? 44 : 1200,
          totalCost: action.entityId === "rec-dairy-reorder-001" ? 12960 : 48000,
          status: "Draft",
          source: "AI Decision Center",
        });
        toast.success(`Purchase Order Draft created! Verify inside the Purchase Orders view.`);
      } else if (action.actionType === "APPLY_MARKDOWN") {
        applyMarkdown("prod-packaged-yogurt", "batch-dairy-yogurt-01", 20); // Yogurt product id, batch id, markdown pct
        toast.success("Applied 20% markdown promotion on expiring batch!");
      } else if (action.actionType === "OPEN_PRODUCT" && action.entityId) {
        openProduct360(action.entityId);
      } else if (action.actionType === "OPEN_CUSTOMER" && action.entityId) {
        openCustomer360(action.entityId);
      } else if (action.actionType === "OPEN_SUPPLIER" && action.entityId) {
        openSupplier360(action.entityId);
      } else if (action.actionType === "INVESTIGATE_ANOMALY") {
        navigate({ to: "/anomalies" as any });
        toast.info("Navigating to anomalies layout.");
      } else if (action.actionType === "NAVIGATE" && action.entityId) {
        navigate({ to: action.entityId as any });
      }
      setPendingAction(null);
    } catch (e: any) {
      toast.error("Failed to execute action: " + e.message);
    }
  };

  useEffect(() => {
    handleQuerySubmit("What should I do today?");
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
      <SectionCard>
        {/* Prompt Header */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Ask OmniMind AI</p>
              <p className="text-[11px] text-muted-foreground">
                Grounded on deterministic central mall records · Scoped under RBAC
              </p>
            </div>
            <div className="ml-auto">
              {mode === "AI Reasoning" ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/25">
                  <Sparkles className="h-3 w-3" /> AI Reasoning
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                  <Brain className="h-3 w-3" /> Local Intelligence
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-hairline bg-surface/70 p-3">
            <div className="flex items-start gap-2">
              <textarea
                value={q}
                onChange={(e) => setQ(e.target.value)}
                rows={2}
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                placeholder="Ask anything about your mall operations (e.g. reorder advice, utility spikes, budget plans)…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleQuerySubmit();
                  }
                }}
              />
              <Button
                size="icon"
                disabled={loading}
                className="gradient-primary text-primary-foreground shrink-0"
                onClick={() => handleQuerySubmit()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                disabled={loading}
                onClick={() => {
                  setQ(s);
                  handleQuerySubmit(s);
                }}
                className="rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all duration-200"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground animate-pulse">
              OmniMind is reasoning over database evidence...
            </p>
          </div>
        )}

        {/* Response Blocks */}
        {!loading && answerData && (
          <div className="mt-6 space-y-4">
            {/* Direct Answer */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="h-4 w-4" /> Direct Answer
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{answerData.answer}</p>
            </div>

            {/* Evidence & Risks Grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-hairline bg-surface p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <TrendingUp className="h-3.5 w-3.5" /> Key Evidence Resolved
                </div>
                <ul className="mt-2 space-y-2 text-xs text-foreground/90 font-medium">
                  {answerData.evidence.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start justify-between border-b border-hairline/30 pb-1.5 last:border-b-0 last:pb-0"
                    >
                      <span>{item.label}</span>
                      <span className="font-semibold text-muted-foreground">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-hairline bg-surface p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> Risk Factors
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-foreground/90 font-medium">
                  {answerData.risks.length === 0 ? (
                    <li className="text-muted-foreground text-xs">No critical risks flagged.</li>
                  ) : (
                    answerData.risks.map((risk, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <span>{risk.title}</span>
                        <StatusPill
                          tone={
                            risk.severity === "high"
                              ? "danger"
                              : risk.severity === "medium"
                                ? "warning"
                                : "info"
                          }
                        >
                          {risk.severity}
                        </StatusPill>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* Why this happened (Reasoning) */}
            <div className="rounded-lg border border-hairline bg-surface p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-400">
                <Lightbulb className="h-3.5 w-3.5" /> Why this happened
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                {answerData.reasoning.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Action Items */}
            {answerData.recommendedActions && answerData.recommendedActions.length > 0 && (
              <div className="rounded-lg border border-hairline bg-surface p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                  <ShieldCheck className="h-3.5 w-3.5" /> Actionable Recommendations
                </div>
                <div className="space-y-3">
                  {answerData.recommendedActions.map((action, i) => (
                    <div
                      key={i}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded border border-hairline bg-surface-2/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {action.title}
                          </span>
                          <StatusPill
                            tone={
                              action.priority === "high"
                                ? "danger"
                                : action.priority === "medium"
                                  ? "warning"
                                  : "info"
                            }
                          >
                            {action.priority} priority
                          </StatusPill>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {action.description}
                        </p>
                        {action.estimatedImpact && (
                          <span className="inline-block text-[10px] text-emerald-500 font-medium mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Impact: {action.estimatedImpact}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {pendingAction?.title === action.title ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleActionConfirm(action)}
                              className="rounded bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-500 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setPendingAction(null)}
                              className="rounded border border-hairline bg-surface px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPendingAction(action)}
                            className="rounded bg-primary/20 px-3 py-1.5 text-[10px] font-semibold text-foreground hover:bg-primary/30 transition-all flex items-center gap-1.5"
                          >
                            Execute <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata and Decision Evidence */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-hairline bg-surface p-3 text-[11px]">
                <span className="text-muted-foreground">
                  Confidence Score:{" "}
                  <span className="font-semibold text-foreground">
                    {Math.round(answerData.confidence * 100)}%
                  </span>{" "}
                  · Reference Date:{" "}
                  <span className="font-semibold text-foreground">{metadata?.resolvedDate}</span>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(answerData.answer);
                    toast.success("Answer copied to clipboard!");
                  }}
                  className="rounded border border-hairline px-2.5 py-1 text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Copy Text
                </button>
              </div>

              {/* View Decision Evidence Collapsible */}
              <div className="rounded-md border border-hairline bg-surface p-3 text-[11px]">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between text-muted-foreground hover:text-foreground font-semibold">
                    <span>View Decision Evidence Audit</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-[10px] text-muted-foreground leading-relaxed font-mono">
                    <div>
                      <span className="text-foreground font-semibold">Query:</span>{" "}
                      {metadata?.query}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Intent:</span>{" "}
                      {metadata?.resolvedIntent}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Date resolved:</span>{" "}
                      {metadata?.resolvedDate}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Role/RBAC Scope:</span>{" "}
                      {metadata?.roleScope}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">AI engine mode:</span>{" "}
                      {metadata?.mode}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">
                        Evidence SKU link count:
                      </span>{" "}
                      {metadata?.evidenceIdsUsed.length}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">System timestamp:</span>{" "}
                      {metadata?.timestamp}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="space-y-3">
        <SectionCard title="Session History">
          {history.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No queries recorded in this session.
            </div>
          ) : (
            <ul className="space-y-2 text-xs">
              {history.map((h, idx) => (
                <li
                  key={idx}
                  onClick={() => {
                    setQ(h.query);
                    setAnswerData(h.response);
                    setMode(h.mode);
                    setMetadata(h.metadata);
                  }}
                  className="flex flex-col gap-1 rounded-md border border-hairline bg-surface p-2.5 cursor-pointer hover:border-primary/45 transition-colors"
                >
                  <span className="truncate font-medium text-foreground">{h.query}</span>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{h.mode}</span>
                    <span>{h.metadata?.resolvedDate}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Data Connections">
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {["Sales", "POS", "Inventory", "Suppliers", "Utilities", "Footfall", "CRM"].map((s) => (
              <span
                key={s}
                className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-muted-foreground font-medium"
              >
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
      <div
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${tones[tone]}`}
      >
        {icon} {title}
      </div>
      <ul className="mt-2 space-y-1.5 text-xs text-foreground/90 font-medium">
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
  const { scopedRecommendations, acceptRecommendation, rejectRecommendation, openRecommendation } =
    useBusinessData();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {scopedRecommendations.map((r) => {
        const tone =
          r.severity === "Critical" ? "danger" : r.severity === "High" ? "warning" : "info";
        const isAccepted = r.status === "Accepted";
        return (
          <div key={r.id} className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <StatusPill tone={tone}>{r.severity}</StatusPill>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {r.category}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">{r.generated}</span>
            </div>
            <p className="mt-2 text-sm font-semibold">{r.title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.evidence}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border border-hairline bg-surface p-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Impact</p>
                <p className="mt-0.5 font-semibold text-success">{r.impact}</p>
              </div>
              <div className="rounded-md border border-hairline bg-surface p-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Confidence
                </p>
                <p className="mt-0.5 font-semibold">{r.confidence}%</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {isAccepted ? (
                <span className="flex-1 text-center py-1.5 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 rounded-md">
                  Accepted
                </span>
              ) : (
                <>
                  <button
                    onClick={() => acceptRecommendation(r.id)}
                    className="flex-1 rounded-md bg-primary/15 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/25"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => openRecommendation(r.id)}
                    className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] hover:bg-surface-2"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => rejectRecommendation(r.id)}
                    className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScaffoldTab({ title, desc }: { title: string; desc: string }) {
  const { scopedRecommendations } = useBusinessData();

  return (
    <SectionCard title={title} subtitle={desc}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {scopedRecommendations.slice(0, 4).map((r) => (
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
