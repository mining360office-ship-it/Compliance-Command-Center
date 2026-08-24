import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, CalendarDays, ShieldCheck, FileWarning, ClipboardCheck,
  KeyRound, FolderLock, BarChart3, Settings, Users2, Mountain, Menu, HardHat,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Compliance Calendar", icon: CalendarDays },
  { to: "/compliance", label: "Compliance Management", icon: ShieldCheck },
  { to: "/notices", label: "Notices & Violations", icon: FileWarning },
  { to: "/inspections", label: "Inspection Management", icon: ClipboardCheck },
  { to: "/licenses", label: "Licenses & Permits", icon: KeyRound },
  { to: "/statutory-manpower", label: "Statutory Manpower", icon: HardHat },
  { to: "/vault", label: "Document Vault", icon: FolderLock },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/admin", label: "Administration", icon: Users2 },
];

function SidebarContents({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2.5 shrink-0">
        <div className="size-9 rounded-md bg-sidebar-primary/15 grid place-items-center shrink-0">
          <Mountain className="size-5 text-sidebar-primary" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-semibold text-sm tracking-tight">MineCompli</div>
          <div className="text-[11px] text-sidebar-foreground/60 leading-4">Mining Compliance Management System</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary-foreground font-medium ring-1 ring-sidebar-primary/30"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60 shrink-0">
        v0.1 · Prototype
      </div>
    </>
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const handleDesktop = () => {
      if (media.matches) setMobileOpen(false);
    };
    handleDesktop();
    media.addEventListener("change", handleDesktop);
    return () => media.removeEventListener("change", handleDesktop);
  }, []);

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0">
        <SidebarContents pathname={pathname} />
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        className="md:hidden fixed left-3 top-3 z-40 size-10 grid place-items-center rounded-md border border-input bg-card text-foreground shadow-sm hover:bg-accent active:bg-accent"
      >
        <Menu className="size-5" />
      </button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="md:hidden flex h-dvh flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          style={{ width: "min(20rem, calc(100vw - 2rem))" }}
        >
          <SheetTitle className="sr-only">MineCompli navigation</SheetTitle>
          <SidebarContents pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
