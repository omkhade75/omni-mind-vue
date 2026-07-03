import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  TrendingUp,
  Zap,
  ShieldCheck,
  BarChart3,
  Users,
  Brain,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniMind AI — Mall Intelligence & Decision OS" },
      {
        name: "description",
        content:
          "OmniMind AI transforms mall operations data into predictive insights, AI recommendations, and evidence-backed decisions.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to command center
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/command-center", replace: true });
    }
  }, [loading, user, navigate]);

  // While checking auth, show nothing (prevents flash)
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute -left-40 top-0 h-[520px] w-[520px] animate-pulse-slow rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[520px] w-[520px] animate-pulse-slow rounded-full bg-violet/15 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 animate-pulse-slow rounded-full bg-primary/8 blur-[100px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(var(--color-foreground)_1px,transparent_1px),linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] [background-size:44px_44px]" />

        {/* Floating geometric shapes */}
        <div className="absolute left-[15%] top-[25%] animate-float-slow opacity-60">
          <div className="h-24 w-24 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-3xl" style={{ transform: 'rotate(15deg) skewX(-15deg)' }} />
        </div>
        
        <div className="absolute right-[10%] top-[15%] animate-float-medium opacity-40">
          <div className="h-32 w-32 rounded-full border border-violet/20 bg-gradient-to-bl from-violet/10 to-transparent backdrop-blur-3xl" style={{ transform: 'scaleY(0.8) rotate(-20deg)' }} />
        </div>

        <div className="absolute left-[8%] bottom-[20%] animate-float-medium opacity-50" style={{ animationDelay: '2s' }}>
          <div className="h-20 w-20 rounded-2xl border border-cyan/20 bg-gradient-to-tr from-cyan/10 to-transparent backdrop-blur-xl" style={{ transform: 'rotate(45deg)' }} />
        </div>

        <div className="absolute right-[18%] bottom-[30%] animate-float-slow opacity-50" style={{ animationDelay: '1s' }}>
          <div className="h-16 w-16 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-md" />
        </div>

        {/* Micro-particles / stars */}
        <div className="absolute left-[30%] top-[40%] h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 shadow-[0_0_10px_var(--color-primary)]" />
        <div className="absolute right-[25%] top-[35%] h-2 w-2 animate-pulse rounded-full bg-violet/60 shadow-[0_0_12px_var(--color-violet)]" style={{ animationDelay: '1s' }} />
        <div className="absolute left-[45%] bottom-[25%] h-1 w-1 animate-pulse rounded-full bg-cyan/60 shadow-[0_0_8px_var(--color-cyan)]" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">OmniMind AI</p>
              <p className="text-[10px] text-muted-foreground">Mall Intelligence OS</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 text-center sm:px-10 sm:pt-24 sm:pb-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-primary">
            <Sparkles className="h-3 w-3" /> Decision Intelligence for Modern Malls
          </p>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            From mall data to{" "}
            <span className="gradient-text">intelligent decisions</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            OmniMind AI unifies sales, inventory, customers, suppliers, and utilities into a
            single decision surface — with predictive analytics and evidence-backed AI
            recommendations designed for owners, admins, and floor managers.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90"
            >
              Get Started <ChevronRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface/50 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Explore Features
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Deployed at GrandSquare Mall · Pune, Maharashtra
          </p>
        </section>

        {/* Features grid */}
        <section id="features" className="mx-auto max-w-5xl px-6 pb-24 sm:px-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: "Real-time Analytics",
                desc: "Live revenue, footfall, and department performance dashboards updated in real time.",
              },
              {
                icon: Brain,
                title: "AI Decision Center",
                desc: "Gemini-powered AI recommendations for pricing, inventory, staffing, and promotions.",
              },
              {
                icon: ShieldCheck,
                title: "Anomaly Detection",
                desc: "Automated alerts for revenue drops, inventory shrinkage, and operational risks.",
              },
              {
                icon: BarChart3,
                title: "Business Forecasting",
                desc: "Predictive models for sales trends, seasonal demand, and cash flow planning.",
              },
              {
                icon: Users,
                title: "Customer 360°",
                desc: "Complete customer profiles with spend analysis, visit frequency, and churn prediction.",
              },
              {
                icon: Zap,
                title: "Time Machine",
                desc: "Simulate business scenarios and model decisions before committing resources.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group glass rounded-xl border border-hairline p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:gradient-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Role badges */}
        <section className="mx-auto max-w-3xl px-6 pb-20 text-center sm:px-10">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Built for every level of mall management
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {["Mall Owner", "Admin", "Floor Manager"].map((r) => (
              <span
                key={r}
                className="rounded-full border border-hairline bg-surface/80 px-4 py-1.5 text-xs font-medium"
              >
                {r}
              </span>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <footer className="border-t border-hairline bg-surface/30 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 OmniMind AI · Mall Decision Intelligence OS
          </p>
        </footer>
      </div>
    </div>
  );
}
