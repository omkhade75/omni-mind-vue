import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FORECAST } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getForecastingServer } from "@/lib/server-analytics";

export const Route = createFileRoute("/_app/forecasting")({
  head: () => ({
    meta: [
      { title: "Forecasting — OmniMind AI" },
      {
        name: "description",
        content: "Revenue, footfall, inventory and expense forecasts with scenario planning.",
      },
    ],
  }),
  component: Forecasting,
});

const SCENARIOS = [
  "Normal",
  "Festival Demand",
  "Promotion Campaign",
  "Rainy Weekend",
  "Supplier Delay",
];

function Forecasting() {
  const { user } = useAuth();
  const [scenario, setScenario] = useState("Normal");
  const [horizon, setHorizon] = useState("7d");
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const payload = {
          data: {
            role: user?.role || "owner",
            email: user?.email || "",
            horizon,
            scenario,
          },
        };
        const res = await getForecastingServer(payload);
        setForecastData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, horizon, scenario]);

  const getForecastSummary = () => {
    switch (scenario) {
      case "Festival Demand":
        return {
          range: "₹84.2L ± ₹8.5L",
          fashionShift: "+18.4%",
          groceryBaseline: "within 1%",
        };
      case "Promotion Campaign":
        return {
          range: "₹74.8L ± ₹3.2L",
          fashionShift: "+12.6%",
          groceryBaseline: "within 3%",
        };
      case "Rainy Weekend":
        return {
          range: "₹48.6L ± ₹5.1L",
          fashionShift: "-14.2%",
          groceryBaseline: "within 2.5%",
        };
      case "Supplier Delay":
        return {
          range: "₹53.0L ± ₹6.2L",
          fashionShift: "-8.5%",
          groceryBaseline: "within 1.5%",
        };
      case "Normal":
      default:
        return {
          range: "₹62.4L ± ₹4.1L",
          fashionShift: "±6.2%",
          groceryBaseline: "within 2%",
        };
    }
  };

  const summary = getForecastSummary();

  const getForecastStats = () => {
    let baseFootfall = 34200;
    let baseOrders = 13820;
    let baseInventory = 14200000;

    // Horizon factor
    let horizonMult = 1.0;
    if (horizon === "30d") horizonMult = 4.2;
    else if (horizon === "90d") horizonMult = 12.5;

    // Scenario factor
    let scenarioMult = 1.0;
    let changeFootfall = "+9.4%";
    let changeOrders = "+6.1%";
    let changeInventory = "+11.8%";

    if (scenario === "Festival Demand") {
      scenarioMult = 1.35;
      changeFootfall = "+24.5%";
      changeOrders = "+21.2%";
      changeInventory = "+28.4%";
    } else if (scenario === "Promotion Campaign") {
      scenarioMult = 1.20;
      changeFootfall = "+18.2%";
      changeOrders = "+15.6%";
      changeInventory = "+19.8%";
    } else if (scenario === "Rainy Weekend") {
      scenarioMult = 0.80;
      changeFootfall = "-12.4%";
      changeOrders = "-14.1%";
      changeInventory = "-8.2%";
    } else if (scenario === "Supplier Delay") {
      scenarioMult = 0.85;
      changeFootfall = "-4.2%";
      changeOrders = "-8.8%";
      changeInventory = "-15.5%";
    }

    const footfallVal = Math.round(baseFootfall * horizonMult * scenarioMult);
    const ordersVal = Math.round(baseOrders * horizonMult * scenarioMult);
    const inventoryVal = Math.round(baseInventory * horizonMult * scenarioMult);

    return [
      {
        t: "Footfall",
        v: footfallVal >= 1000 ? `${(footfallVal / 1000).toFixed(1)}K` : footfallVal.toString(),
        c: changeFootfall,
        isNegative: changeFootfall.startsWith("-"),
      },
      {
        t: "Orders",
        v: ordersVal.toLocaleString("en-IN"),
        c: changeOrders,
        isNegative: changeOrders.startsWith("-"),
      },
      {
        t: "Inventory Draw",
        v: inventoryVal >= 10000000 ? `₹${(inventoryVal / 10000000).toFixed(2)}Cr` : `₹${(inventoryVal / 100000).toFixed(1)}L`,
        c: changeInventory,
        isNegative: changeInventory.startsWith("-"),
      },
    ];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecasting Center"
        subtitle="Predict revenue, footfall, and inventory across scenarios."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface p-0.5 text-[11px]">
          {["7d", "30d", "90d"].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                "rounded-sm px-2.5 py-1",
                horizon === h ? "bg-primary/20 text-foreground" : "text-muted-foreground",
              )}
            >
              Next {h}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface p-0.5 text-[11px]">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={cn(
                "rounded-sm px-2.5 py-1",
                scenario === s
                  ? "bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <SectionCard title="Revenue Forecast" subtitle={`${horizon} · scenario: ${scenario}`}>
        <div className="h-72 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: any) => `${Number(v) / 1000}K`}
                width={44}
              />
              <Tooltip contentStyle={ttStyle} />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="var(--color-primary)"
                fillOpacity={0.08}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--color-background)"
                fillOpacity={1}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--color-cyan)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-primary)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Forecast Summary
          </div>
          <p className="mt-1 text-foreground/90">
            Next Saturday revenue is forecast at{" "}
            <span className="font-semibold text-foreground">{summary.range}</span>. Under the{" "}
            <span className="font-semibold">{scenario}</span> scenario, expect Fashion contribution
            to shift by <span className="font-semibold">{summary.fashionShift}</span> and Grocery baseline to hold <span className="font-semibold">{summary.groceryBaseline}</span>.
          </p>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {getForecastStats().map((k) => (
          <div key={k.t} className="card-elevated p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Forecast · {k.t}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">{k.v}</p>
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                k.isNegative ? "text-destructive" : "text-success"
              )}
            >
              {k.c} vs current period
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
