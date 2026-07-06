import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Brain,
  LineChart,
  ShieldAlert,
  ShoppingCart,
  Receipt,
  Users,
  Package,
  Warehouse,
  Timer,
  Truck,
  ClipboardList,
  Wallet,
  Calculator,
  TrendingDown,
  Zap,
  FileBarChart,
  Building2,
  UserCog,
  CreditCard,
  FileText,
  Upload,
  Settings,
  Search,
  Bell,
  Sparkles,
  CalendarDays,
  ChevronsLeft,
  LogOut,
  ChevronRight,
  Circle,
  Menu,
  X,
  AlertTriangle,
  ShoppingBag as ShoppingBagIcon,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MALL, ANOMALIES, LIVE_FEED } from "@/lib/mock-data";
import { toast } from "sonner";
import { useBusinessData } from "@/lib/business-context";
import {
  Product360Drawer,
  Customer360Drawer,
  Supplier360Drawer,
  RecommendationInvestigateDrawer,
} from "@/components/details-drawers";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { getCurrentSessionServer } = await import("@/lib/server-auth");
    const res = await getCurrentSessionServer();
    if (!res.user) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AppShell,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavSection = { section: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    section: "Overview",
    items: [
      { to: "/command-center", label: "Command Center", icon: LayoutDashboard },
      { to: "/live-ops", label: "Live Operations", icon: Activity },
      { to: "/time-machine", label: "Business Time Machine", icon: CalendarDays },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/ai-decisions", label: "AI Decision Center", icon: Brain },
      { to: "/forecasting", label: "Forecasting", icon: LineChart },
      { to: "/anomalies", label: "Anomaly & Risk", icon: ShieldAlert },
    ],
  },
  {
    section: "Commerce",
    items: [
      { to: "/billing", label: "Billing (POS)", icon: Calculator },
      { to: "/sales", label: "Sales", icon: ShoppingCart },
      { to: "/transactions", label: "Transactions", icon: Receipt },
      { to: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    section: "Operations",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/inventory", label: "Inventory", icon: Warehouse },
      { to: "/expiry", label: "Expiry Intelligence", icon: Timer },
      { to: "/suppliers", label: "Suppliers", icon: Truck },
      { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
    ],
  },
  {
    section: "Finance",
    items: [
      { to: "/accounts", label: "Accounts", icon: CreditCard },
      { to: "/income", label: "Income", icon: Wallet },
      { to: "/expenses", label: "Expenses", icon: TrendingDown },
      { to: "/utilities", label: "Utilities", icon: Zap },
      { to: "/tax", label: "Tax & Compliance", icon: FileBarChart },
    ],
  },
  {
    section: "Management",
    items: [
      { to: "/departments", label: "Departments", icon: Building2 },
      { to: "/staff", label: "Staff & Managers", icon: UserCog },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/reports", label: "Reports", icon: FileText },
      { to: "/data-import", label: "Data Import", icon: Upload },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function AppShell() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s: any) => s.location.pathname });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Don't render anything, useEffect will redirect
  }

  const {
    activeProductId,
    activeCustomerId,
    activeSupplierId,
    activeRecId,
    openProduct360,
    openCustomer360,
    openSupplier360,
    openRecommendation,
    products,
    customers,
    suppliers,
  } = useBusinessData();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Cmd/Ctrl + K to focus search, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close notification dropdown
  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [notifOpen]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { products: [], customers: [], suppliers: [] };
    const q = searchQuery.toLowerCase();
    return {
      products: products
        .filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
        .slice(0, 3),
      customers: customers
        .filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
        .slice(0, 3),
      suppliers: suppliers
        .filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
        .slice(0, 3),
    };
  }, [searchQuery, products, customers, suppliers]);

  useEffect(() => {
    // If auth is still loading, don't redirect yet
    if (loading) return;

    // If no valid server session, redirect to login
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    // Role-based route guard
    if (user) {
      const restrictedPaths = ["/settings", "/tax", "/data-import", "/income", "/departments"];
      if (user.role === "manager" && restrictedPaths.some((p) => pathname.startsWith(p))) {
        toast.error("Access Denied: You do not have permissions to view this page.");
        navigate({ to: "/command-center" });
      }
    }
  }, [navigate, user, loading, pathname]);

  const filteredNAV = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (user?.role === "manager") {
        const restricted = ["/settings", "/tax", "/data-import", "/income", "/departments"];
        return !restricted.includes(item.to);
      }
      return true;
    }),
  })).filter((section) => section.items.length > 0);

  const currentLabel =
    filteredNAV.flatMap((s) => s.items).find((i) => i.to === pathname)?.label ?? "Overview";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen shrink-0 flex-col bg-sidebar transition-all duration-300",
          "border-r-2 border-r-primary/30",
          // Desktop
          "lg:sticky lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "lg:w-[260px]",
          // Mobile
          mobileOpen ? "w-[280px] translate-x-0 shadow-2xl shadow-primary/10" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Subtle gradient overlay on sidebar for premium feel */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-violet/5" />

        <div className="relative hairline-b flex items-center gap-3 px-4 py-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg gradient-primary shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight">{"OmniMind AI"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{MALL.name}</p>
            </div>
          )}
          {/* Close mobile menu */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "ml-auto rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hidden lg:block",
              collapsed && "mx-auto ml-0",
            )}
            aria-label="Toggle sidebar"
          >
            <ChevronsLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-2 py-4">
          {filteredNAV.map((section) => (
            <div key={section.section} className="mb-4">
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary/70">
                  {section.section}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to as never}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-primary/15 text-foreground shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r gradient-primary" />
                        )}
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative hairline-t p-4">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-violet text-sm font-bold text-primary-foreground shadow-md shadow-primary/20">
              {user?.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("") ?? "U"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user?.name}</p>
                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {user?.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={async () => {
                  await logout();
                  navigate({ to: "/login" });
                }}
                className="rounded-md p-2 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 hairline-b glass">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span>OmniMind</span>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate font-medium text-foreground">{currentLabel}</span>
            </div>

            <div className="relative ml-auto hidden max-w-md flex-1 md:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search products, customers, suppliers…  ⌘K"
                className="w-full rounded-md border border-hairline bg-surface py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />

              {/* Floating search dropdown */}
              {searchOpen && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-[380px] overflow-y-auto rounded-lg border border-hairline bg-popover p-2 text-xs shadow-2xl z-50 text-foreground">
                  {/* Backdrop click blocker */}
                  <div className="fixed inset-0 z-[-1]" onClick={() => setSearchOpen(false)} />

                  {searchResults.products.length === 0 &&
                  searchResults.customers.length === 0 &&
                  searchResults.suppliers.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground">
                      No matches found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Products Group */}
                      {searchResults.products.length > 0 && (
                        <div>
                          <p className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Products
                          </p>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.products.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  openProduct360(p.id);
                                  setSearchQuery("");
                                  setSearchOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-surface flex justify-between items-center"
                              >
                                <span className="font-medium text-foreground">{p.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {p.id}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Customers Group */}
                      {searchResults.customers.length > 0 && (
                        <div>
                          <p className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Customers
                          </p>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.customers.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  openCustomer360(c.id);
                                  setSearchQuery("");
                                  setSearchOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-surface flex justify-between items-center"
                              >
                                <span className="font-medium text-foreground">{c.name}</span>
                                <span className="text-[10px] text-muted-foreground">{c.id}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suppliers Group */}
                      {searchResults.suppliers.length > 0 && (
                        <div>
                          <p className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Suppliers
                          </p>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.suppliers.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  openSupplier360(s.id);
                                  setSearchQuery("");
                                  setSearchOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-surface flex justify-between items-center"
                              >
                                <span className="font-medium text-foreground">{s.name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {s.category}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5 md:ml-0">
              <div className="hidden items-center gap-1.5 rounded-md border border-hairline bg-surface px-2 py-1 text-[11px] font-medium sm:flex">
                <Circle className="h-2 w-2 fill-success text-success" />
                Mall Open · 09:00–22:00
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => navigate({ to: "/time-machine" as never })}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              {/* Notification bell with dropdown */}
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground"
                  onClick={() => setNotifOpen((o) => !o)}
                >
                  <Bell className="h-4 w-4" />
                  {ANOMALIES.length + LIVE_FEED.length - readNotifs.size > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                      {Math.min(ANOMALIES.length + LIVE_FEED.length - readNotifs.size, 99)}
                    </span>
                  )}
                </Button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[calc(100vw-32px)] max-w-[360px] sm:max-w-[400px] max-h-[80vh] sm:max-h-[480px] overflow-hidden rounded-xl border border-hairline bg-popover shadow-2xl z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 hairline-b">
                      <div>
                        <p className="text-sm font-bold">Notifications</p>
                        <p className="text-[11px] text-muted-foreground">
                          {ANOMALIES.length + LIVE_FEED.length - readNotifs.size} unread
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const allIds = [
                            ...ANOMALIES.map((a) => a.id),
                            ...LIVE_FEED.map((_, i) => `feed-${i}`),
                          ];
                          setReadNotifs(new Set(allIds));
                        }}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto divide-y divide-hairline">
                      {/* Anomaly alerts */}
                      {ANOMALIES.map((a) => {
                        const isRead = readNotifs.has(a.id);
                        const severityColor =
                          a.severity === "Critical"
                            ? "bg-destructive/15 text-destructive"
                            : a.severity === "High"
                              ? "bg-warning/15 text-warning"
                              : a.severity === "Medium"
                                ? "bg-info/15 text-info"
                                : "bg-muted text-muted-foreground";
                        return (
                          <button
                            key={a.id}
                            onClick={() => {
                              setReadNotifs((prev) => new Set([...prev, a.id]));
                              setNotifOpen(false);
                              navigate({ to: "/anomalies" });
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 hover:bg-surface transition-colors flex gap-3",
                              !isRead && "bg-primary/5",
                            )}
                          >
                            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-destructive/10">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold truncate">{a.metric}</span>
                                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold", severityColor)}>
                                  {a.severity}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                {a.actual} vs expected {a.expected} ({a.deviation})
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">{a.when}</p>
                            </div>
                            {!isRead && (
                              <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </button>
                        );
                      })}

                      {/* Live feed items */}
                      {LIVE_FEED.map((f, i) => {
                        const feedId = `feed-${i}`;
                        const isRead = readNotifs.has(feedId);
                        const iconMap: Record<string, typeof Activity> = {
                          sale: ShoppingBagIcon,
                          customer: Users,
                          alert: AlertTriangle,
                          delivery: Truck,
                          return: RotateCcw,
                          ai: Sparkles,
                          expense: Wallet,
                        };
                        const FeedIcon = iconMap[f.type] || Activity;
                        const colorMap: Record<string, string> = {
                          sale: "bg-success/10 text-success",
                          customer: "bg-info/10 text-info",
                          alert: "bg-warning/10 text-warning",
                          delivery: "bg-primary/10 text-primary",
                          return: "bg-destructive/10 text-destructive",
                          ai: "bg-violet/10 text-violet",
                          expense: "bg-warning/10 text-warning",
                        };
                        return (
                          <button
                            key={feedId}
                            onClick={() => {
                              setReadNotifs((prev) => new Set([...prev, feedId]));
                              setNotifOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 hover:bg-surface transition-colors flex gap-3",
                              !isRead && "bg-primary/5",
                            )}
                          >
                            <div className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", colorMap[f.type] || "bg-muted")}>
                              <FeedIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">{f.text}</p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">{f.t}</p>
                            </div>
                            {!isRead && (
                              <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="hairline-t px-4 py-2.5 text-center">
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate({ to: "/anomalies" });
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        View all anomalies & alerts →
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                className="gap-1.5 gradient-primary text-primary-foreground"
                onClick={() => navigate({ to: "/ai-decisions" })}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ask OmniMind</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Global Details Drawers */}
        <Product360Drawer
          productId={activeProductId}
          open={!!activeProductId}
          onOpenChange={(open) => !open && openProduct360(null)}
        />
        <Customer360Drawer
          customerId={activeCustomerId}
          open={!!activeCustomerId}
          onOpenChange={(open) => !open && openCustomer360(null)}
        />
        <Supplier360Drawer
          supplierId={activeSupplierId}
          open={!!activeSupplierId}
          onOpenChange={(open) => !open && openSupplier360(null)}
        />
        <RecommendationInvestigateDrawer
          recId={activeRecId}
          open={!!activeRecId}
          onOpenChange={(open) => !open && openRecommendation(null)}
        />
      </div>
    </div>
  );
}
