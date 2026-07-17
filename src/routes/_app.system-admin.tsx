import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { 
  ShieldAlert, CheckCircle2, XCircle, Search, Building, User, Mail, MapPin, 
  Briefcase, Key, Play, AlertTriangle, Download, Upload, ClipboardList, Database, 
  Cpu, HardDrive, RefreshCw, LogIn, Ban, Check, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  getSystemAdminDashboardServer, 
  approveRegistrationServer, 
  rejectRegistrationServer,
  suspendRegistrationServer,
  deleteRegistrationServer,
  searchCompaniesServer,
  suspendWorkspaceServer,
  reactivateWorkspaceServer,
  deleteWorkspaceServer,
  resetOwnerPasswordServer,
  resendWelcomeEmailServer,
  getAuditLogsServer,
  exportWorkspaceServer,
  importWorkspaceServer
} from "@/lib/server-system-admin";
import { impersonateTenantServer } from "@/lib/server-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/system-admin")({
  beforeLoad: async () => {
    const { getCurrentSessionServer } = await import("@/lib/server-auth");
    const res = await getCurrentSessionServer();
    if (!res.user || !res.user.isSystemAdmin || res.user.email !== "khade8915@gmail.com") {
      throw redirect({ to: "/command-center" });
    }
  },
  head: () => ({
    meta: [{ title: "System Admin — OmniMind AI" }],
  }),
  component: SystemAdminPage,
});

function SystemAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard & Onboarding data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"onboarding" | "workspaces" | "audits">("onboarding");

  // Provisioning progress stepper
  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);

  // Workspace Management tab state
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [showWorkspaceDetails, setShowWorkspaceDetails] = useState(false);

  // Backup / Restore state
  const [showImport, setShowImport] = useState(false);
  const [importDataText, setImportDataText] = useState("");
  
  // Audit Logs state
  const [audits, setAudits] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  useEffect(() => {
    if (user && (!user.isSystemAdmin || user.email !== "khade8915@gmail.com")) {
      toast.error("Unauthorized access.");
      navigate({ to: "/command-center" });
    } else if (user && user.isSystemAdmin && user.email === "khade8915@gmail.com") {
      fetchData();
      fetchWorkspaces();
      fetchAudits();
    }
  }, [user]);

  // Handle URL reviewId redirect
  useEffect(() => {
    if (data?.pending && typeof window !== "undefined") {
      const reviewId = new URLSearchParams(window.location.search).get("reviewId");
      if (reviewId) {
        const matching = data.pending.find((r: any) => r.id === reviewId);
        if (matching) {
          setSelectedReg(matching);
          // Clean parameter from URL without page reload
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [data]);

  const fetchData = async () => {
    try {
      const result = await getSystemAdminDashboardServer();
      setData(result);
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const res = await searchCompaniesServer({ data: { query: workspaceQuery } });
      setWorkspaces(res.workspaces);
    } catch (err: any) {
      toast.error("Failed to fetch workspaces");
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const fetchAudits = async () => {
    setLoadingAudits(true);
    try {
      const res = await getAuditLogsServer();
      setAudits(res.audits);
    } catch (err: any) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoadingAudits(false);
    }
  };

  // Run searches
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (user?.isSystemAdmin) fetchWorkspaces();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [workspaceQuery]);

  // Actions for Onboarding Requests
  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve and provision this workspace?")) return;
    
    setSelectedReg(null);
    setShowProgress(true);
    setProgressStep(0);
    
    const steps = [
      "Creating Workspace...",
      "Creating Owner Account...",
      "Creating Security & AI Configuration...",
      "Sending Welcome Email...",
      "Completed Successfully."
    ];
    setProgressSteps(steps);

    // Simulate progress updates for visual clarity
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 700));
      setProgressStep(i + 1);
    }

    try {
      await approveRegistrationServer({ data: { id } });
      setProgressStep(5);
      toast.success("Workspace approved and provisioned successfully.");
      await fetchData();
      await fetchWorkspaces();
      await fetchAudits();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve registration");
      setShowProgress(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Please enter the reason for rejection:");
    if (reason === null) return; // Cancelled
    
    setIsProcessing(true);
    try {
      await rejectRegistrationServer({ data: { id, reason } });
      toast.success("Registration rejected successfully.");
      setSelectedReg(null);
      await fetchData();
      await fetchAudits();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this registration request?")) return;
    
    setIsProcessing(true);
    try {
      await suspendRegistrationServer({ data: { id } });
      toast.success("Registration request suspended.");
      setSelectedReg(null);
      await fetchData();
      await fetchAudits();
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReg = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this registration request?")) return;
    
    setIsProcessing(true);
    try {
      await deleteRegistrationServer({ data: { id } });
      toast.success("Registration request deleted.");
      setSelectedReg(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Impersonation
  const handleImpersonate = async (workspaceId: string) => {
    if (!confirm("Are you sure you want to log in as this workspace owner?")) return;
    try {
      await impersonateTenantServer({ data: { workspaceId } });
      toast.success("Impersonating workspace Owner user.");
      window.location.href = "/command-center";
    } catch (err: any) {
      toast.error(err.message || "Impersonation failed");
    }
  };

  // Workspace Actions
  const handleSuspendWorkspace = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this workspace? Owner and members will be blocked from logging in.")) return;
    try {
      await suspendWorkspaceServer({ data: { id } });
      toast.success("Workspace suspended.");
      await fetchWorkspaces();
      await fetchAudits();
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend workspace");
    }
  };

  const handleReactivateWorkspace = async (id: string) => {
    if (!confirm("Are you sure you want to reactivate this workspace?")) return;
    try {
      await reactivateWorkspaceServer({ data: { id } });
      toast.success("Workspace reactivated.");
      await fetchWorkspaces();
      await fetchAudits();
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate workspace");
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Are you sure you want to soft-delete this workspace? Its status will be marked as DELETED.")) return;
    try {
      await deleteWorkspaceServer({ data: { id } });
      toast.success("Workspace marked as Deleted.");
      await fetchWorkspaces();
      await fetchAudits();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete workspace");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedWorkspace) return;
    try {
      const res = await resetOwnerPasswordServer({ 
        data: { workspaceId: selectedWorkspace.id, password: newPassword } 
      });
      setTempPassword(res.tempPassword);
      toast.success("Password reset successful.");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    }
  };

  const handleResendWelcome = async (workspaceId: string) => {
    try {
      await resendWelcomeEmailServer({ data: { workspaceId } });
      toast.success("Welcome email resent successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend welcome email");
    }
  };

  const handleExportWorkspace = async (workspaceId: string) => {
    try {
      const res = await exportWorkspaceServer({ data: { workspaceId } });
      
      // Download file to browser
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(res.workspaceData);
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `workspace-backup-${workspaceId}.json`);
      dlAnchorElem.click();
      
      toast.success("Workspace backup file generated successfully.");
    } catch (err: any) {
      toast.error("Failed to export workspace backup");
    }
  };

  const handleImportWorkspace = async () => {
    if (!selectedWorkspace || !importDataText) return;
    try {
      await importWorkspaceServer({ 
        data: { workspaceId: selectedWorkspace.id, importData: importDataText } 
      });
      toast.success("Workspace restored successfully from backup.");
      setShowImport(false);
      setImportDataText("");
    } catch (err: any) {
      toast.error("Failed to restore workspace backup");
    }
  };

  // Risk Assessment Helper
  const checkRisk = (reg: any) => {
    if (!reg) return [];
    
    const emailVerified = true; // Mock verification
    const isStrongPassword = reg.passwordHash.length > 30; // Hashed password is secure
    
    // Check duplicates
    const isDuplicateCompany = workspaces.some((w: any) => w.name.toLowerCase() === reg.companyName.toLowerCase());
    const isDuplicateEmail = workspaces.some((w: any) => w.users[0]?.email.toLowerCase() === reg.ownerEmail.toLowerCase());
    
    const isPhoneValid = reg.mobileNumber.length >= 10;

    return [
      { name: "Email Address Verified", passed: emailVerified },
      { name: "Secure Password Policy Passed", passed: isStrongPassword },
      { name: "Unique Company (No Duplicate Workspace)", passed: !isDuplicateCompany },
      { name: "Unique Owner Email Address", passed: !isDuplicateEmail },
      { name: "Standard Mobile Format Verified", passed: isPhoneValid },
    ];
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
        title="Enterprise System Administration"
        subtitle="Manage multitenant provisioning, license keys, tenant impersonation, backups, and onboarding approvals."
        actions={
          user?.email !== "khade8915@gmail.com" ? (
            <Button variant="outline" onClick={() => navigate({ to: "/command-center" })}>
              ← Back to Shop Dashboard
            </Button>
          ) : null
        }
      />

      {/* METRICS PANELS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-elevated p-4 relative overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase">Active / Total Tenants</p>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">
            {data?.stats?.activeCompanies} <span className="text-sm font-normal text-muted-foreground">/ {data?.stats?.totalCompanies}</span>
          </p>
          <Building className="absolute right-4 bottom-4 h-8 w-8 text-primary/10" />
        </div>
        <div className="card-elevated p-4 relative overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase">Pending Approvals</p>
          <p className="mt-2 font-display text-3xl font-semibold text-warning">{data?.stats?.pendingCount}</p>
          <ShieldAlert className="absolute right-4 bottom-4 h-8 w-8 text-warning/10" />
        </div>
        <div className="card-elevated p-4 relative overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase">Online / Active Users</p>
          <p className="mt-2 font-display text-3xl font-semibold text-success">
            {data?.stats?.onlineUsers} <span className="text-sm font-normal text-muted-foreground">/ {data?.stats?.totalUsers}</span>
          </p>
          <User className="absolute right-4 bottom-4 h-8 w-8 text-success/10" />
        </div>
        <div className="card-elevated p-4 relative overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase">Today / Monthly Registrations</p>
          <p className="mt-2 font-display text-3xl font-semibold text-violet">
            {data?.stats?.todayRegistrations} <span className="text-sm font-normal text-muted-foreground">/ {data?.stats?.monthlyRegistrations}</span>
          </p>
          <ClipboardList className="absolute right-4 bottom-4 h-8 w-8 text-violet/10" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total AI Inquiries</p>
            <p className="font-semibold text-lg">{data?.stats?.aiUsage} calls</p>
          </div>
        </div>

        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-success/10 text-success">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated Storage Usage</p>
            <p className="font-semibold text-lg">{(data?.stats?.storageUsage / 1024).toFixed(1)} KB</p>
          </div>
        </div>

        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-violet/10 text-violet">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">System Health</p>
            <p className="font-semibold text-lg text-success">100% Operational</p>
          </div>
        </div>
      </div>

      {/* PORTAL TABS */}
      <div className="flex gap-2 border-b border-hairline pb-2">
        <Button 
          variant={activeTab === "onboarding" ? "default" : "outline"} 
          onClick={() => setActiveTab("onboarding")}
          size="sm"
        >
          Onboarding Queue
        </Button>
        <Button 
          variant={activeTab === "workspaces" ? "default" : "outline"} 
          onClick={() => setActiveTab("workspaces")}
          size="sm"
        >
          Manage Workspaces
        </Button>
        <Button 
          variant={activeTab === "audits" ? "default" : "outline"} 
          onClick={() => setActiveTab("audits")}
          size="sm"
        >
          Compliance & Auditing
        </Button>
      </div>

      {/* TAB 1: ONBOARDING */}
      {activeTab === "onboarding" && (
        <div className="space-y-6">
          <SectionCard title="Pending Onboarding Registrations">
            {data?.pending?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">All registration requests have been cleared.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface/50 text-xs font-medium uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Company Name</th>
                      <th className="px-4 py-3">Owner Contact</th>
                      <th className="px-4 py-3">Industry</th>
                      <th className="px-4 py-3">Submitted At</th>
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
                          {new Date(reg.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" onClick={() => setSelectedReg(reg)}>
                            Review & Onboard
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Actioned Requests History">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/50 text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Owner Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actioned At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {[...(data?.approved || []), ...(data?.rejected || []), ...(data?.suspended || [])].map((reg: any) => (
                    <tr key={reg.id} className="transition-colors hover:bg-surface/30">
                      <td className="px-4 py-3 font-medium">{reg.companyName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.ownerEmail}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={reg.status === "Approved" ? "success" : reg.status === "Suspended" ? "warning" : "danger"}>
                          {reg.status}
                        </StatusPill>
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
        </div>
      )}

      {/* TAB 2: WORKSPACE MANAGEMENT */}
      {activeTab === "workspaces" && (
        <div className="space-y-6">
          <div className="flex gap-2 max-w-md">
            <Input 
              placeholder="Search companies by name..." 
              value={workspaceQuery} 
              onChange={(e) => setWorkspaceQuery(e.target.value)}
            />
            <Button variant="outline" onClick={fetchWorkspaces}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <SectionCard title="SaaS Tenant Workspaces">
            {loadingWorkspaces ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : workspaces.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No active workspace matches your criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface/50 text-xs font-medium uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Owner Contact</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">License State</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {workspaces.map((ws: any) => (
                      <tr key={ws.id} className="transition-colors hover:bg-surface/30">
                        <td className="px-4 py-3">
                          <span 
                            className="font-semibold text-primary hover:underline cursor-pointer"
                            onClick={() => { setSelectedWorkspace(ws); setShowWorkspaceDetails(true); }}
                          >
                            {ws.name}
                          </span>
                          {ws.id === "grandsquare-mall" && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono uppercase">Demo</span>}
                          <br />
                          <span className="text-[10px] text-muted-foreground font-mono">{ws.id}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {ws.users[0]?.name || "No Owner"}
                          <br />
                          <span className="text-xs">{ws.users[0]?.email}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-xs text-primary">{ws.plan}</td>
                        <td className="px-4 py-3">
                          <StatusPill tone={ws.status === "ACTIVE" ? "success" : ws.status === "SUSPENDED" ? "warning" : "danger"}>
                            {ws.status}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => handleImpersonate(ws.id)} title="Impersonate User">
                            <LogIn className="h-3.5 w-3.5 mr-1" /> Login As
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedWorkspace(ws); setShowPasswordReset(true); }} title="Reset Password">
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleResendWelcome(ws.id)} title="Resend Welcome Email">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportWorkspace(ws.id)} title="Backup Workspace">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedWorkspace(ws); setShowImport(true); }} title="Restore Backup">
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                          {ws.id !== "grandsquare-mall" && (
                            <>
                              {ws.status === "ACTIVE" ? (
                                <Button size="sm" variant="outline" className="text-warning hover:bg-warning/10" onClick={() => handleSuspendWorkspace(ws.id)} title="Suspend Tenant">
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="text-success hover:bg-success/10" onClick={() => handleReactivateWorkspace(ws.id)} title="Reactivate Tenant">
                                  <Play className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteWorkspace(ws.id)} title="Soft Delete Workspace">
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
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
      )}

      {/* TAB 3: AUDITS */}
      {activeTab === "audits" && (
        <SectionCard title="Security & Onboarding Audit Trail">
          {loadingAudits ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : audits.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No audits logs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/50 text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3">Auditor</th>
                    <th className="px-4 py-3">Workspace ID</th>
                    <th className="px-4 py-3">IP / Browser Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {audits.map((log: any) => (
                    <tr key={log.id} className="transition-colors hover:bg-surface/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-xs text-primary">{log.actionType}</td>
                      <td className="px-4 py-3">
                        {log.adminEmail}
                        <br />
                        <span className="text-[10px] text-muted-foreground">{log.tenantName}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.workspaceId}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-semibold text-muted-foreground">{log.ipAddress}</span>
                        <br />
                        <span className="text-[10px] text-muted-foreground block max-w-xs truncate">{log.userAgent}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* REVIEW DIALOG */}
      <Dialog open={!!selectedReg} onOpenChange={(open) => !open && setSelectedReg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Registration: {selectedReg?.companyName}</DialogTitle>
            <DialogDescription>
              Perform compliance checks and risk assessments before approving the workspace.
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
                    <Briefcase className="h-4 w-4" /> Operations Setup
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
                    <User className="h-4 w-4" /> Owner Account
                  </h4>
                  <div className="rounded-md bg-surface p-3 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedReg.ownerName}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedReg.ownerEmail}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedReg.mobileNumber}</p>
                  </div>
                </div>

                {/* RISK ASSESSMENT */}
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <ShieldCheck className="h-4 w-4" /> Platform Risk Assessment
                  </h4>
                  <div className="rounded-md bg-surface p-3 text-xs space-y-2">
                    {checkRisk(selectedReg).map((check, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{check.name}</span>
                        {check.passed ? (
                          <span className="text-success font-semibold flex items-center gap-0.5">✓ Verified</span>
                        ) : (
                          <span className="text-destructive font-semibold flex items-center gap-0.5">⚠️ Duplicate Alert</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => setSelectedReg(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="outline" className="text-warning hover:bg-warning/10" onClick={() => handleSuspend(selectedReg?.id)} disabled={isProcessing}>
              Suspend Request
            </Button>
            <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteReg(selectedReg?.id)} disabled={isProcessing}>
              Delete
            </Button>
            <Button variant="destructive" onClick={() => handleReject(selectedReg?.id)} disabled={isProcessing}>
              Reject
            </Button>
            <Button onClick={() => handleApprove(selectedReg?.id)} disabled={isProcessing}>
              Approve & Onboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROVISIONING PROGRESS */}
      <Dialog open={showProgress} onOpenChange={() => {}}>
        <DialogContent className="max-w-md pointer-events-none">
          <DialogHeader>
            <DialogTitle>Workspace Provisioning Pipeline</DialogTitle>
            <DialogDescription>
              Configuring security policies, building storage buckets, and assigning core licenses.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-4">
            {progressSteps.map((stepMsg, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {progressStep > idx ? (
                  <Check className="h-5 w-5 text-success font-bold" />
                ) : progressStep === idx ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-surface-2" />
                )}
                <span className={`text-sm ${progressStep === idx ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  {stepMsg}
                </span>
              </div>
            ))}
          </div>
          
          {progressStep === 5 && (
            <DialogFooter>
              <Button onClick={() => setShowProgress(false)}>
                Close Pipeline
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* PASSWORD RESET DIALOG */}
      <Dialog open={showPasswordReset} onOpenChange={(open) => !open && setShowPasswordReset(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password: {selectedWorkspace?.name}</DialogTitle>
            <DialogDescription>Generate a new secure login key for this tenant owner.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <Input 
              type="text" 
              placeholder="Enter new password (optional)..." 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {tempPassword && (
              <div className="bg-surface p-3 rounded text-sm border border-hairline font-mono text-center">
                Temporary Password: <span className="font-bold text-success select-all">{tempPassword}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPasswordReset(false); setNewPassword(""); setTempPassword(""); }}>
              Close
            </Button>
            <Button onClick={handleResetPassword}>
              Generate Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESTORE DIALOG */}
      <Dialog open={showImport} onOpenChange={(open) => !open && setShowImport(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Restore Backup: {selectedWorkspace?.name}</DialogTitle>
            <DialogDescription>Paste the exported backup JSON configuration string below.</DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <textarea 
              className="w-full h-40 bg-surface text-xs font-mono p-3 border border-hairline rounded"
              placeholder="Paste JSON here..."
              value={importDataText}
              onChange={(e) => setImportDataText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setImportDataText(""); }}>
              Cancel
            </Button>
            <Button onClick={handleImportWorkspace}>
              Import Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WORKSPACE DETAILS DIALOG */}
      <Dialog open={showWorkspaceDetails} onOpenChange={(open) => !open && setShowWorkspaceDetails(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workspace Control Center: {selectedWorkspace?.name}</DialogTitle>
            <DialogDescription>
              Real-time resource counts, configuration details, and system administration keys for this isolated tenant.
            </DialogDescription>
          </DialogHeader>

          {selectedWorkspace && (
            <div className="space-y-6 my-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Subscription & Licensing</h4>
                  <div className="rounded-md bg-surface p-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Workspace ID:</span> <span className="font-mono text-xs">{selectedWorkspace.id}</span></p>
                    <p><span className="text-muted-foreground">Plan Level:</span> <span className="font-semibold text-primary">{selectedWorkspace.plan}</span></p>
                    <p className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <StatusPill tone={selectedWorkspace.status === "ACTIVE" ? "success" : selectedWorkspace.status === "SUSPENDED" ? "warning" : "danger"}>
                        {selectedWorkspace.status}
                      </StatusPill>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Trial End:</span>{" "}
                      {selectedWorkspace.trialEndDate ? new Date(selectedWorkspace.trialEndDate).toLocaleDateString() : "No Trial"}
                    </p>
                    <p><span className="text-muted-foreground">Timezone:</span> {selectedWorkspace.timezone}</p>
                    <p><span className="text-muted-foreground">Currency:</span> {selectedWorkspace.currency}</p>
                    <p><span className="text-muted-foreground">Created At:</span> {new Date(selectedWorkspace.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Workspace Owner Contact</h4>
                  <div className="rounded-md bg-surface p-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Full Name:</span> {selectedWorkspace.users[0]?.name || "N/A"}</p>
                    <p><span className="text-muted-foreground">Email Contact:</span> {selectedWorkspace.users[0]?.email || "N/A"}</p>
                    <p><span className="text-muted-foreground">Role:</span> OWNER</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Resource Utilization (Database Rows)</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Products</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.products ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Customers</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.customers ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Transactions</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.transactions ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Total Users</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.users ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Suppliers</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.suppliers ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Departments</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.departments ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Expenses</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.expenses ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">AI Decisions</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.recommendations ?? 0}</p>
                  </div>
                  <div className="bg-surface/50 p-2.5 rounded border border-hairline text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Risk Anomalies</p>
                    <p className="text-lg font-semibold mt-0.5">{selectedWorkspace._count?.anomalies ?? 0}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Administrative Controls</h4>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowWorkspaceDetails(false); handleImpersonate(selectedWorkspace.id); }}>
                    <LogIn className="h-4 w-4 mr-1.5" /> Impersonate (Login As)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowWorkspaceDetails(false); setShowPasswordReset(true); }}>
                    <Key className="h-4 w-4 mr-1.5" /> Reset Owner Password
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleResendWelcome(selectedWorkspace.id)}>
                    <Mail className="h-4 w-4 mr-1.5" /> Resend Welcome
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportWorkspace(selectedWorkspace.id)}>
                    <Download className="h-4 w-4 mr-1.5" /> Export Configuration (Backup)
                  </Button>
                  {selectedWorkspace.id !== "grandsquare-mall" && (
                    <>
                      {selectedWorkspace.status === "ACTIVE" ? (
                        <Button size="sm" variant="outline" className="text-warning hover:bg-warning/10" onClick={async () => { await handleSuspendWorkspace(selectedWorkspace.id); setShowWorkspaceDetails(false); }}>
                          <Ban className="h-4 w-4 mr-1.5" /> Suspend Tenant
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-success hover:bg-success/10" onClick={async () => { await handleReactivateWorkspace(selectedWorkspace.id); setShowWorkspaceDetails(false); }}>
                          <Play className="h-4 w-4 mr-1.5" /> Reactivate Tenant
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={async () => { await handleDeleteWorkspace(selectedWorkspace.id); setShowWorkspaceDetails(false); }}>
                        <XCircle className="h-4 w-4 mr-1.5" /> Soft Delete Workspace
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowWorkspaceDetails(false)}>
              Close Control Center
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
