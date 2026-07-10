import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import {
  getCustomersServer,
  addCustomerServer,
  editCustomerServer,
  archiveCustomerServer,
  type CustomerListItem
} from "@/lib/server-customers";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit, Archive, Loader2, PhoneCall } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({
    meta: [
      { title: "Customer Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Segments, lifetime value, churn risk, and customer 360° profiles.",
      },
    ],
  }),
  component: Customers,
});

const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

function Customers() {
  const { openCustomer360 } = useBusinessData();
  const { user } = useAuth();

  // Search, Filters & Sorting state
  const [search, setSearch] = useState("");
  const [loyaltyTier, setLoyaltyTier] = useState("all");
  const [segment, setSegment] = useState("all");
  const [status, setStatus] = useState("Active");
  const [sortBy, setSortBy] = useState("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Customer List state
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCust, setSelectedCust] = useState<CustomerListItem | null>(null);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLoyaltyTier, setFormLoyaltyTier] = useState("Regular");
  const [formCustomerType, setFormCustomerType] = useState("B2C");
  const [formPrefDept, setFormPrefDept] = useState("dept-fashion");
  const [formNotes, setFormNotes] = useState("");

  // Load Customers
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await getCustomersServer({
        data: {
          search,
          loyaltyTier: loyaltyTier === "all" ? undefined : loyaltyTier,
          segment: segment === "all" ? undefined : segment,
          status,
          sortBy,
          sortOrder,
          role: user?.role || "owner",
          email: user?.email || "",
        }
      });
      setCustomers(res);
      if (res.length > 0) {
        setSelectedCust(res[0]);
      } else {
        setSelectedCust(null);
      }
    } catch (e: any) {
      toast.error("Failed to load customers from database.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Reload when filters change
  useEffect(() => {
    loadCustomers();
  }, [search, loyaltyTier, segment, status, sortBy, sortOrder, user]);

  // Handle Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName || !formLastName || !formEmail || !formPhone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await addCustomerServer({
        data: {
          firstName: formFirstName,
          lastName: formLastName,
          email: formEmail,
          phone: formPhone,
          loyaltyTier: formLoyaltyTier,
          preferredDepartmentId: formPrefDept || null,
          notes: formNotes,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        }
      });
      toast.success(`Successfully registered customer ${formFirstName} ${formLastName}.`);
      setAddOpen(false);
      resetForm();
      loadCustomers();
    } catch (e: any) {
      toast.error(e.message || "Failed to create customer.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Customer
  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust) return;
    if (!formFirstName || !formLastName || !formEmail || !formPhone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await editCustomerServer({
        data: {
          id: selectedCust.id,
          firstName: formFirstName,
          lastName: formLastName,
          email: formEmail,
          phone: formPhone,
          loyaltyTier: formLoyaltyTier,
          preferredDepartmentId: formPrefDept || null,
          notes: formNotes,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        }
      });
      toast.success("Successfully updated customer details.");
      setEditOpen(false);
      loadCustomers();
    } catch (e: any) {
      toast.error(e.message || "Failed to edit customer.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Archive Customer
  const handleArchiveCustomer = async () => {
    if (!selectedCust) return;
    if (!confirm(`Are you sure you want to archive customer ${selectedCust.name}?`)) return;
    try {
      await archiveCustomerServer({
        data: {
          id: selectedCust.id,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        }
      });
      toast.success("Customer archived successfully.");
      loadCustomers();
    } catch (e: any) {
      toast.error(e.message || "Failed to archive customer.");
    }
  };

  const resetForm = () => {
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormPhone("");
    setFormLoyaltyTier("Regular");
    setFormCustomerType("B2C");
    setFormPrefDept("dept-fashion");
    setFormNotes("");
  };

  const openEditDialog = () => {
    if (!selectedCust) return;
    setFormFirstName(selectedCust.firstName);
    setFormLastName(selectedCust.lastName);
    setFormEmail(selectedCust.email);
    setFormPhone(selectedCust.phone);
    setFormLoyaltyTier(selectedCust.segment);
    // map favDept back to id
    let deptId = "dept-fashion";
    if (selectedCust.favDept === "Electronics") deptId = "dept-electronics";
    else if (selectedCust.favDept === "Grocery") deptId = "dept-grocery";
    else if (selectedCust.favDept === "Sports") deptId = "dept-sports";
    else if (selectedCust.favDept === "Beauty") deptId = "dept-beauty";
    setFormPrefDept(deptId);
    setFormNotes("");
    setEditOpen(true);
  };

  // Derived KPI values from list
  const totalSpend = customers.reduce((sum, c) => sum + c.spend, 0);
  const avgLtv = customers.length > 0 ? Math.round(totalSpend / customers.length) : 0;
  const churnRiskCount = customers.filter(c => c.churn > 50).length;

  // Segment breakdown
  const segmentCounts = customers.reduce((acc: Record<string, number>, c) => {
    acc[c.segment] = (acc[c.segment] || 0) + 1;
    return acc;
  }, {});

  const chartSegments = Object.keys(segmentCounts).map(name => ({
    name,
    v: segmentCounts[name]
  }));

  // Acquisition last 30 days
  const acquisitionData = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const dateStr = `2026-05-${String(day).padStart(2, "0")}`;
    const newJoined = customers.filter(c => c.joined === dateStr).length;
    return {
      d: `${day}`,
      new: newJoined,
      returning: Math.round(2 + Math.sin(day / 2) * 1.5 + (day % 3)),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Customer Intelligence"
          subtitle="Segments, lifetime value, retention, and churn prediction."
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-hairline bg-surface hover:text-[#007AFF] transition-colors gap-2"
            onClick={() => toast.info("AI Voice Campaigns are coming soon! The AI assistant will autonomously call customers to share personalized offers.")}
          >
            <PhoneCall className="h-4 w-4 text-[#007AFF]" /> AI Voice Call
          </Button>
          <Button
            variant="outline"
            className="border-hairline bg-surface hover:text-[#25D366] transition-colors gap-2"
            onClick={() => toast.info("WhatsApp Mass Broadcasting is coming soon! You will be able to send offers and greetings to all matching customers.")}
          >
            <WhatsappIcon className="h-4 w-4 text-[#25D366]" /> Notify Customers
          </Button>
          <Button
            onClick={() => { resetForm(); setAddOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Total Customers" v={fmtNum(customers.length)} />
        <Kpi label="New (30d)" v={fmtNum(customers.filter(c => c.joined.startsWith("2026-05")).length)} />
        <Kpi label="Returning Rate" v={customers.length > 0 ? `${Math.round((customers.filter(c => c.visits > 1).length / customers.length) * 100)}%` : "0%"} />
        <Kpi label="Repeat Rate" v={customers.length > 0 ? `${Math.round((customers.filter(c => c.visits > 2).length / customers.length) * 100)}%` : "0%"} />
        <Kpi label="Avg LTV" v={fmtINR(avgLtv, { compact: true })} />
        <Kpi label="High Churn Risk" v={fmtNum(churnRiskCount)} tone={churnRiskCount > 0 ? "warning" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Segments Breakdown" className="xl:col-span-1">
          <div className="h-56">
            {chartSegments.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No segment data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartSegments}
                    dataKey="v"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                  >
                    {chartSegments.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Acquisition — May 2026" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisitionData}>
                <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={ttStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new" fill="var(--color-primary)" name="New" radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="returning"
                  fill="var(--color-cyan)"
                  name="Returning Activity"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface border border-hairline p-3 rounded-lg">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, code..."
            className="pl-9 bg-sidebar border-hairline text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-[140px]">
          <Select value={loyaltyTier} onValueChange={setLoyaltyTier}>
            <SelectTrigger className="bg-sidebar border-hairline text-xs">
              <SelectValue placeholder="Loyalty Tier" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-hairline text-foreground">
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="Loyal">Loyal</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[140px]">
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="bg-sidebar border-hairline text-xs">
              <SelectValue placeholder="Risk Segment" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-hairline text-foreground">
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="New">Joined Mar-May</SelectItem>
              <SelectItem value="At Risk">At Risk (High)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[120px]">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-sidebar border-hairline text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-hairline text-foreground">
              <SelectItem value="Active">Active Only</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
              <SelectItem value="all">All Statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Database Customer Directory">
          <div className="overflow-x-auto min-h-[300px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : customers.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No matching customer records found in the database.
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline">
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 text-right font-medium">Visits</th>
                    <th className="pb-2 text-right font-medium">Total Spend</th>
                    <th className="pb-2 text-right font-medium">AOV</th>
                    <th className="pb-2 font-medium">Preferred</th>
                    <th className="pb-2 font-medium">Segment</th>
                    <th className="pb-2 text-right font-medium">Churn Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCust(c)}
                      className={cn(
                        "cursor-pointer hover:bg-surface/50 transition-colors",
                        selectedCust?.id === c.id && "bg-primary/10",
                      )}
                    >
                      <td className="py-2.5">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.customerCode} · joined {c.joined}
                        </p>
                      </td>
                      <td className="py-2.5 text-right">{fmtNum(c.visits)}</td>
                      <td className="py-2.5 text-right font-semibold">
                        {fmtINR(c.spend, { compact: true })}
                      </td>
                      <td className="py-2.5 text-right">{fmtINR(c.aov)}</td>
                      <td className="py-2.5 text-muted-foreground">{c.favDept}</td>
                      <td className="py-2.5">
                        <StatusPill
                          tone={
                            c.segment === "VIP"
                              ? "violet"
                              : c.segment === "Loyal"
                                ? "success"
                                : c.segment === "Regular"
                                  ? "info"
                                  : "default"
                          }
                        >
                          {c.segment}
                        </StatusPill>
                      </td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-medium",
                          c.churn > 60
                            ? "text-destructive"
                            : c.churn > 25
                              ? "text-warning"
                              : "text-success",
                        )}
                      >
                        {c.churn}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </SectionCard>

        {selectedCust && (
          <SectionCard
            title="Customer Profile Summary"
            subtitle={selectedCust.name}
            actions={
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-hairline bg-surface text-xs font-semibold text-primary hover:bg-primary/10"
                  onClick={openEditDialog}
                >
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                {selectedCust.status !== "Archived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-hairline bg-surface text-xs font-semibold text-destructive hover:bg-destructive/10"
                    onClick={handleArchiveCustomer}
                  >
                    <Archive className="h-3 w-3 mr-1" /> Archive
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-hairline bg-surface text-xs font-semibold"
                  onClick={() => openCustomer360(selectedCust.id)}
                >
                  360° Profile
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Stat label="Total Spend" v={fmtINR(selectedCust.spend, { compact: true })} />
              <Stat label="Avg Basket" v={fmtINR(selectedCust.aov)} />
              <Stat label="Visits" v={fmtNum(selectedCust.visits)} />
              <Stat label="Joined Date" v={selectedCust.joined} />
              <Stat label="Segment" v={selectedCust.segment} />
              <Stat
                label="Churn Risk"
                v={`${selectedCust.churn}%`}
                tone={selectedCust.churn > 60 ? "danger" : "default"}
              />
            </div>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Email Address
              </p>
              <p className="mt-1 text-sm font-semibold">{selectedCust.email}</p>
            </div>

            <div className="mt-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Phone Number
              </p>
              <p className="mt-1 text-sm font-semibold">{selectedCust.phone}</p>
            </div>

            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
              <p className="font-semibold text-primary">CRM Retention Recommendation</p>
              <p className="mt-1 text-foreground/90">
                {selectedCust.churn > 60
                  ? `Trigger win-back email outreach targeting ${selectedCust.favDept}. Estimated LTV retention: ${fmtINR(selectedCust.spend)}.`
                  : selectedCust.segment === "VIP"
                    ? "Invite to private Fashion showcase for next arrivals. Projected sales conversion: 22%."
                    : `Provide promotional bundle offer matching preferred department (${selectedCust.favDept}).`}
              </p>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar border border-hairline text-foreground">
          <DialogHeader>
            <DialogTitle>Register New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-firstname">First Name *</Label>
                <Input
                  id="add-firstname"
                  required
                  className="bg-surface border-hairline"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-lastname">Last Name *</Label>
                <Input
                  id="add-lastname"
                  required
                  className="bg-surface border-hairline"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email Address *</Label>
              <Input
                id="add-email"
                type="email"
                required
                className="bg-surface border-hairline"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-phone">Phone Number *</Label>
              <Input
                id="add-phone"
                required
                placeholder="+91 XXXXX XXXXX"
                className="bg-surface border-hairline"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Loyalty Tier</Label>
                <Select value={formLoyaltyTier} onValueChange={setFormLoyaltyTier}>
                  <SelectTrigger className="bg-surface border-hairline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline">
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Loyal">Loyal</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Dept</Label>
                <Select value={formPrefDept} onValueChange={setFormPrefDept}>
                  <SelectTrigger className="bg-surface border-hairline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline">
                    <SelectItem value="dept-fashion">Fashion</SelectItem>
                    <SelectItem value="dept-electronics">Electronics</SelectItem>
                    <SelectItem value="dept-grocery">Grocery</SelectItem>
                    <SelectItem value="dept-sports">Sports & Outdoors</SelectItem>
                    <SelectItem value="dept-beauty">Beauty & Cosmetics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-notes">Profile Notes</Label>
              <Textarea
                id="add-notes"
                className="bg-surface border-hairline"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar border border-hairline text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Customer Information</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-firstname">First Name *</Label>
                <Input
                  id="edit-firstname"
                  required
                  className="bg-surface border-hairline"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-lastname">Last Name *</Label>
                <Input
                  id="edit-lastname"
                  required
                  className="bg-surface border-hairline"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email Address *</Label>
              <Input
                id="edit-email"
                type="email"
                required
                className="bg-surface border-hairline"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                required
                className="bg-surface border-hairline"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Loyalty Tier</Label>
                <Select value={formLoyaltyTier} onValueChange={setFormLoyaltyTier}>
                  <SelectTrigger className="bg-surface border-hairline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline">
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Loyal">Loyal</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Dept</Label>
                <Select value={formPrefDept} onValueChange={setFormPrefDept}>
                  <SelectTrigger className="bg-surface border-hairline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline">
                    <SelectItem value="dept-fashion">Fashion</SelectItem>
                    <SelectItem value="dept-electronics">Electronics</SelectItem>
                    <SelectItem value="dept-grocery">Grocery</SelectItem>
                    <SelectItem value="dept-sports">Sports & Outdoors</SelectItem>
                    <SelectItem value="dept-beauty">Beauty & Cosmetics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Profile Notes</Label>
              <Textarea
                id="edit-notes"
                className="bg-surface border-hairline"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
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

function Kpi({ label, v, tone }: { label: string; v: string; tone?: "warning" }) {
  return (
    <div className="card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-display text-lg font-semibold ${tone === "warning" ? "text-warning" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}

function Stat({ label, v, tone }: { label: string; v: string; tone?: "default" | "danger" }) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${tone === "danger" ? "text-destructive" : ""}`}>
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
