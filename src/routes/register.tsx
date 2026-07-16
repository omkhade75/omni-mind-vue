import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowRight, Loader2, CheckCircle2, ChevronRight, Building, User, MapPin, Briefcase, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { registerCompanyServer } from "@/lib/server-registration";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register Company — OmniMind AI" },
      {
        name: "description",
        content: "Register your enterprise for OmniMind AI.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Company
    companyName: "",
    businessType: "Retail Mall",
    industry: "Retail",
    gstNumber: "",
    companyWebsite: "",
    // Owner
    ownerName: "",
    ownerEmail: "",
    mobileNumber: "",
    designation: "CEO / Owner",
    // Address
    country: "India",
    state: "",
    city: "",
    address: "",
    // Business
    employeeCount: "1-50",
    branchCount: "1",
    revenueRange: "Under 1Cr",
    timezone: "Asia/Kolkata",
    currency: "INR",
    // Security
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const nextStep = () => {
    // Basic validation before moving to next step
    if (step === 1 && !formData.companyName) return toast.error("Company Name is required");
    if (step === 2 && (!formData.ownerName || !formData.ownerEmail)) return toast.error("Owner Name and Email are required");
    if (step === 3 && (!formData.city || !formData.state)) return toast.error("City and State are required");
    setStep(s => Math.min(s + 1, 5));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      return toast.error("You must accept the Terms and Privacy Policy");
    }
    
    setSubmitting(true);
    try {
      await registerCompanyServer({ data: formData });
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="card-elevated w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold">Request Submitted</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your registration request has been submitted successfully.
            <br /><br />
            The OmniMind administrator has been notified. You will receive an email after approval.
          </p>
          <Button className="mt-8 w-full" onClick={() => navigate({ to: "/login" })}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  const StepIndicator = () => (
    <div className="mb-8 flex items-center justify-between">
      {[
        { num: 1, label: "Company", icon: Building },
        { num: 2, label: "Owner", icon: User },
        { num: 3, label: "Address", icon: MapPin },
        { num: 4, label: "Business", icon: Briefcase },
        { num: 5, label: "Security", icon: Lock },
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
          <span
            className={`hidden text-[10px] uppercase tracking-wider sm:block ${
              step >= s.num ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative min-h-screen bg-background py-10 px-6 sm:px-10">
      {/* Brand Header */}
      <div className="mx-auto mb-10 flex max-w-2xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">OmniMind AI</p>
            <p className="text-[11px] text-muted-foreground">Enterprise Registration</p>
          </div>
        </div>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          Sign In Instead
        </Link>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <div className="card-elevated p-6 sm:p-10">
          <StepIndicator />

          <form onSubmit={step === 5 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            {/* STEP 1: COMPANY */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Company Details</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="businessType">Business Type *</Label>
                    <select id="businessType" name="businessType" value={formData.businessType} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option>Retail Mall</option>
                      <option>Supermarket Chain</option>
                      <option>Hotel Chain</option>
                      <option>F&B Franchise</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="industry">Industry *</Label>
                    <Input id="industry" name="industry" value={formData.industry} onChange={handleChange} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                    <Input id="gstNumber" name="gstNumber" value={formData.gstNumber} onChange={handleChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyWebsite">Company Website (Optional)</Label>
                    <Input id="companyWebsite" name="companyWebsite" type="url" value={formData.companyWebsite} onChange={handleChange} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: OWNER */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Owner Details</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName">Full Name *</Label>
                  <Input id="ownerName" name="ownerName" value={formData.ownerName} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerEmail">Email Address *</Label>
                  <Input id="ownerEmail" name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <Input id="mobileNumber" name="mobileNumber" type="tel" value={formData.mobileNumber} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="designation">Designation *</Label>
                    <Input id="designation" name="designation" value={formData.designation} onChange={handleChange} required />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ADDRESS */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Business Address</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Full Address *</Label>
                  <Input id="address" name="address" value={formData.address} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State/Province *</Label>
                    <Input id="state" name="state" value={formData.state} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country *</Label>
                    <Input id="country" name="country" value={formData.country} onChange={handleChange} required />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: BUSINESS */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Business Operations</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="employeeCount">Number of Employees *</Label>
                    <select id="employeeCount" name="employeeCount" value={formData.employeeCount} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                      <option>1-50</option>
                      <option>51-200</option>
                      <option>201-500</option>
                      <option>501-1000</option>
                      <option>1000+</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="branchCount">Number of Branches *</Label>
                    <Input id="branchCount" name="branchCount" type="number" min="1" value={formData.branchCount} onChange={handleChange} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="revenueRange">Estimated Monthly Revenue *</Label>
                  <select id="revenueRange" name="revenueRange" value={formData.revenueRange} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option>Under 1Cr</option>
                    <option>1Cr - 5Cr</option>
                    <option>5Cr - 20Cr</option>
                    <option>Above 20Cr</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">Time Zone *</Label>
                    <Input id="timezone" name="timezone" value={formData.timezone} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Currency *</Label>
                    <Input id="currency" name="currency" value={formData.currency} onChange={handleChange} required />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: SECURITY */}
            {step === 5 && (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                <h3 className="mb-4 text-lg font-semibold">Security & Terms</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={8} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required minLength={8} />
                </div>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="acceptTerms" checked={formData.acceptTerms} onCheckedChange={(c) => handleCheckbox("acceptTerms", !!c)} />
                    <label htmlFor="acceptTerms" className="text-sm font-medium leading-none">
                      I accept the <a href="#" className="text-primary hover:underline">Terms of Service</a>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="acceptPrivacy" checked={formData.acceptPrivacy} onCheckedChange={(c) => handleCheckbox("acceptPrivacy", !!c)} />
                    <label htmlFor="acceptPrivacy" className="text-sm font-medium leading-none">
                      I accept the <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                    </label>
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
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/login" })} disabled={submitting}>
                  ← Back to Login
                </Button>
              )}
              
              {step < 5 ? (
                <Button type="button" onClick={nextStep}>
                  Next Step <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Registration
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
