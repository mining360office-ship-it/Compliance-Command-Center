import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, ShieldCheck, FileWarning, ClipboardCheck,
  KeyRound, FolderLock, BarChart3, Settings, Users2, Mountain,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Compliance Calendar", icon: CalendarDays },
  { to: "/compliance", label: "Compliance Management", icon: ShieldCheck },
  { to: "/notices", label: "Notices & Violations", icon: FileWarning },
  { to: "/inspections", label: "Inspection Management", icon: ClipboardCheck },
  { to: "/licenses", label: "Licenses & Permits", icon: KeyRound },
  { to: "/vault", label: "Document Vault", icon: FolderLock },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/admin", label: "Administration", icon: Users2 },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2.5 shrink-0">
        <div className="size-9 rounded-md bg-sidebar-primary/15 grid place-items-center">
          <Mountain className="size-5 text-sidebar-primary" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm tracking-tight">Mining Compliance Command Center</div>
          <div className="text-[11px] text-sidebar-foreground/60">Regulatory Operations</div>
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
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary-foreground font-medium ring-1 ring-sidebar-primary/30"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60 shrink-0">
        v0.1 · Prototype
      </div>
    </aside>
  );
}
