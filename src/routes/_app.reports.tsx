import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { getPaymentReportsServer, sendAllReportsWhatsAppServer } from "@/lib/server-reports";
import { fmtINR } from "@/lib/mock-data";
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/kpi-card";
import { useBusinessData } from "@/lib/business-context";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Payments — OmniMind AI" },
      { name: "description", content: "Scheduled reports and remaining payments tracking." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const { activeDate, products } = useBusinessData();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

  const handleDispatchWhatsApp = async () => {
    try {
      setDispatching(true);
      const payload = { data: { role: user?.role || "owner", email: user?.email || "" } };
      await sendAllReportsWhatsAppServer(payload);
      toast.success("All reports have been successfully dispatched via WhatsApp to the management team.");
    } catch (err) {
      toast.error("Failed to send WhatsApp reports.");
    } finally {
      setDispatching(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const payload = { data: { role: user?.role || "owner", email: user?.email || "" } };
        const res = await getPaymentReportsServer(payload);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Calculate dynamic dates based on activeDate
  const activeDateObj = new Date(activeDate);

  // Daily Snapshot - matches activeDate
  const dailyLastRunStr = activeDateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Monthly - 1st of the current active month
  const monthlyDate = new Date(activeDateObj);
  monthlyDate.setDate(1);
  const monthlyLastRunStr = monthlyDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Weekly - most recent Monday on or before activeDate
  const weeklyDate = new Date(activeDateObj);
  const currentDay = weeklyDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
  weeklyDate.setDate(weeklyDate.getDate() - daysSinceMonday);
  const weeklyLastRunStr = weeklyDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <PageHeader
        title="Reports & Payments"
        subtitle="Manage scheduled reports and track remaining payments to suppliers and from customers."
      />

      <Tabs defaultValue="scheduled" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4 self-start bg-sidebar border border-hairline flex items-center justify-between w-full">
          <div>
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Scheduled Reports
            </TabsTrigger>
          </div>
          <button 
            onClick={handleDispatchWhatsApp}
            disabled={dispatching}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#25D366] text-white rounded-md hover:bg-[#1DA851] transition-colors disabled:opacity-70 mr-1"
          >
            {dispatching ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
            Dispatch All via WhatsApp
          </button>
        </TabsList>

        <TabsContent value="scheduled" className="flex-1 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-sm mb-1 text-foreground">Executive Weekly</h3>
              <p className="text-xs text-muted-foreground mb-4">Every Monday 07:00</p>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">Last run</span>
                <span className="font-medium">{weeklyLastRunStr}</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">Recipients</span>
                <span className="font-medium">6</span>
              </div>
            </div>
            
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-sm mb-1 text-foreground">Finance Monthly</h3>
              <p className="text-xs text-muted-foreground mb-4">1st of month</p>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">Last run</span>
                <span className="font-medium">{monthlyLastRunStr}</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium">PDF + XLSX</span>
              </div>
            </div>

            <div className="card-elevated p-5">
              <h3 className="font-semibold text-sm mb-1 text-foreground">Inventory Snapshot</h3>
              <p className="text-xs text-muted-foreground mb-4">Daily 23:30</p>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">Last run</span>
                <span className="font-medium">{dailyLastRunStr}</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">SKUs</span>
                <span className="font-medium">{products.length} SKUs</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
