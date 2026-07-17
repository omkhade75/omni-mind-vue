import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, ShieldCheck, Sparkles, TrendingUp, Zap, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { z } from "zod";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => loginSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — OmniMind AI" },
      {
        name: "description",
        content: "Sign in to OmniMind AI, the mall intelligence and decision operating system.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const getRedirectTarget = (u?: any) => {
    const activeUser = u || user;
    if (!redirect) {
      if (activeUser?.isSystemAdmin) {
        return "/system-admin";
      }
      return "/command-center";
    }
    try {
      const url = new URL(redirect);
      return url.pathname + url.search;
    } catch {
      return redirect;
    }
  };



  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email");
    setSubmitting(true);
    try {
      const loggedIn = await login(email, pass);
      navigate({ to: getRedirectTarget(loggedIn) });
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail !== "khade8915@gmail.com" || adminPassword !== "123456789") {
      toast.error("Incorrect admin credentials. Please enter khade8915@gmail.com and 123456789.");
      return;
    }
    setAdminSubmitting(true);
    try {
      const loggedIn = await login(adminEmail, adminPassword);
      setShowAdminModal(false);
      setAdminEmail("");
      setAdminPassword("");
      toast.success("Authorized successfully.");
      navigate({ to: getRedirectTarget(loggedIn) });
    } catch (err: any) {
      toast.error(err.message || "Admin login failed");
    } finally {
      setAdminSubmitting(false);
    }
  };



  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Back button */}
      <div className="absolute left-6 top-6 z-50">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full bg-violet/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(var(--color-foreground)_1px,transparent_1px),linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: brand story */}
        <div className="hidden flex-col justify-between p-10 lg:flex xl:p-14">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">OmniMind AI</p>
              <p className="text-[11px] text-muted-foreground">Enterprise Intelligence OS</p>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              Decision Intelligence for Modern Businesses
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
              From business data to <span className="gradient-text">intelligent decisions</span>.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              OmniMind AI unifies sales, inventory, customers, suppliers, and utilities into a
              single decision surface — with predictive analytics and evidence-backed AI
              recommendations designed for owners, admins, and store managers.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: TrendingUp, label: "Real-time analytics" },
                { icon: Zap, label: "AI recommendations" },
                { icon: ShieldCheck, label: "Anomaly detection" },
              ].map((f) => (
                <div key={f.label} className="glass rounded-lg p-3">
                  <f.icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-xs font-medium">{f.label}</p>
                </div>
              ))}
            </div>
          </div>

            <p className="text-xs text-muted-foreground">
              Enterprise Grade • Multi-Tenant • Secure
            </p>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <p className="text-sm font-semibold">OmniMind AI</p>
            </div>

            <div className="card-elevated p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome back. Access the intelligence layer.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleFormLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="bg-background pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" defaultChecked />
                  <Label htmlFor="remember" className="text-xs text-muted-foreground">
                    Remember me for 30 days
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full gradient-primary text-primary-foreground"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign in
                </Button>
              </form>

              <div className="mt-4 text-center text-xs text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline font-semibold">
                  Register your company
                </Link>
              </div>

              <p className="mt-6 text-center text-[11px] text-muted-foreground">
                Protected by Enterprise Grade Security
              </p>

              <div className="mt-6 text-center border-t border-hairline pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline"
                >
                  System Administrator Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN LOGIN DIALOG */}
      <Dialog open={showAdminModal} onOpenChange={(open) => !open && setShowAdminModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>System Admin Login</DialogTitle>
            <DialogDescription>
              Please enter username as <span className="font-semibold text-primary">khade8915@gmail.com</span> and password <span className="font-semibold text-primary">123456789</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 my-4">
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="khade8915@gmail.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminPassword">Password</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAdminModal(false); setAdminEmail(""); setAdminPassword(""); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={adminSubmitting}>
                {adminSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Authorize Admin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
