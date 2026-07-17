import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles, Zap, Droplets, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtNum, fmtINR } from "@/lib/mock-data";
import { useMemo, useState, useEffect } from "react";
import { getUtilitiesServer, addUtilityReadingServer, deleteUtilityReadingServer } from "@/lib/server-utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/utilities")({
  head: () => ({
    meta: [
      { title: "Utilities Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Electricity and water usage analytics, anomaly detection, and cost forecasting.",
      },
    ],
  }),
  component: Utilities,
});

function Utilities() {
  const { activeDate, utilities, forceRefresh } = useBusinessData();
  const { user } = useAuth();

  const isGrandSquare = user?.workspaceId === "grandsquare-mall";

  const [electricityToday, setElectricityToday] = useState(isGrandSquare ? 12450 : 0);
  const [waterToday, setWaterToday] = useState(isGrandSquare ? 8120 : 0);
  const [dbAnomaly, setDbAnomaly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [type, setType] = useState<"ELECTRICITY" | "WATER">("ELECTRICITY");
  const [zone, setZone] = useState("Roof Unit B");
  const [value, setValue] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(activeDate);

  useEffect(() => {
    async function load() {
      try {
        const payload = {
          data: { role: user?.role || "owner", email: user?.email || "", activeDate },
        };
        const data = await getUtilitiesServer(payload);
        setElectricityToday(data.electricityToday);
        setWaterToday(data.waterToday);
        setDbAnomaly(data.isAnomaly);
      } catch (err) {
        console.error("Failed to load utilities", err);
      }
    }
    load();
  }, [user, activeDate, utilities]);

  const isMay5 = isGrandSquare && (activeDate === "2026-05-05" || dbAnomaly);

  const hourly = useMemo(() => {
    const hasData = isGrandSquare || utilities.length > 0;
    return Array.from({ length: 24 }, (_, h) => {
      const isAnomalyHour = h >= 1 && h <= 4;
      const normal = hasData ? (h < 9 ? 8 : h < 22 ? 24 + Math.sin(h / 3) * 6 : 10) : 0;
      const actual = hasData ? (normal + (isAnomalyHour && isMay5 ? 14 : (Math.random() - 0.5) * 1.5)) : 0;
      return {
        h: `${h}:00`,
        normal: Math.round(normal * 10) / 10,
        actual: Math.round(actual * 10) / 10,
      };
    });
  }, [isMay5, isGrandSquare, utilities]);

  const monthly = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => {
      const monthPrefix = `2026-0${3 + i}`;
      const elecReadings = utilities.filter(
        (u) => u.date.startsWith(monthPrefix) && u.type === "Electricity",
      );
      const waterReadings = utilities.filter(
        (u) => u.date.startsWith(monthPrefix) && u.type === "Water",
      );
      return {
        m: ["March", "April", "May"][i],
        electricity: Math.round(
          (elecReadings.reduce((sum, u) => sum + u.consumption, 0) || (isGrandSquare ? 360000 : 0)) / 1000,
        ), // kWh in thousands
        water: Math.round(
          (waterReadings.reduce((sum, u) => sum + u.consumption, 0) || (isGrandSquare ? 240000 : 0)) / 1000,
        ), // Liters in thousands
      };
    });
  }, [utilities, isGrandSquare]);

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !cost.trim()) {
      toast.error("Please fill in all details.");
      return;
    }
    setSaving(true);
    try {
      await addUtilityReadingServer({
        data: {
          type,
          zone,
          value: parseFloat(value) || 0,
          cost: parseFloat(cost) || 0,
          date,
          role: user?.role || "owner",
          email: user?.email || "",
        },
      });
      toast.success("Utility reading recorded in operational database.");
      setShowAddModal(false);
      setValue("");
      setCost("");
      forceRefresh();
    } catch (err) {
      toast.error("Failed to add utility reading.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReading = async (id: string) => {
    try {
      await deleteUtilityReadingServer({
        data: {
          id,
          role: user?.role || "owner",
          email: user?.email || "",
        },
      });
      toast.success("Utility reading deleted.");
      forceRefresh();
    } catch (err) {
      toast.error("Failed to delete reading.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilities Intelligence"
        subtitle="Electricity and water usage with AI anomaly detection."
        actions={
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Record Reading
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Electricity Today"
          v={`${fmtNum(electricityToday)} kWh`}
          icon={<Zap className="h-4 w-4" />}
        />
        <Kpi label="Monthly Bill (Est.)" v={fmtINR(electricityToday * 30 * 9.5)} tone="warning" />
        <Kpi
          label="Water Today"
          v={`${fmtNum(waterToday)} L`}
          icon={<Droplets className="h-4 w-4" />}
        />
        <Kpi label="Peak Hour" v={isGrandSquare ? (isMay5 ? "02:00" : "19:00") : (electricityToday > 0 ? "19:00" : "N/A")} />
      </div>

      <SectionCard
        title="Electricity — 24 hour usage"
        subtitle={
          isMay5
            ? "Actual vs baseline · anomaly detected 01:00–04:00 (HVAC Zone B)"
            : "Actual vs baseline · normal grid conditions"
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly}>
              <defs>
                <linearGradient id="norm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
              <XAxis dataKey="h" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: any) => `${v} kW`}
                width={54}
              />
              <Tooltip contentStyle={ttStyle} />
              <Area
                type="monotone"
                dataKey="normal"
                stroke="var(--color-cyan)"
                strokeWidth={2}
                fill="url(#norm)"
                name="Baseline"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="var(--color-warning)"
                strokeWidth={2}
                fill="url(#act)"
                name="Actual"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Monthly Consumption Trends (kilo-units)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={ttStyle} />
                <Bar
                  dataKey="electricity"
                  fill="var(--color-primary)"
                  name="Electricity (kwh)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="water"
                  fill="var(--color-cyan)"
                  name="Water (Liters)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="AI Utility Audit">
          {isMay5 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">HVAC Zone B — overnight draw</span>
              </div>
              <p className="mt-2 text-xs text-foreground/90">
                Electricity usage increased{" "}
                <span className="font-semibold">163% between 1 AM and 4 AM</span> despite the mall
                being closed. This has persisted for 11 consecutive days.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Estimated unnecessary monthly cost:{" "}
                <span className="font-semibold text-foreground">₹38,400</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">No critical grid anomalies</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Electricity and water draw remain within normal operational deviation boundaries.
              </p>
            </div>
          )}

          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Recommended AI Action
            </div>
            <p className="mt-1 text-foreground/90 leading-relaxed">
              {isGrandSquare
                ? (isMay5
                    ? "Dispatch CoolTech maintenance team to inspect compressor systems and ventilation dampers in Zone B. Expected monthly savings: ₹38.4K."
                    : "Schedule automated cleaning of solar power generation panels on rooftop to maintain high baseline output efficiency.")
                : (electricityToday > 0
                    ? "Monitor daily telemetry readings. AI is analyzing consumption baselines to detect potential anomalies."
                    : "No recommended actions at this time. Record utility telemetry readings to initialize AI insights.")}
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Manual Readings Table */}
      <SectionCard title="Telemetry Reading Log" subtitle="Manually entered utility meters records">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Meter / Zone</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 text-right font-semibold">Reading Value</th>
                <th className="pb-2 text-right font-semibold">Recorded Cost</th>
                <th className="pb-2 font-semibold pl-4">Source</th>
                <th className="pb-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {utilities.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                  <td className="py-2">{u.date}</td>
                  <td className="py-2 font-medium">{u.zone || `Meter ${u.id}`}</td>
                  <td className="py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${u.type === "Electricity" ? "bg-amber-500/10 text-amber-500" : "bg-cyan-500/10 text-cyan-500"}`}
                    >
                      {u.type}
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {u.consumption.toLocaleString("en-IN")} {u.type === "Electricity" ? "kWh" : "L"}
                  </td>
                  <td className="py-2 text-right font-semibold text-foreground">
                    {fmtINR(u.cost)}
                  </td>
                  <td className="py-2 pl-4 text-muted-foreground">Telemetry</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleDeleteReading(u.id)}
                      className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {utilities.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No utility readings manually recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Record Reading Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Utility Reading</DialogTitle>
            <DialogDescription>
              Record manual meter reading in operational database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddReading} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ut-type">Meter Type</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger id="ut-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ELECTRICITY">Electricity (kWh)</SelectItem>
                    <SelectItem value="WATER">Water (Liters)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ut-date">Reading Date</Label>
                <Input
                  id="ut-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ut-zone">Zone / Location</Label>
              <Input
                id="ut-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. HVAC Zone B, South Wing"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ut-value">Meter Reading Value</Label>
                <Input
                  id="ut-value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 1200"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ut-cost">Cost (₹)</Label>
                <Input
                  id="ut-cost"
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="e.g. 11400"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Recording..." : "Record Reading"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  label,
  v,
  tone,
  icon,
}: {
  label: string;
  v: string;
  tone?: "warning";
  icon?: React.ReactNode;
}) {
  return (
    <div className="card-elevated p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p
        className={`mt-1.5 font-display text-lg font-semibold ${tone === "warning" ? "text-warning" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}

const ttStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 6,
  fontSize: 12,
} as const;
