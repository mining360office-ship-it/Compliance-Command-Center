import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Search, ShieldCheck, KeyRound, ClipboardCheck, FileWarning, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMasterNames } from "@/lib/masters";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Compliance Calendar — Mining Compliance Command Center" }] }),
  component: CalendarModule,
});

const AUTHORITIES_FALLBACK = ["IBM", "DGMS", "MoEFCC", "SPCB", "Forest", "PESO", "Revenue", "Labour", "State Mining", "Other"];
const MINES_FALLBACK = ["Block A-12", "Block B-7", "Block C-3", "Block D-9", "Block E-1"];
const STATUSES = ["Upcoming", "In Progress", "Submitted", "Approved", "Completed", "Overdue", "Escalated", "Cancelled", "Active", "Expiring Soon", "Expired", "Open", "Closed"];

type EventKind = "compliance" | "license" | "inspection" | "notice";
type CalEvent = {
  id: string;
  date: string; // yyyy-mm-dd
  kind: EventKind;
  title: string;
  authority: string | null;
  mine: string | null;
  status: string | null;
  meta?: string;
};

const KIND_META: Record<EventKind, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  compliance: { label: "Compliance Due", cls: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300", Icon: ShieldCheck },
  license: { label: "License Expiry", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300", Icon: KeyRound },
  inspection: { label: "Inspection", cls: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300", Icon: ClipboardCheck },
  notice: { label: "Notice Reply Due", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: FileWarning },
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function parseYmdLocal(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}
function isCalendarView(value: unknown): value is "month" | "week" | "day" {
  return value === "month" || value === "week" || value === "day";
}

function CalendarModule() {
  const navigate = useNavigate();
  const calendarSearch = useSearch({ from: "/calendar" });
  const initialDate = parseYmdLocal(calendarSearch.date);
  const initialView = isCalendarView(calendarSearch.view) ? calendarSearch.view : "month";

  const { names: AUTHORITIES } = useMasterNames("authorities", AUTHORITIES_FALLBACK);
  const { names: MINES } = useMasterNames("mines", MINES_FALLBACK);

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "day">(initialView);
  const [cursor, setCursor] = useState<Date>(() => initialDate ?? new Date());

  const [search, setSearch] = useState("");
  const [fMine, setFMine] = useState("all");
  const [fAuthority, setFAuthority] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fKind, setFKind] = useState<"all" | EventKind>("all");

  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [c, l, i, n] = await Promise.all([
      (supabase as any).from("compliances").select("id,title,authority,mine,status,due_date,completion_date"),
      (supabase as any).from("licenses").select("id,license_name,authority,mine,status,expiry_date").not("expiry_date", "is", null),
      (supabase as any).from("inspections").select("id,inspection_number,authority,mine,closure_status,inspection_date").not("inspection_date", "is", null),
      (supabase as any).from("notices").select("id,notice_number,subject,authority,mine,status,received_date,reply_due_date,timeline").not("reply_due_date", "is", null),
    ]);
    const errs = [c.error, l.error, i.error, n.error].filter(Boolean);
    if (errs.length) toast.error("Failed to load calendar", { description: errs.map((e) => e!.message).join("; ") });

    const all: CalEvent[] = [];
    for (const r of (c.data ?? []) as any[]) {
      const date = r.completion_date ?? r.due_date;
      if (date) all.push({ id: `c-${r.id}`, date, kind: "compliance", title: r.title, authority: r.authority, mine: r.mine, status: r.status });
    }
    for (const r of (l.data ?? []) as any[]) all.push({ id: `l-${r.id}`, date: r.expiry_date, kind: "license", title: r.license_name, authority: r.authority, mine: r.mine, status: r.status });
    for (const r of (i.data ?? []) as any[]) all.push({ id: `i-${r.id}`, date: r.inspection_date, kind: "inspection", title: r.inspection_number ?? "Inspection", authority: r.authority, mine: r.mine, status: r.closure_status, meta: r.inspection_number });
    for (const r of (n.data ?? []) as any[]) {
      const createdFromCalendar = Array.isArray(r.timeline) && r.timeline.some((t: any) => t?.by === "Compliance Calendar");
      const date = createdFromCalendar ? (r.received_date ?? r.reply_due_date) : r.reply_due_date;
      if (date) all.push({ id: `n-${r.id}`, date, kind: "notice", title: r.subject ?? r.notice_number ?? "Notice", authority: r.authority, mine: r.mine, status: r.status, meta: r.notice_number });
    }

    setEvents(all);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (q) {
        const hay = [e.title, e.authority, e.mine, e.status, e.meta].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fMine !== "all" && e.mine !== fMine) return false;
      if (fAuthority !== "all" && e.authority !== fAuthority) return false;
      if (fStatus !== "all" && e.status !== fStatus) return false;
      if (fKind !== "all" && e.kind !== fKind) return false;
      return true;
    });
  }, [events, search, fMine, fAuthority, fStatus, fKind]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of filtered) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [filtered]);

  function shift(delta: number) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCursor(d);
  }

  function openQuickEntry(date: Date) {
    setSelectedDate(toYmd(date));
  }

  function createEntry(kind: EventKind) {
    if (!selectedDate) return;
    const target = kind === "compliance" ? "/compliance"
      : kind === "notice" ? "/notices"
      : kind === "inspection" ? "/inspections"
      : "/licenses";
    navigate({
      to: target,
      search: {
        create: "1",
        date: selectedDate,
        fromCalendar: "1",
        calendarView: view,
      } as any,
    });
  }

  const title = useMemo(() => {
    if (view === "month") return cursor.toLocaleString("default", { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString("default", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [cursor, view]);

  return (
    <>
      <Topbar title="Compliance Calendar" subtitle="All regulatory deadlines across mines & authorities" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, authority, status…" className="pl-8" />
            </div>
            <FilterSelect label="Type" value={fKind} onChange={(v) => setFKind(v as any)} options={[
              { value: "compliance", label: "Compliance" },
              { value: "license", label: "License" },
              { value: "inspection", label: "Inspection" },
              { value: "notice", label: "Notice" },
            ]} />
            <FilterSelect label="Mine" value={fMine} onChange={setFMine} options={MINES.map((o) => ({ value: o, label: o }))} />
            <FilterSelect label="Authority" value={fAuthority} onChange={setFAuthority} options={AUTHORITIES.map((o) => ({ value: o, label: o }))} />
            <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={STATUSES.map((o) => ({ value: o, label: o }))} />
            <div className="ml-auto inline-flex rounded-md border border-border overflow-hidden">
              {(["month", "week", "day"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm capitalize ${view === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="size-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
            </div>
            <div className="font-semibold">{title}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {(Object.keys(KIND_META) as EventKind[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${KIND_META[k].cls.split(" ")[0]}`} />
                  {KIND_META[k].label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-muted-foreground"><Loader2 className="size-4 animate-spin inline mr-2" /> Loading calendar…</div>
          ) : view === "month" ? (
            <MonthView cursor={cursor} byDate={byDate} onClickEvent={setSelected} onClickDate={openQuickEntry} />
          ) : view === "week" ? (
            <WeekView cursor={cursor} byDate={byDate} onClickEvent={setSelected} onClickDate={openQuickEntry} />
          ) : (
            <DayView cursor={cursor} events={byDate.get(toYmd(cursor)) ?? []} onClickEvent={setSelected} onClickDate={openQuickEntry} />
          )}
        </div>
      </main>

      <Dialog open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Entry</DialogTitle>
            <DialogDescription>
              {selectedDate && parseYmdLocal(selectedDate)
                ? `Create a new entry for ${parseYmdLocal(selectedDate)!.toLocaleDateString("default", { day: "numeric", month: "long", year: "numeric" })}.`
                : "Choose the entry type to create."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start" onClick={() => createEntry("compliance")}>
              <ShieldCheck className="size-4" /> Compliance
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => createEntry("notice")}>
              <FileWarning className="size-4" /> Notice
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => createEntry("inspection")}>
              <ClipboardCheck className="size-4" /> Inspection
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => createEntry("license")}>
              <KeyRound className="size-4" /> License
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (() => {
            const Icon = KIND_META[selected.kind].Icon;
            return (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {selected.title}
                </DialogTitle>
                <DialogDescription asChild>
                  <Badge variant="outline" className={KIND_META[selected.kind].cls}>{KIND_META[selected.kind].label}</Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm space-y-1.5">
                <div><span className="text-muted-foreground">Date:</span> {selected.date}</div>
                {selected.authority && <div><span className="text-muted-foreground">Authority:</span> {selected.authority}</div>}
                {selected.mine && <div><span className="text-muted-foreground">Mine:</span> {selected.mine}</div>}
                {selected.status && <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>}
                {selected.meta && <div><span className="text-muted-foreground">Ref:</span> {selected.meta}</div>}
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MonthView({ cursor, byDate, onClickEvent, onClickDate }: { cursor: Date; byDate: Map<string, CalEvent[]>; onClickEvent: (e: CalEvent) => void; onClickDate: (d: Date) => void }) {
  const first = startOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  const today = new Date();
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, idx) => {
          const ev = byDate.get(toYmd(d)) ?? [];
          const otherMonth = d.getMonth() !== cursor.getMonth();
          const isToday = sameDay(d, today);
          return (
            <div key={idx} role="button" tabIndex={0} onClick={() => onClickDate(d)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClickDate(d); } }} className={`min-h-[110px] border-b border-r border-border p-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary/40 ${otherMonth ? "bg-muted/30" : ""}`}>
              <div className={`text-xs ${isToday ? "inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold" : otherMonth ? "text-muted-foreground" : "text-foreground"}`}>
                {d.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {ev.slice(0, 3).map((e) => (
                  <button key={e.id} onClick={(event) => { event.stopPropagation(); onClickEvent(e); }} className={`w-full truncate text-left text-[11px] px-1.5 py-0.5 rounded border ${KIND_META[e.kind].cls}`}>
                    {e.title}
                  </button>
                ))}
                {ev.length > 3 && <div className="text-[11px] text-muted-foreground px-1.5">+{ev.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, byDate, onClickEvent, onClickDate }: { cursor: Date; byDate: Map<string, CalEvent[]>; onClickEvent: (e: CalEvent) => void; onClickDate: (d: Date) => void }) {
  const s = startOfWeek(cursor);
  const today = new Date();
  return (
    <div className="grid grid-cols-7">
      {Array.from({ length: 7 }, (_, i) => addDays(s, i)).map((d, idx) => {
        const ev = byDate.get(toYmd(d)) ?? [];
        const isToday = sameDay(d, today);
        return (
          <div key={idx} role="button" tabIndex={0} onClick={() => onClickDate(d)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClickDate(d); } }} className="min-h-[400px] border-r border-border last:border-r-0 p-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary/40">
            <div className="text-xs text-muted-foreground">{d.toLocaleDateString("default", { weekday: "short" })}</div>
            <div className={`mb-2 text-lg ${isToday ? "inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold" : "font-semibold"}`}>{d.getDate()}</div>
            <div className="space-y-1">
              {ev.map((e) => (
                <button key={e.id} onClick={(event) => { event.stopPropagation(); onClickEvent(e); }} className={`block w-full text-left text-xs px-2 py-1 rounded border ${KIND_META[e.kind].cls}`}>
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="opacity-80 truncate">{e.authority ?? "—"}{e.mine ? ` · ${e.mine}` : ""}</div>
                </button>
              ))}
              {ev.length === 0 && <div className="text-xs text-muted-foreground">No events</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, events, onClickEvent, onClickDate }: { cursor: Date; events: CalEvent[]; onClickEvent: (e: CalEvent) => void; onClickDate: (d: Date) => void }) {
  return (
    <div className="p-4">
      <button type="button" onClick={() => onClickDate(cursor)} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        {events.length} event{events.length === 1 ? "" : "s"} on {toYmd(cursor)} <Plus className="size-3.5" />
      </button>
      {events.length === 0 ? (
        <div className="text-sm text-muted-foreground py-10 text-center">No events scheduled.</div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => {
            const Icon = KIND_META[e.kind].Icon;
            return (
              <button key={e.id} onClick={() => onClickEvent(e)} className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${KIND_META[e.kind].cls}`}>
                <Icon className="size-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-xs opacity-80 truncate">
                    {KIND_META[e.kind].label}
                    {e.authority ? ` · ${e.authority}` : ""}
                    {e.mine ? ` · ${e.mine}` : ""}
                    {e.status ? ` · ${e.status}` : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
