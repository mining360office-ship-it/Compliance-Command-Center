import { useState } from "react";
import { Bell, Search, ChevronDown, Loader2, LogOut, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "../integrations/supabase/client";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/compliance", search: { q: searchQuery } });
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSearchOpen(!searchOpen);
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setProfileOpen(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();
    if (!error) {
      setProfileOpen(false);
      void navigate({ to: "/login", replace: true });
      return;
    }

    setLoggingOut(false);
  };

  return (
    <header className="min-h-16 border-b border-border bg-card flex items-center pl-15 pr-3 py-2 gap-2 sm:px-6 sm:gap-6 shrink-0" onKeyDown={handleKeyDown}>
      <div className="min-w-0 flex-1 sm:flex-none">
        <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-3 shrink-0">
        {searchOpen ? (
          <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm w-72">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search compliances, mines, notices…"
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">Enter</kbd>
          </form>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground w-72 hover:bg-accent transition cursor-pointer"
          >
            <Search className="size-4" />
            <span>Search compliances, mines, notices…</span>
            <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">⌘K</kbd>
          </button>
        )}
        <button className="relative size-9 sm:size-9 grid place-items-center rounded-md border border-input bg-background hover:bg-accent transition shrink-0" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>
        <div className="relative sm:pl-3 sm:border-l border-border">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-1 sm:gap-2 rounded-md px-0.5 sm:px-1 py-1 hover:bg-accent transition"
          >
            <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold shrink-0">RV</div>
            <div className="hidden md:block leading-tight text-left">
              <div className="text-sm font-medium">Ravi Verma</div>
              <div className="text-[11px] text-muted-foreground">Compliance Officer</div>
            </div>
            <ChevronDown className={`hidden sm:block size-4 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div role="menu" className="absolute right-0 top-11 z-50 w-44 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-popover p-1 shadow-md">
              <div className="md:hidden px-3 py-2 border-b border-border mb-1">
                <div className="text-sm font-medium truncate">Ravi Verma</div>
                <div className="text-[11px] text-muted-foreground truncate">Compliance Officer</div>
              </div>
              <button
                type="button"
                role="menuitem"
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                {loggingOut ? "Signing out…" : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
