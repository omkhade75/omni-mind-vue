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

      <Tabs defaultValue="payments" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4 self-start bg-sidebar border border-hairline">
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Remaining Payments
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Scheduled Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="flex-1 overflow-y-auto outline-none pr-2 space-y-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center border border-hairline rounded-xl bg-sidebar/30">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-elevated p-6 border-l-4 border-l-danger">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Accounts Payable</p>
                      <h2 className="text-3xl font-display font-bold text-danger">{fmtINR(data?.totalPayable || 0)}</h2>
                      <p className="text-xs text-muted-foreground mt-2">Total amount we owe to suppliers for pending Purchase Orders.</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                      <ArrowUpRight className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className="card-elevated p-6 border-l-4 border-l-success">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Accounts Receivable</p>
                      <h2 className="text-3xl font-display font-bold text-success">{fmtINR(data?.totalReceivable || 0)}</h2>
                      <p className="text-xs text-muted-foreground mt-2">Total amount customers owe us for pending transactions.</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                      <ArrowDownRight className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              <SectionCard title="Accounts Payable (Suppliers)">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
                        <th className="pb-3 font-semibold">Supplier</th>
                        <th className="pb-3 text-center font-semibold">Pending POs</th>
                        <th className="pb-3 text-right font-semibold pr-4">Amount Owed</th>
                        <th className="pb-3 pl-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {data?.accountsPayable?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                            No remaining payments to suppliers. You're all caught up!
                          </td>
                        </tr>
                      ) : (
                        data?.accountsPayable?.map((s: any) => (
                          <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                            <td className="py-3 font-medium">{s.name}</td>
                            <td className="py-3 text-center text-muted-foreground">{s.poCount}</td>
                            <td className="py-3 text-right font-bold text-danger pr-4">{fmtINR(s.amountOwed)}</td>
                            <td className="py-3 pl-4">
                              <button onClick={() => openSupplier360(s.id)} className="text-primary hover:underline font-semibold text-[11px]">
                                Pay Now
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="Accounts Receivable (Customers)">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline pb-2">
                        <th className="pb-3 font-semibold">Transaction ID</th>
                        <th className="pb-3 font-semibold">Customer</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 text-right font-semibold pr-4">Amount Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {data?.accountsReceivable?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                            No remaining payments from customers.
                          </td>
                        </tr>
                      ) : (
                        data?.accountsReceivable?.map((t: any) => (
                          <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                            <td className="py-3 font-mono text-[11px] text-muted-foreground">{t.transactionNumber}</td>
                            <td className="py-3 font-medium">{t.customerName}</td>
                            <td className="py-3">
                              <StatusPill tone="warning">{t.status}</StatusPill>
                            </td>
                            <td className="py-3 text-right font-bold text-success pr-4">{fmtINR(t.amountDue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}
        </TabsContent>

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
