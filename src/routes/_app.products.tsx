import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Package as PkgIcon,
  AlertTriangle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/products")({
  head: () => ({
    meta: [
      { title: "Product Intelligence — OmniMind AI" },
      {
        name: "description",
        content:
          "Product 360° intelligence with sales, demand, expiry, and reorder recommendations.",
      },
    ],
  }),
  component: Products,
});

function Products() {
  const { scopedProducts, openProduct360 } = useBusinessData();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (scopedProducts.length > 0) {
      setSelected(scopedProducts[0]);
    } else {
      setSelected(null);
    }
  }, [scopedProducts]);

  const filtered = scopedProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.id.toLowerCase().includes(q.toLowerCase()) ||
      p.dept.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Intelligence"
        subtitle="Deep visibility into every SKU: sales, demand, expiry, margins, and AI recommendations."
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5 border-hairline bg-surface">
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniKpi
          label="Total SKUs"
          value={fmtNum(scopedProducts.length * 15 + 400)}
          icon={<PkgIcon className="h-4 w-4" />}
        />
        <MiniKpi label="Active Products" value={fmtNum(scopedProducts.length)} tone="success" />
        <MiniKpi
          label="Low Stock"
          value={fmtNum(scopedProducts.filter((p) => p.stock <= p.reorder).length)}
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MiniKpi
          label="Best-selling Dept"
          value="Fashion"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_1fr]">
        <SectionCard
          title="All Products"
          subtitle={`${filtered.length} of ${scopedProducts.length} SKUs`}
          actions={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search SKU, name, department…"
                className="h-8 w-64 bg-background pl-8 text-xs focus:border-primary/50"
              />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Dept</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                  <th className="pb-2 text-right font-medium">Stock</th>
                  <th className="pb-2 text-right font-medium">Sold (30d)</th>
                  <th className="pb-2 text-right font-medium">Margin</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-surface/50",
                      selected?.id === p.id && "bg-primary/10",
                    )}
                    onClick={() => setSelected(p)}
                  >
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface text-[10px] font-semibold text-muted-foreground">
                          {p.brand.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{p.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {p.id} · {p.brand}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{p.dept}</td>
                    <td className="py-2.5 text-right font-medium">{fmtINR(p.price)}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={cn(
                          p.stock <= p.reorder / 4
                            ? "text-destructive font-semibold"
                            : p.stock <= p.reorder
                              ? "text-warning font-semibold"
                              : "",
                        )}
                      >
                        {fmtNum(p.stock)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">{fmtNum(p.sold)}</td>
                    <td className="py-2.5 text-right text-success">{p.margin.toFixed(1)}%</td>
                    <td className="py-2.5">
                      <StatusPill
                        tone={
                          p.status === "critical"
                            ? "danger"
                            : p.status === "expiring"
                              ? "warning"
                              : p.status === "low"
                                ? "warning"
                                : "success"
                        }
                      >
                        {p.status}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {selected && <Product360View p={selected} />}
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "warning" | "success";
}) {
  return (
    <div className="card-elevated p-3.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {icon && (
          <span className={tone === "warning" ? "text-warning" : "text-primary"}>{icon}</span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-display text-xl font-semibold",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Product360View({ p }: { p: any }) {
  const { openProduct360 } = useBusinessData();
  const daysLeft = Math.max(1, Math.round(p.stock / Math.max(1, p.sold / 30)));

  return (
    <div className="space-y-4">
      <SectionCard
        title="Product Snapshot"
        subtitle={p.name}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="border-hairline bg-surface text-xs font-semibold"
            onClick={() => openProduct360(p.id)}
          >
            Open 360° Profile
          </Button>
        }
      >
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg gradient-primary text-sm font-bold text-primary-foreground">
            {p.brand.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {p.dept} · {p.category}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg font-semibold">{p.name}</h3>
            <p className="text-xs text-muted-foreground">
              {p.id} · {p.brand} · Supplier: {p.supplier}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Selling" v={fmtINR(p.price)} />
          <Stat label="Cost" v={fmtINR(p.cost)} />
          <Stat label="Margin" v={`${p.margin.toFixed(1)}%`} tone="success" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Current stock" v={`${fmtNum(p.stock)} units`} />
          <Stat label="Reorder level" v={`${fmtNum(p.reorder)} units`} />
          <Stat label="Sold (30d)" v={fmtNum(p.sold)} />
          <Stat label="Revenue (30d)" v={fmtINR(p.revenue, { compact: true })} />
        </div>

        {p.expiry && (
          <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <p className="font-semibold text-warning">Batch expiry</p>
            <p className="mt-1 text-foreground/90">
              Batch B-{p.id.slice(-4)} expires <span className="font-semibold">{p.expiry}</span> ·{" "}
              {fmtNum(p.stock)} units affected
            </p>
          </div>
        )}

        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI Recommendation
          </div>
          <p className="mt-1 text-foreground/90 leading-relaxed">
            At current velocity, stock will run out in{" "}
            <span className="font-semibold">{daysLeft} days</span>. We recommend placing a reorder
            of <span className="font-semibold">{p.reorder} units</span> to maintain buffer.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, v, tone }: { label: string; v: string; tone?: "success" }) {
  return (
    <div className="rounded-md border border-hairline bg-surface/60 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-semibold", tone === "success" && "text-success")}>{v}</p>
    </div>
  );
}
