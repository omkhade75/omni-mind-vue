import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, ChevronRight, Loader2, Sparkles, Building2, Layers, Settings, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { completeWorkspaceSetupServer } from "@/lib/server-setup";

export const Route = createFileRoute("/setup")({
  beforeLoad: async () => {
    const { getCurrentSessionServer } = await import("@/lib/server-auth");
    const res = await getCurrentSessionServer();
    if (!res.user) {
      throw redirect({ to: "/login" });
    }
    // If they already completed setup, they shouldn't be here
    if (res.user.setupCompleted) {
      throw redirect({ to: "/command-center" });
    }
  },
  component: SetupWizardPage,
});

function SetupWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    currency: "USD",
    timezone: "America/New_York",
    firstBranchName: "Main Branch",
    firstDepartmentName: "General Sales",
    taxRate: "10",
    includeSampleData: false,
  });

  // Pre-fill business name when user loads
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, businessName: user.name + " Business" }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await completeWorkspaceSetupServer({ data: formData });
      toast.success("Workspace setup complete!");
      // We force a page reload so the layout fetches the new session (where setupCompleted=true)
      window.location.href = "/command-center";
    } catch (err: any) {
      toast.error(err.message || "Failed to complete setup");
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const StepIndicator = () => (
    <div className="mb-8 flex items-center justify-between">
      {[
        { num: 1, label: "Basics", icon: Building2 },
        { num: 2, label: "Structure", icon: Layers },
        { num: 3, label: "Settings", icon: Settings },
        { num: 4, label: "Data", icon: Database },
      ].map((s) => (
        <div key={s.num} className="flex flex-col items-center gap-2">
          <div
            className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition-colors ${
              step >= s.num
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-muted-foreground"
            }`}
          >
            {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
          </div>
          <span className={`hidden text-[10px] uppercase tracking-wider sm:block ${step >= s.num ? "text-primary" : "text-muted-foreground"}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative min-h-screen bg-background py-10 px-6 sm:px-10 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl gradient-primary mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome to OmniMind AI</h1>
          <p className="mt-2 text-sm text-muted-foreground">Let's set up your new workspace.</p>
        </div>

        <div className="card-elevated p-6 sm:p-10">
          <StepIndicator />

          <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            
            {/* STEP 1: BASICS */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Business Basics</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" name="businessName" value={formData.businessName} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Primary Currency</Label>
                    <select id="currency" name="currency" value={formData.currency} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select id="timezone" name="timezone" value={formData.timezone} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: STRUCTURE */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Organizational Structure</h3>
                <p className="text-xs text-muted-foreground mb-4">We'll create your first branch and department to get you started.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="firstBranchName">First Branch / Location Name</Label>
                  <Input id="firstBranchName" name="firstBranchName" value={formData.firstBranchName} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstDepartmentName">First Department Name</Label>
                  <Input id="firstDepartmentName" name="firstDepartmentName" value={formData.firstDepartmentName} onChange={handleChange} required />
                </div>
              </div>
            )}

            {/* STEP 3: SETTINGS */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Financial Settings</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="100" value={formData.taxRate} onChange={handleChange} required />
                </div>
                <p className="text-xs text-muted-foreground">You can add multiple tax brackets and complex rules later in the settings menu.</p>
              </div>
            )}

            {/* STEP 4: DATA */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Workspace Initialization</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Your workspace is currently completely empty. Would you like us to generate some sample data so you can explore the dashboards immediately?
                </p>
                
                <div className="rounded-lg border border-border p-4 bg-surface/50 transition-colors hover:bg-surface">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="includeSampleData" 
                      name="includeSampleData"
                      checked={formData.includeSampleData}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <Label htmlFor="includeSampleData" className="font-semibold cursor-pointer">Generate Sample Data</Label>
                      <p className="text-xs text-muted-foreground mt-1">Includes 5 sample products, 10 customers, and historical sales data to populate charts. You can delete this later.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep} disabled={submitting}>
                  Back
                </Button>
              ) : (
                <div /> // Spacer
              )}
              
              {step < 4 ? (
                <Button type="button" onClick={nextStep}>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Setup
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
