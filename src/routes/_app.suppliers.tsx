import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR } from "@/lib/mock-data";
import { Sparkles, Truck, Plus, Loader2, Edit, Archive, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSuppliers, addSupplier, editSupplierServer, archiveSupplierServer } from "@/lib/server-suppliers";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/suppliers")({
  head: () => ({
    meta: [
      { title: "Supplier Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Supplier 360° with AI scoring across price, reliability, quality, and delivery.",
      },
    ],
  }),
  component: Suppliers,
});

function Suppliers() {
  const { openSupplier360 } = useBusinessData();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formLead, setFormLead] = useState("");

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await getSuppliers();
      setSuppliers(res);
      if (res.length > 0 && !sel) {
        setSel(res[0]);
      } else if (sel) {
        const updatedSel = res.find((s) => s.id === sel.id);
        if (updatedSel) setSel(updatedSel);
        else setSel(null);
      }
    } catch (e) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const openAdd = () => {
    setFormName("");
    setFormContact("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormTerms("Net 30");
    setFormLead("5");
    setAddOpen(true);
  };

  const openEdit = () => {
    if (!sel) return;
    setFormName(sel.name);
    setFormContact(sel.contact);
    setFormEmail(sel.email);
    setFormPhone(sel.phone);
    setFormAddress(sel.address);
    setFormTerms(sel.paymentTerms);
    setFormLead(sel.lead.toString());
    setEditOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Unauthorized");
    setSaving(true);
    try {
      await addSupplier({
        data: {
          name: formName,
          contactPerson: formContact,
          email: formEmail,
          phone: formPhone,
          address: formAddress,
          paymentTerms: formTerms,
          leadTimeDays: Number(formLead),
          role: user.role,
          emailUser: user.email,
        },
      });
      toast.success("Supplier added successfully");
      setAddOpen(false);
      loadSuppliers();
    } catch (e: any) {
      toast.error(e.message || "Failed to add supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sel) return toast.error("Unauthorized");
    setSaving(true);
    try {
      await editSupplierServer({
        data: {
          id: sel.id,
          name: formName,
          contactPerson: formContact,
          email: formEmail,
          phone: formPhone,
          address: formAddress,
          paymentTerms: formTerms,
          leadTimeDays: Number(formLead),
          role: user.role,
          emailUser: user.email,
        },
      });
      toast.success("Supplier updated successfully");
      setEditOpen(false);
      loadSuppliers();
    } catch (e: any) {
      toast.error(e.message || "Failed to update supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!user || !sel) return toast.error("Unauthorized");
    if (!confirm(`Are you sure you want to archive ${sel.name}?`)) return;
    try {
      await archiveSupplierServer({
        data: {
          id: sel.id,
          role: user.role,
          emailUser: user.email,
        },
      });
      toast.success("Supplier archived successfully");
      setSel(null);
      loadSuppliers();
    } catch (e: any) {
      toast.error(e.message || "Failed to archive supplier");
    }
  };

  const totalPending = suppliers.reduce((sum, s) => sum + s.pending, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Supplier Intelligence"
          subtitle="AI-scored supplier performance across the mall's vendor network."
        />
        {(user?.role === "Owner" || user?.role === "Admin" || user?.role === "Manager") && (
          <Button
            onClick={openAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Active Suppliers" v={suppliers.length.toString()} />
        <Kpi label="Pending Payments" v={fmtINR(totalPending, { compact: true })} tone="warning" />
        <Kpi label="Open POs" v={suppliers.filter(s => s.pending > 0).length.toString()} />
        <Kpi label="Avg Score" v={suppliers.length ? Math.round(suppliers.reduce((a, b) => a + b.score, 0) / suppliers.length).toString() : "0"} />
        <Kpi label="High Risk" v={suppliers.filter(s => s.risk === "High").length.toString()} tone={suppliers.filter(s => s.risk === "High").length > 0 ? "danger" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="All Suppliers">
          <div className="overflow-x-auto min-h-[300px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : suppliers.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No suppliers found in database.
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Supplier</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 text-right font-medium">Spend</th>
                    <th className="pb-2 text-right font-medium">Pending</th>
                    <th className="pb-2 text-right font-medium">On-time</th>
                    <th className="pb-2 text-right font-medium">Score</th>
                    <th className="pb-2 font-medium pl-4">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {suppliers.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSel(s)}
                      className={cn(
                        "cursor-pointer hover:bg-surface/50 transition-colors",
                        sel?.id === s.id && "bg-primary/10",
                      )}
                    >
                      <td className="py-2.5">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.contact}</p>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{s.category}</td>
                      <td className="py-2.5 text-right">{fmtINR(s.spend, { compact: true })}</td>
                      <td className="py-2.5 text-right text-warning">
                        {fmtINR(s.pending, { compact: true })}
                      </td>
                      <td className="py-2.5 text-right">{s.onTime}%</td>
                      <td className="py-2.5 text-right font-semibold">{s.score}</td>
                      <td className="py-2.5 pl-4">
                        <StatusPill
                          tone={
                            s.risk === "High" ? "danger" : s.risk === "Medium" ? "warning" : "success"
                          }
                        >
                          {s.risk}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </SectionCard>

        {sel && (
          <SectionCard
            title="Supplier 360° Profile"
            subtitle={sel.name}
            actions={
              <div className="flex gap-2">
                {(user?.role === "Owner" || user?.role === "Admin") && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-hairline bg-surface text-xs font-semibold text-primary hover:bg-primary/10"
                      onClick={openEdit}
                    >
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-hairline bg-surface text-xs font-semibold text-destructive hover:bg-destructive/10"
                      onClick={handleArchive}
                    >
                      <Archive className="h-3 w-3 mr-1" /> Archive
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-hairline bg-surface text-xs font-semibold"
                  onClick={() => openSupplier360(sel.id)}
                >
                  360° Profile
                </Button>
              </div>
            }
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg gradient-primary text-primary-foreground">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{sel.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {sel.category} · Contact: {sel.contact}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Email: {sel.email} · Phone: {sel.phone}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <ScoreBar label="Price Competitiveness" v={94 - (100 - sel.score) / 2} />
              <ScoreBar label="Reliability" v={sel.onTime} />
              <ScoreBar label="Quality" v={sel.quality} />
              <ScoreBar label="Delivery Speed" v={100 - sel.lead * 6} />
              <div className="hairline-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall AI Score</span>
                  <span className="font-display text-xl font-semibold text-primary">
                    {sel.score}/100
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> AI Analysis
              </div>
              <p className="mt-1 text-foreground/90 leading-relaxed">
                {sel.risk === "High"
                  ? "Delivery risk is elevated. Consider dual-sourcing critical SKUs and negotiating a service-level agreement."
                  : sel.risk === "Medium"
                    ? "Overall solid supplier but lead time is trending up. Explore alternate pricing terms."
                    : "Reliable partner. Maintain current relationship. Explore volume discount on next quarterly review."}
              </p>
            </div>
            
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full border-hairline bg-surface font-semibold text-xs h-9"
                onClick={() => window.location.href = `/purchase-orders?supplier=${sel.id}`}
              >
                <FileText className="h-3.5 w-3.5 mr-2" /> Create PO for {sel.name}
              </Button>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar border border-hairline text-foreground">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier Name *</Label>
              <Input
                required
                className="bg-surface border-hairline"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Person *</Label>
                <Input
                  required
                  className="bg-surface border-hairline"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  required
                  className="bg-surface border-hairline"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  required
                  className="bg-surface border-hairline"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lead Time (Days) *</Label>
                <Input
                  type="number"
                  required
                  className="bg-surface border-hairline"
                  value={formLead}
                  onChange={(e) => setFormLead(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <Input
                required
                className="bg-surface border-hairline"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar border border-hairline text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier Name *</Label>
              <Input
                required
                className="bg-surface border-hairline"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Person *</Label>
                <Input
                  required
                  className="bg-surface border-hairline"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  required
                  className="bg-surface border-hairline"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  required
                  className="bg-surface border-hairline"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lead Time (Days) *</Label>
                <Input
                  type="number"
                  required
                  className="bg-surface border-hairline"
                  value={formLead}
                  onChange={(e) => setFormLead(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <Input
                required
                className="bg-surface border-hairline"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, v, tone }: { label: string; v: string; tone?: "warning" | "danger" }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-display text-lg font-semibold ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}

function ScoreBar({ label, v }: { label: string; v: number }) {
  const p = Math.max(0, Math.min(100, v));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(p)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full gradient-primary" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
