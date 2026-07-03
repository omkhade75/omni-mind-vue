import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { getPaymentReportsServer } from "@/lib/server-reports";
import { fmtINR } from "@/lib/mock-data";
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
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
  const { openSupplier360, openCustomer360 } = useBusinessData();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <PageHeader
        title="Reports & Payments"
        subtitle="Manage scheduled reports and track remaining payments to suppliers and from customers."
      />

      <Tabs defaultValue="scheduled" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4 self-start bg-sidebar border border-hairline">
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Scheduled Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="flex-1 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-sm mb-1 text-foreground">Executive Weekly</h3>
              <p className="text-xs text-muted-foreground mb-4">Every Monday 07:00</p>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">Last run</span>
                <span className="font-medium">3 May 2026</span>
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
                <span className="font-medium">1 May 2026</span>
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
                <span className="font-medium">5 May 2026</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-t border-hairline">
                <span className="text-muted-foreground">SKUs</span>
                <span className="font-medium">8,412</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
