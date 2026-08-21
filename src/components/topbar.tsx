import { useState } from "react";
import { Bell, Search, ChevronDown, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-6" onKeyDown={handleKeyDown}>
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {searchOpen ? (
          <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm w-72">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search compliances, mines, notices…"
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
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
        <button className="relative size-9 grid place-items-center rounded-md border border-input bg-background hover:bg-accent transition">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">RV</div>
          <div className="hidden md:block leading-tight">
            <div className="text-sm font-medium">Ravi Verma</div>
            <div className="text-[11px] text-muted-foreground">Compliance Officer</div>
          </div>
          <ChevronDown className="size-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
