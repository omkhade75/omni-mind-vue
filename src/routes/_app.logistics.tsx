import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLogisticsDispatchesServer, createLogisticsDispatchServer, updateLogisticsStatusServer, type DeliveryItem } from "@/lib/server-logistics";
import { Loader2, Truck, Navigation, CheckCircle, AlertTriangle, Clock, MapPin, ShieldAlert, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/logistics")({
  head: () => ({
    meta: [
      { title: "Logistics & Dispatches — OmniMind AI" },
      { name: "description", content: "Outgoing customer delivery dispatch tracking operations." },
    ],
  }),
  component: LogisticsPage,
});

function LogisticsPage() {
  const { user } = useAuth();
  
  // Data states
  const [dispatches, setDispatches] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState("");
  const [driverName, setDriverName] = useState("Vijay Yadav");
  const [vehicleNumber, setVehicleNumber] = useState("MH-12-PQ-8841");
  const [itemsCount, setItemsCount] = useState("3");
  const [scheduling, setScheduling] = useState(false);

  // Status editing states
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [delayReason, setDelayReason] = useState("");

  const loadData = async () => {
    try {
      const res = await getLogisticsDispatchesServer({});
      setDispatches(res);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load delivery dispatches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !customerName.trim() || !destination.trim()) {
      toast.error("All delivery details are required.");
      return;
    }

    try {
      setScheduling(true);
      await createLogisticsDispatchServer({
        orderNumber,
        customerName,
        destination,
        driverName,
        vehicleNumber,
        itemsCount: Number(itemsCount) || 1,
      });

      toast.success("Delivery Dispatched!", {
        description: `Order ${orderNumber} successfully scheduled with driver ${driverName}.`,
      });

      // Clear states
      setOrderNumber("");
      setCustomerName("");
      setDestination("");
      setItemsCount("3");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch delivery.");
    } finally {
      setScheduling(false);
    }
  };

  const handleUpdateStatus = async (id: string) => {
    try {
      setUpdatingId(id);
      await updateLogisticsStatusServer({
        dispatchId: id,
        status: newStatus,
        delayReason: newStatus === "Delayed" ? delayReason : null,
      });

      toast.success("Delivery Status Updated");
      setEditingStatusId(null);
      setNewStatus("");
      setDelayReason("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalCount = dispatches.length;
  const inTransitCount = dispatches.filter((d) => d.status === "In Transit" || d.status === "Dispatched" || d.status === "Out for Delivery").length;
  const deliveredCount = dispatches.filter((d) => d.status === "Delivered").length;
  const delayedCount = dispatches.filter((d) => d.status === "Delayed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistics & Dispatch Operations"
        description="Monitor outgoing customer deliveries, manage vehicle dispatch routes, and mitigate delay risks."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Scheduled Shipments"
          value={totalCount}
          format="number"
          icon={<Truck className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="In Transit / Active"
          value={inTransitCount}
          format="number"
          icon={<Navigation className="h-5 w-5 text-blue-500" />}
        />
        <KpiCard
          label="Successfully Delivered"
          value={deliveredCount}
          format="number"
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Active Logistics Anomalies"
          value={delayedCount}
          format="number"
          icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Dispatches Board */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Active Logistics Fleet Feed" icon={<Truck className="h-5 w-5 text-indigo-500" />}>
            {dispatches.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                No active delivery dispatches found. Use the scheduler on the right to dispatch items.
              </div>
            ) : (
              <div className="space-y-4">
                {dispatches.map((d) => {
                  const isEditing = editingStatusId === d.id;
                  return (
                    <div
                      key={d.id}
                      className={`p-4 border rounded-xl transition-all duration-200 hover:shadow-sm ${
                        d.status === "Delayed"
                          ? "border-rose-200 bg-rose-50/10 shadow-rose-50/10"
                          : d.status === "Delivered"
                          ? "border-emerald-100 bg-emerald-50/10"
                          : "border-border/60 bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900">{d.orderNumber}</span>
                            <span className="text-xs text-muted-foreground">• {d.customerName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-indigo-500" />
                            Destination: <span className="text-zinc-800 font-medium">{d.destination}</span>
                          </p>
                        </div>
                        <div>
                          <span
                            className={`px-2.5 py-0.5 text-xs rounded-full font-bold border ${
                              d.status === "Delivered"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : d.status === "Delayed"
                                ? "bg-rose-50 text-rose-700 border-rose-100 animate-pulse"
                                : d.status === "Out for Delivery"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-zinc-100 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                      </div>

                      {/* Driver & vehicle */}
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-xs text-zinc-600">
                        <div>
                          <span>Driver:</span> <strong className="text-zinc-800">{d.driverName}</strong>
                        </div>
                        <div>
                          <span>Vehicle ID:</span> <strong className="text-zinc-800 font-mono">{d.vehicleNumber}</strong>
                        </div>
                        <div>
                          <span>Items Count:</span> <strong className="text-zinc-800">{d.itemsCount} parcels</strong>
                        </div>
                        <div>
                          <span>Dispatched:</span> <strong className="text-zinc-800">{new Date(d.dispatchedAt).toLocaleTimeString()}</strong>
                        </div>
                      </div>

                      {/* Delay Alerts */}
                      {d.status === "Delayed" && d.delayReason && (
                        <div className="mt-3 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-800 flex items-start gap-1.5 animate-in slide-in-from-top-1">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Logistics Delay Risk Detected:</span> {d.delayReason}
                          </div>
                        </div>
                      )}

                      {/* Status controller inline */}
                      <div className="mt-3 pt-2 flex justify-end gap-2 border-t">
                        {isEditing ? (
                          <div className="w-full space-y-3 pt-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Select New Status</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="In Transit">In Transit</SelectItem>
                                    <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                                    <SelectItem value="Delayed">Delayed</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {newStatus === "Delayed" && (
                                <div className="space-y-1">
                                  <Label className="text-xs">Delay Reason / Root Cause</Label>
                                  <Input
                                    value={delayReason}
                                    onChange={(e) => setDelayReason(e.target.value)}
                                    placeholder="e.g. Engine overheat"
                                    className="bg-white h-9"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 text-xs">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingStatusId(null)}
                                disabled={updatingId === d.id}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="bg-indigo-600 text-white hover:bg-indigo-700"
                                onClick={() => handleUpdateStatus(d.id)}
                                disabled={updatingId === d.id}
                              >
                                {updatingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Status"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-indigo-600 hover:bg-indigo-50/50"
                            onClick={() => {
                              setEditingStatusId(d.id);
                              setNewStatus(d.status);
                              setDelayReason(d.delayReason || "");
                            }}
                          >
                            Update Dispatch Status
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Schedule/Dispatch Form */}
        <div>
          <SectionCard title="Schedule New Dispatch" icon={<Truck className="h-5 w-5 text-indigo-500" />}>
            <form onSubmit={handleCreateDispatch} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Invoice/Order Reference #</Label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. TXN-10255"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priya Shah"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Delivery Destination Address</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Hadapsar, Pune"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Assigned Driver</Label>
                  <Select value={driverName} onValueChange={(val) => {
                    setDriverName(val);
                    setVehicleNumber(val === "Vijay Yadav" ? "MH-12-PQ-8841" : val === "Sanjay Mane" ? "MH-12-RS-9921" : "MH-12-XY-4040");
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vijay Yadav">Vijay Yadav</SelectItem>
                      <SelectItem value="Sanjay Mane">Sanjay Mane</SelectItem>
                      <SelectItem value="Dinesh Kadam">Dinesh Kadam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Parcels Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={itemsCount}
                    onChange={(e) => setItemsCount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Automated Fleet Vehicle Assignment</Label>
                <Input value={vehicleNumber} disabled className="bg-zinc-50 font-mono" />
              </div>

              <Button
                type="submit"
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2"
                disabled={scheduling}
              >
                {scheduling ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" /> Dispatch Cargo Package
                  </>
                )}
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
