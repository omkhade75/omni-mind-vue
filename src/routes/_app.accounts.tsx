import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { getAccountsDataServer, createFixedDepositServer, createCorporateLoanServer, repayLoanServer, type FixedDepositItem, type CorporateLoanItem } from "@/lib/server-accounts";
import { toast } from "sonner";
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet, Receipt, CreditCard, Landmark, Coins, Plus, CheckCircle } from "lucide-react";
import { fmtINR } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts, Loans & FDs — OmniMind AI" },
      { name: "description", content: "Accounts Receivable, Payable, Bank Fixed Deposits, and Loan tracker." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    cashBalance: number;
    receivables: any[];
    payables: any[];
    fds: FixedDepositItem[];
    loans: CorporateLoanItem[];
  }>({ cashBalance: 0, receivables: [], payables: [], fds: [], loans: [] });

  // Dialog States
  const [showFDModal, setShowFDModal] = useState(false);
  const [fdBank, setFdBank] = useState("");
  const [fdPrincipal, setFdPrincipal] = useState("");
  const [fdRate, setFdRate] = useState("");
  const [fdDuration, setFdDuration] = useState("12");
  const [savingFD, setSavingFD] = useState(false);

  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanBank, setLoanBank] = useState("");
  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanRate, setLoanRate] = useState("");
  const [loanDuration, setLoanDuration] = useState("24");
  const [savingLoan, setSavingLoan] = useState(false);

  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<CorporateLoanItem | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [savingRepay, setSavingRepay] = useState(false);

  const loadData = async () => {
    try {
      const result = await getAccountsDataServer({
        role: user?.role || "owner",
        email: user?.email || ""
      });
      setData(result as any);
    } catch (e) {
      toast.error("Failed to load accounts data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateFD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdBank.trim() || !fdPrincipal || !fdRate) {
      toast.error("All bank Fixed Deposit details are required.");
      return;
    }

    try {
      setSavingFD(true);
      await createFixedDepositServer({
        bankName: fdBank,
        principal: Number(fdPrincipal),
        interestRate: Number(fdRate),
        duration: Number(fdDuration),
        role: user?.role || "owner",
        emailUser: user?.email || "",
      });

      toast.success("Bank Fixed Deposit booked successfully!");
      setFdBank("");
      setFdPrincipal("");
      setFdRate("");
      setFdDuration("12");
      setShowFDModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create Fixed Deposit.");
    } finally {
      setSavingFD(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanBank.trim() || !loanPrincipal || !loanRate) {
      toast.error("All loan terms are required.");
      return;
    }

    try {
      setSavingLoan(true);
      await createCorporateLoanServer({
        bankName: loanBank,
        principal: Number(loanPrincipal),
        interestRate: Number(loanRate),
        duration: Number(loanDuration),
        role: user?.role || "owner",
        emailUser: user?.email || "",
      });

      toast.success("Loan disbursed successfully & Cash credited!");
      setLoanBank("");
      setLoanPrincipal("");
      setLoanRate("");
      setLoanDuration("24");
      setShowLoanModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to disburse loan.");
    } finally {
      setSavingLoan(false);
    }
  };

  const handleRepayLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !repayAmount) return;

    try {
      setSavingRepay(true);
      await repayLoanServer({
        loanId: selectedLoan.id,
        amount: Number(repayAmount),
        role: user?.role || "owner",
        emailUser: user?.email || "",
      });

      toast.success("Loan repayment logged & Cash debited!");
      setRepayAmount("");
      setShowRepayModal(false);
      setSelectedLoan(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to repay loan.");
    } finally {
      setSavingRepay(false);
    }
  };

  const receivables = data?.receivables || [];
  const payables = data?.payables || [];
  const fds = data?.fds || [];
  const loans = data?.loans || [];

  const totalReceivables = receivables.reduce((sum, r) => sum + (r?.amount || 0), 0);
  const totalPayables = payables.reduce((sum, p) => sum + (p?.amount || 0), 0);
  const totalFDs = fds.reduce((sum, f) => sum + (f?.principal || 0), 0);
  const totalLoans = loans.filter(l => l?.status === "Active").reduce((sum, l) => sum + (l?.balance || 0), 0);

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
        title="Accounts, Loans & Fixed Deposits"
        description="Comprehensive treasury tracking of mall bank accounts, active FDs, outstanding debts, and customer/supplier ledger balances."
      />

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Bank Cash Balance"
          value={data?.cashBalance || 0}
          format="inr"
          icon={<Wallet className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Total Receivables"
          value={totalReceivables}
          format="inr"
          icon={<ArrowDownRight className="h-5 w-5 text-zinc-400" />}
        />
        <KpiCard
          label="Total Payables"
          value={totalPayables}
          format="inr"
          icon={<ArrowUpRight className="h-5 w-5 text-rose-500" />}
        />
        <KpiCard
          label="Total Bank Fixed Deposits"
          value={totalFDs}
          format="inr"
          icon={<Landmark className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="Outstanding Loans"
          value={totalLoans}
          format="inr"
          icon={<Coins className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Grid: Columns of Accounts & FDs/Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Receivables and Payables */}
        <div className="space-y-6">
          <SectionCard title="Accounts Receivable (Money to Come)" icon={<Receipt className="h-5 w-5 text-emerald-500" />}>
            {receivables.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                No pending customer payments receivable.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                    <tr>
                      <th className="px-4 py-3">Txn #</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {receivables.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-semibold text-zinc-900">{r.transactionNumber}</td>
                        <td className="px-4 py-3 text-zinc-600">{r.customerName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-900">{fmtINR(r.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusPill tone={r.status === "Pending" ? "warning" : "danger"}>
                            {r.status}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Accounts Payable (Money to Settle)" icon={<CreditCard className="h-5 w-5 text-rose-500" />}>
            {payables.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                No pending supplier invoice payments.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                    <tr>
                      <th className="px-4 py-3">PO #</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {payables.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-semibold text-zinc-900">{p.poNumber}</td>
                        <td className="px-4 py-3 text-zinc-600">{p.supplierName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-900">{fmtINR(p.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusPill tone={p.status === "Pending" ? "warning" : "danger"}>
                            {p.status}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Side: Fixed Deposits & Outstanding Loans */}
        <div className="space-y-6">
          <SectionCard
            title="Treasury Fixed Deposits (GL Asset 1400)"
            icon={<Landmark className="h-5 w-5 text-indigo-500" />}
            action={
              <Button size="sm" variant="outline" className="h-7 text-xs flex items-center gap-1" onClick={() => setShowFDModal(true)}>
                <Plus className="h-3.5 w-3.5" /> Book FD
              </Button>
            }
          >
            {fds.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                No bank fixed deposits booked.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                    <tr>
                      <th className="px-4 py-3">Bank/FD Details</th>
                      <th className="px-4 py-3 text-right">Principal</th>
                      <th className="px-4 py-3 text-right">Yield (p.a.)</th>
                      <th className="px-4 py-3 text-center">Matures</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {fds.map((f) => (
                      <tr key={f.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900">{f.bankName}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">Term: {f.duration} months</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-900">{fmtINR(f.principal)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">+{f.interestRate}%</td>
                        <td className="px-4 py-3 text-center text-zinc-600 text-xs">
                          {new Date(f.matureDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Corporate Loans & Credit Lines"
            icon={<Coins className="h-5 w-5 text-amber-500" />}
            action={
              <Button size="sm" variant="outline" className="h-7 text-xs flex items-center gap-1" onClick={() => setShowLoanModal(true)}>
                <Plus className="h-3.5 w-3.5" /> Acquire Loan
              </Button>
            }
          >
            {loans.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                No active loans logged in treasury reserves.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 font-medium border-y">
                    <tr>
                      <th className="px-4 py-3">Creditor Institution</th>
                      <th className="px-4 py-3 text-right">Principal</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {loans.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900">{l.bankName}</div>
                          <div className="text-[10px] text-zinc-500">Rate: {l.interestRate}% • {l.duration}m term</div>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500">{fmtINR(l.principal)}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">{fmtINR(l.balance)}</td>
                        <td className="px-4 py-3 text-center">
                          {l.status === "Active" ? (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                              onClick={() => {
                                setSelectedLoan(l);
                                setRepayAmount(Math.min(10000, l.balance).toString());
                                setShowRepayModal(true);
                              }}
                            >
                              Repay
                            </Button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-0.5">
                              <CheckCircle className="h-3 w-3" /> Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

      </div>

      {/* --- DIALOG MODALS --- */}

      {/* Book FD Modal */}
      <Dialog open={showFDModal} onOpenChange={setShowFDModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Book Bank Fixed Deposit</DialogTitle>
            <DialogDescription>
              Allocate treasury cash reserves to high-yielding bank FDs. This will post a General Ledger transfer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFD} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Bank / Issuer Institution</Label>
              <Input value={fdBank} onChange={(e) => setFdBank(e.target.value)} placeholder="e.g. ICICI Bank FD" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Principal (₹)</Label>
                <Input type="number" value={fdPrincipal} onChange={(e) => setFdPrincipal(e.target.value)} placeholder="e.g. 100000" required />
              </div>
              <div className="space-y-1">
                <Label>Interest Rate (p.a. %)</Label>
                <Input type="number" step="0.01" value={fdRate} onChange={(e) => setFdRate(e.target.value)} placeholder="e.g. 7.2" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>FD Term duration</Label>
              <Select value={fdDuration} onValueChange={setFdDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                  <SelectItem value="36">36 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowFDModal(false)} disabled={savingFD}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={savingFD}>
                {savingFD ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Authorize FD Allocation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Acquire Loan Modal */}
      <Dialog open={showLoanModal} onOpenChange={setShowLoanModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Corporate Loan / Credit Line</DialogTitle>
            <DialogDescription>
              Record newly acquired funding or bank credit lines. This will credit Cash assets and debit Liabilities.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLoan} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Lending Institution</Label>
              <Input value={loanBank} onChange={(e) => setLoanBank(e.target.value)} placeholder="e.g. SBI Capital Finance" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Principal (₹)</Label>
                <Input type="number" value={loanPrincipal} onChange={(e) => setLoanPrincipal(e.target.value)} placeholder="e.g. 500000" required />
              </div>
              <div className="space-y-1">
                <Label>Interest Rate (p.a. %)</Label>
                <Input type="number" step="0.01" value={loanRate} onChange={(e) => setLoanRate(e.target.value)} placeholder="e.g. 9.5" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Loan Duration term</Label>
              <Select value={loanDuration} onValueChange={setLoanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                  <SelectItem value="36">36 Months</SelectItem>
                  <SelectItem value="60">60 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowLoanModal(false)} disabled={savingLoan}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={savingLoan}>
                {savingLoan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Disbursement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Repay Loan Modal */}
      <Dialog open={showRepayModal} onOpenChange={setShowRepayModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Settle Loan Installment</DialogTitle>
            <DialogDescription>
              Record principal repayment towards your loan at <strong>{selectedLoan?.bankName}</strong>. This debits liabilities and credits cash.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRepayLoan} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Current Outstanding Balance</Label>
              <Input value={selectedLoan ? fmtINR(selectedLoan.balance) : ""} disabled className="bg-zinc-50" />
            </div>
            <div className="space-y-1">
              <Label>Repayment Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                max={selectedLoan ? selectedLoan.balance : undefined}
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="Repayment amount"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowRepayModal(false)} disabled={savingRepay}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold" disabled={savingRepay}>
                {savingRepay ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Authorize Repayment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
