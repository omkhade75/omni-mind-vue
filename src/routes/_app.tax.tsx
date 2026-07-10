import { createFileRoute } from "@tanstack/react-router";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getTaxPaymentsServer, recordTaxPaymentServer } from "@/lib/server-ledger";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2, Plus, Wallet, FileText, Landmark, ShieldCheck, ArrowUpRight, Shield, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/tax")({
  head: () => ({
    meta: [
      { title: "Tax & Compliance — OmniMind AI" },
      { name: "description", content: "GST, income tax provision, and compliance deadlines." },
    ],
  }),
  component: RouteComponent,
});

interface TaxPaymentItem {
  id: string;
  journalId: string;
  amount: number;
  description: string;
  date: string;
  referenceId: string | null;
}

const COLORS = ["#4f46e5", "#f59e0b", "#10b981", "#ec4899"];

function RouteComponent() {
  const { user } = useAuth();
  const { transactions, purchaseOrders, scopedExpenses, activeDate } = useBusinessData();
  const [loading, setLoading] = useState(true);
  const [taxPayments, setTaxPayments] = useState<TaxPaymentItem[]>([]);

  // Dialog & Form States
  const [showFilingModal, setShowFilingModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"GST" | "Corporate Income Tax" | "Property Tax" | "TDS">("GST");
  const [description, setDescription] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const res = await getTaxPaymentsServer();
      setTaxPayments(res as TaxPaymentItem[]);
    } catch (err) {
      toast.error("Failed to load tax filing history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRecordTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !description.trim() || !challanNumber.trim()) {
      toast.error("Please enter a valid amount, description, and challan reference.");
      return;
    }

    try {
      setSaving(true);
      await recordTaxPaymentServer({
        data: {
          amount: Number(amount),
          category,
          description,
          challanNumber,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        }
      });

      toast.success("Tax Challan payment recorded in General Ledger!");
      setAmount("");
      setDescription("");
      setChallanNumber("");
      setShowFilingModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record tax payment.");
    } finally {
      setSaving(false);
    }
  };

  // --- Dynamic calculations for active month ---
  const activeYearMonth = activeDate.split("T")[0].slice(0, 7);
  const formattedMonth = new Date(activeDate).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // 1. GST Collected (from completed sales tax fields)
  const thisMonthSales = transactions.filter(
    (t) => t.date.split("T")[0].startsWith(activeYearMonth) && t.status === "Completed"
  );
  const gstCollected = thisMonthSales.reduce((sum, t) => sum + (t.tax || 0), 0);

  // 2. Input Tax Credit (from completed purchase orders)
  const thisMonthPOs = purchaseOrders.filter(
    (po) => po.date.split("T")[0].startsWith(activeYearMonth) && po.status === "Received"
  );
  // Estimate ITC as 18% of PO total amount if tax field is not explicit
  const inputTaxCredit = thisMonthPOs.reduce((sum, po) => sum + (Number(po.totalCost) * 0.18), 0);

  // Net GST Payable
  const gstPayable = Math.max(0, gstCollected - inputTaxCredit);

  // 3. Direct Tax (Income Tax Provision: 25% of EBIT)
  let grossSales = 0;
  let discounts = 0;
  thisMonthSales.forEach((t) => {
    grossSales += t.subtotal;
    discounts += t.discount;
  });
  const netSales = grossSales - discounts;
  const cogs = netSales * 0.6; // estimate 60% COGS
  const totalExpenses = scopedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const ebit = Math.max(0, netSales - cogs - totalExpenses);
  const incomeTaxProvision = ebit * 0.25;

  // TDS and Advance Tax Paid (from tax payments logs)
  const advanceTaxPaid = taxPayments
    .filter((tp) => tp.description.includes("Advance") && tp.date.startsWith(activeYearMonth))
    .reduce((sum, tp) => sum + tp.amount, 0);

  const tdsDeducted = taxPayments
    .filter((tp) => tp.description.includes("TDS") && tp.date.startsWith(activeYearMonth))
    .reduce((sum, tp) => sum + tp.amount, 0);

  // Property Tax (PCMC)
  const propertyTax = taxPayments
    .filter((tp) => tp.description.includes("Property") && tp.date.startsWith(activeYearMonth))
    .reduce((sum, tp) => sum + tp.amount, 0);

  // --- Graph 1: GST Inflow vs Outflow Trend ---
  const gstTrendData = [
    { name: "Week 1", Collected: gstCollected * 0.2, Credit: inputTaxCredit * 0.2, Net: gstPayable * 0.2 },
    { name: "Week 2", Collected: gstCollected * 0.35, Credit: inputTaxCredit * 0.3, Net: gstPayable * 0.35 },
    { name: "Week 3", Collected: gstCollected * 0.65, Credit: inputTaxCredit * 0.6, Net: gstPayable * 0.6 },
    { name: "Week 4", Collected: gstCollected, Credit: inputTaxCredit, Net: gstPayable },
  ];

  // --- Graph 2: Tax Type Distribution ---
  const pieData = [
    { name: "GST Liability", value: gstPayable },
    { name: "Income Tax Provision", value: incomeTaxProvision },
    { name: "PCMC Property Tax", value: propertyTax },
    { name: "TDS / Other Duties", value: tdsDeducted },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax & Compliance Control"
        subtitle="Monitor corporate GST liabilities, Input Tax Credits (ITC), provisional income tax reserves, and challan filing logs."
      />

      {/* Advisory Banner */}
      <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-xl flex gap-3 text-sm text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/60 dark:text-indigo-300">
        <Shield className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Compliance Notice:</span> This panel tracks automated tax provisions and ledger records dynamically compiled from POS sales, utilities, and procurement. Consult a chartered accountant for official tax filings and submissions.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Net GST Payable"
          value={gstPayable}
          format="inr"
          icon={<Landmark className="h-5 w-5 text-amber-500" />}
        />
        <KpiCard
          label="GST Input Tax Credit"
          value={inputTaxCredit}
          format="inr"
          icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Direct Tax Provision"
          value={incomeTaxProvision}
          format="inr"
          icon={<FileText className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="PCMC Property Tax"
          value={propertyTax}
          format="inr"
          icon={<Wallet className="h-5 w-5 text-pink-500" />}
        />
      </div>

      {/* Grid: Sections breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GST Control Card */}
        <SectionCard title="GST Breakdown (Current Quarter)">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-500">GST Collected (Sales Outflow):</span>
              <span className="font-semibold text-zinc-900">{fmtINR(gstCollected)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-500">Input Tax Credit (Procurement Inflow):</span>
              <span className="font-semibold text-zinc-900 text-emerald-600">-{fmtINR(inputTaxCredit)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-semibold text-zinc-700">Net GST Liability:</span>
              <span className="font-bold text-lg text-rose-600">{fmtINR(gstPayable)}</span>
            </div>
          </div>
        </SectionCard>

        {/* Corporate Direct Tax Provision */}
        <SectionCard title="Direct Corporate Tax Provision">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-500">Income Tax Provision (Provisional):</span>
              <span className="font-semibold text-zinc-900">{fmtINR(incomeTaxProvision)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-500">Advance Tax Paid:</span>
              <span className="font-semibold text-zinc-900 text-emerald-600">-{fmtINR(advanceTaxPaid)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-semibold text-zinc-700">Remaining Tax Provisions:</span>
              <span className={`font-bold text-lg ${incomeTaxProvision - advanceTaxPaid > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {fmtINR(incomeTaxProvision - advanceTaxPaid)}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Municipal & Compliance Licenses */}
        <SectionCard title="Local Taxes & Signage Licensing">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-500">PCMC Property Tax (Annual):</span>
              <span className="font-semibold text-zinc-900">{fmtINR(propertyTax)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-500">Trade License fee (Renewable):</span>
              <span className="font-semibold text-zinc-900">₹42,000</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-zinc-500">Signage / Rooftop billboard tax:</span>
              <span className="font-semibold text-zinc-900">₹28,000</span>
            </div>
          </div>
        </SectionCard>

      </div>

      {/* Dynamic Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GST Trend Chart */}
        <div className="lg:col-span-2">
          <SectionCard title="GST Liability Progression Chart">
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gstTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: number) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                  />
                  <Tooltip formatter={(val: any) => fmtINR(Number(val))} />
                  <Area type="monotone" dataKey="Collected" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={2} />
                  <Area type="monotone" dataKey="Credit" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Net" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Tax distribution */}
        <SectionCard title="Tax Class Breakdown">
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => fmtINR(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, index) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-zinc-500">{d.name}</span>
                </div>
                <span className="font-semibold text-zinc-800">{fmtINR(d.value)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>

      {/* Challan Filing history */}
      <SectionCard
        title="Tax Challan Filings & Payments Log"
        actions={
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 h-9 text-xs"
            onClick={() => setShowFilingModal(true)}
          >
            <Plus className="h-4 w-4" /> Record Challan Payment
          </Button>
        }
      >
        {taxPayments.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm">
            No tax challan payments recorded in this ledger period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                <tr>
                  <th className="px-4 py-3">Challan Ref / Reference</th>
                  <th className="px-4 py-3">Journal Entry ID</th>
                  <th className="px-4 py-3 text-right">Tax Paid Amount</th>
                  <th className="px-4 py-3 text-center">Filing Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {taxPayments.map((tp) => (
                  <tr key={tp.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900">Challan #{tp.referenceId || "N/A"}</div>
                      <div className="text-xs text-zinc-500">{tp.description}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{tp.journalId}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">-{fmtINR(tp.amount)}</td>
                    <td className="px-4 py-3 text-center text-zinc-500 text-xs">
                      {new Date(tp.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Record Tax Filing Modal */}
      <Dialog open={showFilingModal} onOpenChange={setShowFilingModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Tax Challan Payment</DialogTitle>
            <DialogDescription>
              Post a tax payment transaction to the General Ledger. This will credit Cash (1000) and debit Tax & Compliance Expense (5600).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordTax} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Tax Category</Label>
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST Payment</SelectItem>
                  <SelectItem value="Corporate Income Tax">Corporate Income Tax / Advance Tax</SelectItem>
                  <SelectItem value="Property Tax">PCMC Property Tax</SelectItem>
                  <SelectItem value="TDS">TDS Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tax Amount (₹)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Challan Ref / Ref #</Label>
                <Input
                  placeholder="e.g. CIN-948123"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Filing Memo / Description</Label>
              <Input
                placeholder="e.g. Q1 GST Filing payment Challan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowFilingModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Authorize Challan Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
