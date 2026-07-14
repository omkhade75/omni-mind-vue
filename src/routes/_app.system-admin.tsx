import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle2, XCircle, Search, Building, User, Mail, MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getSystemAdminDashboardServer, approveRegistrationServer, rejectRegistrationServer } from "@/lib/server-system-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/system-admin")({
  head: () => ({
    meta: [{ title: "System Admin — OmniMind AI" }],
  }),
  component: SystemAdminPage,
});

function SystemAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user && !user.isSystemAdmin) {
      toast.error("Unauthorized access.");
      navigate({ to: "/command-center" });
    } else if (user && user.isSystemAdmin) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const result = await getSystemAdminDashboardServer();
      setData(result);
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      await approveRegistrationServer({ data: { id } });
      toast.success("Workspace provisioned and owner approved successfully.");
      setSelectedReg(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this registration?")) return;
    setIsProcessing(true);
    try {
      await rejectRegistrationServer({ data: { id, reason: "Declined by system admin." } });
      toast.success("Registration rejected.");
      setSelectedReg(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user?.isSystemAdmin || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <PageHeader
        title="System Admin Portal"
        subtitle="Manage SaaS tenant registrations, approvals, and workspace lifecycles."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-elevated p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Pending Registrations</p>
          <p className="mt-2 font-display text-3xl font-semibold text-warning">{data?.pending?.length || 0}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Workspaces</p>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">{data?.stats?.totalWorkspaces || 0}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Users</p>
          <p className="mt-2 font-display text-3xl font-semibold text-foreground">{data?.stats?.totalUsers || 0}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Recently Rejected</p>
          <p className="mt-2 font-display text-3xl font-semibold text-destructive">{data?.rejected?.length || 0}</p>
        </div>
      </div>

      <SectionCard title="Pending Enterprise Registrations">
        {data?.pending?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No pending registrations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/50 text-xs font-medium uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Requested At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {data?.pending.map((reg: any) => (
                  <tr key={reg.id} className="transition-colors hover:bg-surface/30">
                    <td className="px-4 py-3 font-medium">{reg.companyName}</td>
                    <td className="px-4 py-3">
                      {reg.ownerName}
                      <br />
                      <span className="text-xs text-muted-foreground">{reg.ownerEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{reg.industry}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setSelectedReg(reg)}>
                        Review & Approve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recently Approved Workspaces">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/50 text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Owner Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approved At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data?.approved?.map((reg: any) => (
                <tr key={reg.id} className="transition-colors hover:bg-surface/30">
                  <td className="px-4 py-3 font-medium">{reg.companyName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{reg.ownerEmail}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone="success">Active</StatusPill>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(reg.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Review Dialog */}
      <Dialog open={!!selectedReg} onOpenChange={(open) => !open && setSelectedReg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Registration: {selectedReg?.companyName}</DialogTitle>
            <DialogDescription>
              Review the details below. Approving will instantly provision an empty workspace and email the owner.
            </DialogDescription>
          </DialogHeader>

          {selectedReg && (
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <Building className="h-4 w-4" /> Company Details
                  </h4>
                  <div className="rounded-md bg-surface p-3 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedReg.companyName}</p>
                    <p><span className="text-muted-foreground">Type:</span> {selectedReg.businessType}</p>
                    <p><span className="text-muted-foreground">Industry:</span> {selectedReg.industry}</p>
                    {selectedReg.gstNumber && <p><span className="text-muted-foreground">GST:</span> {selectedReg.gstNumber}</p>}
                    {selectedReg.companyWebsite && <p><span className="text-muted-foreground">Web:</span> {selectedReg.companyWebsite}</p>}
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <Briefcase className="h-4 w-4" /> Business Size
                  </h4>
                  <div className="rounded-md bg-surface p-3 text-sm">
                    <p><span className="text-muted-foreground">Employees:</span> {selectedReg.employeeCount}</p>
                    <p><span className="text-muted-foreground">Branches:</span> {selectedReg.branchCount}</p>
                    <p><span className="text-muted-foreground">Revenue:</span> {selectedReg.revenueRange}</p>
                    <p><span className="text-muted-foreground">Timezone:</span> {selectedReg.timezone}</p>
                    <p><span className="text-muted-foreground">Currency:</span> {selectedReg.currency}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <User className="h-4 w-4" /> Owner Details
                  </h4>
                  <div className="rounded-md bg-surface p-3 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedReg.ownerName}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedReg.ownerEmail}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedReg.mobileNumber}</p>
                    <p><span className="text-muted-foreground">Role:</span> {selectedReg.designation}</p>
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" /> Address
                  </h4>
                  <div className="rounded-md bg-surface p-3 text-sm">
                    <p>{selectedReg.address}</p>
                    <p>{selectedReg.city}, {selectedReg.state}</p>
                    <p>{selectedReg.country}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setSelectedReg(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleReject(selectedReg?.id)} 
              disabled={isProcessing}
            >
              Reject
            </Button>
            <Button 
              onClick={() => handleApprove(selectedReg?.id)} 
              disabled={isProcessing}
            >
              Approve & Provision Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
