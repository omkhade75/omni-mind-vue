import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, ShieldCheck, Sparkles, TrendingUp, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, type Role } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
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
  const { user, loading, login, demoLogin } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/command-center", replace: true });
    }
  }, [loading, user, navigate]);

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email");
    setSubmitting(true);
    try {
      await login(email, pass);
      navigate({ to: "/command-center" });
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (role: Role) => {
    setSubmitting(true);
    try {
      await demoLogin(role);
      navigate({ to: "/command-center" });
    } catch (err: any) {
      toast.error(err.message || "Demo login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
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
              <p className="text-[11px] text-muted-foreground">Mall Intelligence OS</p>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              Decision Intelligence for Modern Malls
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
              From mall data to <span className="gradient-text">intelligent decisions</span>.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              OmniMind AI unifies sales, inventory, customers, suppliers, and utilities into a
              single decision surface — with predictive analytics and evidence-backed AI
              recommendations designed for owners, admins, and floor managers.
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
            Deployed at GrandSquare Mall · Pune, Maharashtra
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

              <form
                className="mt-6 space-y-4"
                onSubmit={handleFormLogin}
              >
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

                <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign in
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-hairline" />
                or continue as
                <span className="h-px flex-1 bg-hairline" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { r: "owner", label: "Owner" },
                    { r: "admin", label: "Admin" },
                    { r: "manager", label: "Manager" },
                  ] as { r: Role; label: string }[]
                ).map((o) => (
                  <button
                    key={o.r}
                    onClick={() => quickLogin(o.r)}
                    className="rounded-md border border-hairline bg-surface px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-surface-2"
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-[11px] text-muted-foreground">
                Demo environment · No real credentials required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
