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
  TrendingDown,
  Zap,
  FileBarChart,
  Building2,
  UserCog,
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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MALL } from "@/lib/mock-data";
import { toast } from "sonner";
import { useBusinessData } from "@/lib/business-context";
import {
  Product360Drawer,
  Customer360Drawer,
  Supplier360Drawer,
  RecommendationInvestigateDrawer,
} from "@/components/details-drawers";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const role = window.localStorage.getItem("omnimind_role");
      if (!role) throw redirect({ to: "/login" });
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s: any) => s.location.pathname });

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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    // If somehow no user after mount, bounce
    if (typeof window !== "undefined" && !window.localStorage.getItem("omnimind_role")) {
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
  }, [navigate, user, pathname]);

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
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-hairline bg-sidebar transition-[width] duration-200",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        <div className="hairline-b flex items-center gap-2 px-4 py-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">OmniMind AI</p>
              <p className="truncate text-[10px] text-muted-foreground">{MALL.name}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "ml-auto rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              collapsed && "mx-auto ml-0",
            )}
            aria-label="Toggle sidebar"
          >
            <ChevronsLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {filteredNAV.map((section) => (
            <div key={section.section} className="mb-3">
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-primary/12 text-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r gradient-primary" />
                        )}
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
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

        <div className="hairline-t p-3">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-violet text-xs font-semibold text-primary-foreground">
              {user?.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("") ?? "U"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{user?.name}</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-primary">
                  {user?.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => {
                  logout();
                  navigate({ to: "/login" });
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
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
              <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              </Button>
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
