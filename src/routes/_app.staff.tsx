import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import { useBusinessData } from "@/lib/business-context";
import { useState } from "react";
import { Users, UserCheck, ShieldAlert, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addStaffServer, archiveStaffServer } from "@/lib/server-staff";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/staff")({
  head: () => ({
    meta: [
      { title: "Staff & Managers — OmniMind AI" },
      { name: "description", content: "Team hierarchy, attendance, and department managers." },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { staff, forceRefresh } = useBusinessData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("Fashion");
  const [designation, setDesignation] = useState("Associate");
  const [salary, setSalary] = useState("45000");
  const [shift, setShift] = useState("Morning");
  const [joiningDate, setJoiningDate] = useState("2026-01-15");

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await addStaffServer({
        data: {
          name,
          email,
          phone,
          departmentId,
          designation,
          salary: parseFloat(salary) || 30000,
          shift,
          joiningDate,
          role: "owner",
          emailUser: "",
        },
      });
      toast.success("New staff member registered successfully!");
      setShowAddModal(false);
      setName("");
      setEmail("");
      setPhone("");
      forceRefresh();
    } catch (err) {
      toast.error("Failed to register staff.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveStaff = async (id: string) => {
    try {
      await archiveStaffServer({ data: { id, role: "owner", email: "" } });
      toast.success("Staff status updated to Inactive.");
      forceRefresh();
    } catch (err) {
      toast.error("Failed to archive staff.");
    }
  };

  // Group staff by department for summary statistics
  const deptCount = staff.reduce(
    (acc, cur) => {
      if (cur.status === "Active") {
        acc[cur.departmentId] = (acc[cur.departmentId] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Managers"
        subtitle="Manage mall team members, shift allocations, and salary records."
        actions={
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add Staff
          </Button>
        }
      />

      {/* KPI Counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total Headcount
            </p>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold font-display">
            {staff.filter((s) => s.status === "Active").length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active team members</p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Today's Attendance
            </p>
            <UserCheck className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold font-display">
            {Math.round(staff.filter((s) => s.status === "Active").length * 0.96)} /{" "}
            {staff.filter((s) => s.status === "Active").length}
          </p>
          <p className="text-[10px] text-success mt-0.5">96% average attendance rate</p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Treasury Payroll Roll
            </p>
            <ShieldAlert className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-bold font-display">
            ₹
            {(
              staff
                .filter((s) => s.status === "Active")
                .reduce((sum, s) => sum + s.salary, 0) / 100000
            ).toFixed(2)}
            L
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Monthly salary payout pool</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Department Distribution */}
        <SectionCard title="Headcount by Department" className="lg:col-span-1">
          <ul className="divide-y divide-hairline">
            {Object.entries(deptCount).map(([dept, count]) => (
              <li key={dept} className="flex justify-between py-2.5 text-xs">
                <span className="font-medium text-muted-foreground">{dept}</span>
                <span className="font-semibold text-foreground">{count} present</span>
              </li>
            ))}
            {Object.keys(deptCount).length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No staff records registered yet.
              </p>
            )}
          </ul>
        </SectionCard>

        {/* Staff Table */}
        <SectionCard title="Team Directory" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-semibold">Code</th>
                  <th className="pb-2 font-semibold">Name</th>
                  <th className="pb-2 font-semibold">Dept</th>
                  <th className="pb-2 font-semibold">Role</th>
                  <th className="pb-2 font-semibold">Shift</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 font-mono text-[10px] text-muted-foreground">
                      {s.employeeCode}
                    </td>
                    <td className="py-2.5">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="py-2.5">{s.departmentId}</td>
                    <td className="py-2.5">{s.designation}</td>
                    <td className="py-2.5">{s.shift}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.status === "Active" ? "bg-success/15 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {s.status === "Active" && (
                        <button
                          onClick={() => handleArchiveStaff(s.id)}
                          className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Deactivate employee"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No staff members registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Staff Member</DialogTitle>
            <DialogDescription>
              Register employee details in general ledger HR database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="staff-name">Full Name</Label>
                <Input
                  id="staff-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priyesh Deshmukh"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="staff-email">Email Address</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@grandsquare.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="staff-phone">Phone Number</Label>
                <Input
                  id="staff-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="staff-joining">Joining Date</Label>
                <Input
                  id="staff-joining"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="staff-dept">Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="staff-dept">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fashion">Fashion</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Grocery">Grocery</SelectItem>
                    <SelectItem value="Food Court">Food Court</SelectItem>
                    <SelectItem value="Beauty">Beauty</SelectItem>
                    <SelectItem value="Home & Living">Home & Living</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="staff-desig">Designation</Label>
                <Select value={designation} onValueChange={setDesignation}>
                  <SelectTrigger id="staff-desig">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Associate">Associate</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="staff-shift">Shift</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger id="staff-shift">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="staff-salary">Monthly Salary (₹)</Label>
              <Input
                id="staff-salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Registering..." : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
