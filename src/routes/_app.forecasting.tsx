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

  const getScenarioExplanation = () => {
    switch (scenario) {
      case "Festival Demand":
        return {
          model: "Prophet + LSTM Ensemble (Seasonal Overlay)",
          confidence: "88% (Medium-High)",
          factors: [
            "Festive season shopping patterns (historical peak shopping volumes)",
            "Promotional events and festive decorations spike footfall (+24.5%)",
            "High correlation with premium Fashion cart size additions (+18.4%)",
            "Accelerated cashier processing speed override at POS"
          ],
          narrative: "The AI forecasts a substantial surge in overall revenue, heavily weighted towards the first floor Fashion and Beauty departments. Footfall conversion rate is modeled at 42% (up from 32% baseline), driving a projected ₹84.2L peak week. Retail inventory draws will increase by 28.4%, so immediate replenishment is advised for top-selling SKUs."
        };
      case "Promotion Campaign":
        return {
          model: "Elasticity Multiplier + Gradient Boosting",
          confidence: "92% (High)",
          factors: [
            "Active marketing campaign discount factors (15-20% average markdown)",
            "Push notification click-through rate models from CRM loyalty lists",
            "Basket size expansion (+15.6% orders) offset by slightly lower margins",
            "Spike in walk-in customer conversion rate"
          ],
          narrative: "Under this scenario, the model predicts high transaction volume driven by discount elasticities. While the average order value is compressed by ~5%, the increased order counts (+15.6%) will secure a net positive revenue return of ₹74.8L. The AI recommends cross-promoting high-margin cosmetics to beauty segments to buffer the promotional margins."
        };
      case "Rainy Weekend":
        return {
          model: "Weather-Integrated Auto-ARIMA Regressor",
          confidence: "75% (Medium)",
          factors: [
            "Local meteorological precipitation models (>15mm rainfall forecast)",
            "Negative transit friction coefficient (diminishing out-of-town footfall)",
            "Increased average customer dwell time (+45 minutes in-mall)",
            "Food Court and Cinema transactional spike offsets"
          ],
          narrative: "Heavy rain alters customer behavior inside the mall. While retail fashion dispatches drop due to lower overall visitor counts, food and beverage/entertainment revenues historically experience a +12% increase. The forecast predicts a total revenue of ₹48.6L. The AI suggests optimizing HVAC temperatures to conserve energy during lower occupancy hours."
        };
      case "Supplier Delay":
        return {
          model: "Supply Chain Risk Network Model",
          confidence: "68% (Medium-Low)",
          factors: [
            "Delayed supplier shipping logs (average +5.2 days backlog)",
            "Rising out-of-stock count on primary anchor-tenant items",
            "Substituted buying behavior coefficients",
            "Lead time volatility overrides"
          ],
          narrative: "This scenario represents supply chain constraints. Delays in replenishment lead to stockouts in key high-margin electronics and grocery items, causing a projected -8.8% decline in total orders. Estimated weekly revenue drops to ₹53.0L. The AI urges immediate diversification of vendors to mitigate category stock exhaustion."
        };
      case "Normal":
      default:
        return {
          model: "Standard Seasonal Auto-ARIMA Baseline",
          confidence: "95% (High)",
          factors: [
            "90-day moving average historical baseline data",
            "Standard calendar adjustments (weekends vs weekdays)",
            "Stable utility usage and baseline footfall velocity (+9.4% YoY)",
            "Zero active external disruption parameters"
          ],
          narrative: "This baseline forecast represents the mall operating under ordinary conditions. Using a 90-day historical moving average, the AI expects steady growth with a projected weekly revenue of ₹62.4L. Utility baselines, logistics dispatches, and customer segments are anticipated to follow stable historical trends."
        };
    }
  };

  const explanation = getScenarioExplanation();

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

      <SectionCard title="AI Forecast Diagnostics & Model Variables" subtitle="Model details, confidence weights, and variables analyzed">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Prediction Model</p>
              <p className="text-sm font-semibold text-foreground mt-1">{explanation.model}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Model Confidence Index</p>
              <p className="text-sm font-semibold text-primary mt-1">{explanation.confidence}</p>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Key Variables Scoped</p>
              <ul className="mt-2 space-y-1.5">
                {explanation.factors.map((f, idx) => (
                  <li key={idx} className="text-xs text-foreground/80 flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-3 border-t border-hairline">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Analytical Insights & Outlook</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{explanation.narrative}</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
