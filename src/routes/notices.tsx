import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ArrowUpDown, Pencil, Trash2, Loader2, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMasterNames } from "@/lib/masters";

export const Route = createFileRoute("/notices")({
  head: () => ({ meta: [{ title: "MineCompli — Mining Compliance Management System" }] }),
  component: NoticesModule,
});

const AUTHORITIES_FALLBACK = ["IBM", "DGMS", "MoEFCC", "SPCB", "Forest", "PESO", "Revenue", "Labour", "State Mining", "Other"];
const MINES_FALLBACK = ["Block A-12", "Block B-7", "Block C-3", "Block D-9", "Block E-1"];
const DEPARTMENTS_FALLBACK = ["Mining", "Environment", "Safety", "Legal", "HR", "Finance", "Operations"];
const STATUSES = ["Open", "In Progress", "Replied", "Under Review", "Closed", "Escalated"];
const RISK_LEVELS = ["Critical", "High", "Medium", "Low"];
const DEFAULT_REMINDERS = "1,3,7,15,30";

type NoticeDoc = { name: string; path: string; url: string; size: number };
type TimelineEvent = { date: string; event: string; by?: string };

type Notice = {
  id: string;
  notice_number: string;
  subject: string;
  authority: string;
  mine: string | null;
  received_date: string;
  reply_period_days: number;
  reply_due_date: string;
  status: string;
  risk_level: string;
  reminder_days: number[];
  reminder_dates: string[];
  timeline: TimelineEvent[];
  legal_remarks: string | null;
  documents: NoticeDoc[];
  responsible_person: string | null;
  department: string | null;
  tags: string[] | null;
  closed_date: string | null;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  subject: "",
  authority: "",
  mine: "",
  received_date: new Date().toISOString().slice(0, 10),
  reply_period_days: "30",
  status: "Open",
  risk_level: "Medium",
  reminder_days: DEFAULT_REMINDERS,
  legal_remarks: "",
  responsible_person: "",
  department: "",
  tags: "",
  closed_date: "",
};
type FormState = typeof emptyForm;

function riskBadge(r: string) {
  const map: Record<string, string> = {
    Critical: "bg-destructive/15 text-destructive border-destructive/30",
    High: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
    Medium: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
    Low: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  };
  return map[r] ?? "bg-muted text-muted-foreground border-border";
}
function statusBadge(s: string) {
  const map: Record<string, string> = {
    Open: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300",
    "In Progress": "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    Replied: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300",
    "Under Review": "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
    Closed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    Escalated: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return map[s] ?? "bg-muted text-muted-foreground border-border";
}

function parseReminderDays(str: string): number[] {
  return Array.from(new Set(str.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n >= 0))).sort((a, b) => a - b);
}

function NoticesModule() {
  const { names: AUTHORITIES } = useMasterNames("authorities", AUTHORITIES_FALLBACK);
  const { names: MINES } = useMasterNames("mines", MINES_FALLBACK);
  const { names: DEPARTMENTS } = useMasterNames("departments", DEPARTMENTS_FALLBACK);
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/notices" });
  const calendarCreateDate = searchParams.create === "1" && searchParams.fromCalendar === "1"
    && typeof searchParams.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : "";
  const calendarReturnView = searchParams.calendarView === "week" || searchParams.calendarView === "day" ? searchParams.calendarView : "month";

  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [docs, setDocs] = useState<NoticeDoc[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [fAuthority, setFAuthority] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fRisk, setFRisk] = useState("all");
  const [fMine, setFMine] = useState("all");
  const [fDueFrom, setFDueFrom] = useState("");
  const [fDueTo, setFDueTo] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("notices")
      .select("*")
      .order("reply_due_date", { ascending: true });
    if (error) toast.error("Failed to load notices", { description: error.message });
    else setRows((data ?? []) as Notice[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!calendarCreateDate) return;
    setEditing(null);
    setForm({ ...emptyForm, received_date: calendarCreateDate });
    setDocs([]);
    setDialogOpen(true);
  }, [calendarCreateDate]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setDocs([]);
    setDialogOpen(true);
  }
  function openEdit(row: Notice) {
    setEditing(row);
    setForm({
      subject: row.subject,
      authority: row.authority,
      mine: row.mine ?? "",
      received_date: row.received_date,
      reply_period_days: String(row.reply_period_days ?? 30),
      status: row.status,
      risk_level: row.risk_level,
      reminder_days: (row.reminder_days ?? []).join(","),
      legal_remarks: row.legal_remarks ?? "",
      responsible_person: row.responsible_person ?? "",
      department: row.department ?? "",
      tags: (row.tags ?? []).join(", "),
      closed_date: row.closed_date ?? "",
    });
    setDocs(Array.isArray(row.documents) ? row.documents : []);
    setDialogOpen(true);
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newDocs: NoticeDoc[] = [];
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("notice-documents").upload(path, file);
      if (upErr) { toast.error(`Upload failed: ${file.name}`, { description: upErr.message }); continue; }
      const { data: signed } = await supabase.storage.from("notice-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      newDocs.push({ name: file.name, path, url: signed?.signedUrl ?? "", size: file.size });
    }
    setDocs((d) => [...d, ...newDocs]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (newDocs.length) toast.success(`${newDocs.length} document(s) uploaded`);
  }

  async function removeDoc(doc: NoticeDoc) {
    await supabase.storage.from("notice-documents").remove([doc.path]);
    setDocs((d) => d.filter((x) => x.path !== doc.path));
  }

  async function handleSave() {
    if (!form.subject.trim()) return toast.error("Subject is required");
    if (!form.authority) return toast.error("Authority is required");
    if (!form.received_date) return toast.error("Received date is required");
    const period = parseInt(form.reply_period_days, 10);
    if (!Number.isFinite(period) || period < 0) return toast.error("Reply period must be a positive number");

    setSaving(true);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const reminder_days = parseReminderDays(form.reminder_days);

    const timelineEvent: TimelineEvent = {
      date: new Date().toISOString(),
      event: editing ? `Updated · status: ${form.status}` : `Notice created · status: ${form.status}`,
      ...(!editing && calendarCreateDate ? { by: "Compliance Calendar" } : {}),
    };
    const existingTimeline = editing?.timeline ?? [];
    const timeline = [...existingTimeline, timelineEvent];

    const payload: Record<string, unknown> = {
      subject: form.subject.trim(),
      authority: form.authority,
      mine: form.mine || null,
      received_date: form.received_date,
      reply_period_days: period,
      status: form.status,
      risk_level: form.risk_level,
      reminder_days,
      legal_remarks: form.legal_remarks || null,
      responsible_person: form.responsible_person || null,
      department: form.department || null,
      tags: tags.length ? tags : null,
      closed_date: form.closed_date || null,
      documents: docs,
      timeline,
    };

    const q = editing
      ? (supabase as any).from("notices").update(payload).eq("id", editing.id)
      : (supabase as any).from("notices").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(editing ? "Update failed" : "Create failed", { description: error.message });
    const createdFromCalendar = !editing && !!calendarCreateDate;
    toast.success(editing ? "Notice updated" : "Notice created");
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setDocs([]);
    if (createdFromCalendar) {
      navigate({ to: "/calendar", search: { date: calendarCreateDate, view: calendarReturnView } as any });
      return;
    }
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.documents?.length) {
      await supabase.storage.from("notice-documents").remove(deleteTarget.documents.map((d) => d.path));
    }
    const { error } = await (supabase as any).from("notices").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Delete failed", { description: error.message });
    else {
      toast.success("Notice deleted");
      setDeleteTarget(null);
      load();
    }
  }

  const replyDuePreview = useMemo(() => {
    if (!form.received_date) return "";
    const p = parseInt(form.reply_period_days, 10);
    if (!Number.isFinite(p)) return "";
    const d = new Date(form.received_date);
    d.setDate(d.getDate() + p);
    return d.toISOString().slice(0, 10);
  }, [form.received_date, form.reply_period_days]);

  const reminderPreview = useMemo(() => {
    if (!replyDuePreview) return [];
    const days = parseReminderDays(form.reminder_days);
    return days.map((n) => {
      const d = new Date(replyDuePreview);
      d.setDate(d.getDate() - n);
      return { n, date: d.toISOString().slice(0, 10) };
    });
  }, [replyDuePreview, form.reminder_days]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = rows.filter((r) => {
      if (q) {
        const hay = [r.notice_number, r.subject, r.authority, r.mine, r.responsible_person, r.department, r.legal_remarks]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fAuthority !== "all" && r.authority !== fAuthority) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      if (fRisk !== "all" && r.risk_level !== fRisk) return false;
      if (fMine !== "all" && r.mine !== fMine) return false;
      if (fDueFrom && r.reply_due_date < fDueFrom) return false;
      if (fDueTo && r.reply_due_date > fDueTo) return false;
      return true;
    });
    arr.sort((a, b) => sortAsc
      ? (a.reply_due_date < b.reply_due_date ? -1 : 1)
      : (a.reply_due_date < b.reply_due_date ? 1 : -1));
    return arr;
  }, [rows, search, fAuthority, fStatus, fRisk, fMine, fDueFrom, fDueTo, sortAsc]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Topbar title="Notices & Violations" subtitle="Manage show-cause, violation, and legal notices" />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-full min-w-0 sm:min-w-[220px] sm:flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notice #, subject, authority, person…" className="pl-8" />
            </div>
            <FilterSelect label="Authority" value={fAuthority} onChange={setFAuthority} options={AUTHORITIES} />
            <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={STATUSES} />
            <FilterSelect label="Risk" value={fRisk} onChange={setFRisk} options={RISK_LEVELS} />
            <FilterSelect label="Mine" value={fMine} onChange={setFMine} options={MINES} />
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Reply due from</Label>
              <Input type="date" value={fDueFrom} onChange={(e) => setFDueFrom(e.target.value)} className="w-full sm:w-[150px]" />
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Reply due to</Label>
              <Input type="date" value={fDueTo} onChange={(e) => setFDueTo(e.target.value)} className="w-full sm:w-[150px]" />
            </div>
            <Button onClick={openNew} className="w-full sm:w-auto sm:ml-auto">
              <Plus className="size-4" /> New Notice
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notice #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Mine</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>
                  <button onClick={() => setSortAsc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">
                    Reply Due <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Docs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin inline mr-2" /> Loading notices…
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  No notices found. Click <span className="text-foreground font-medium">New Notice</span> to create one.
                </TableCell></TableRow>
              ) : filtered.map((r) => {
                const overdue = r.reply_due_date < today && r.status !== "Closed" && r.status !== "Replied";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.notice_number}</TableCell>
                    <TableCell className="font-medium max-w-[260px] truncate">{r.subject}</TableCell>
                    <TableCell>{r.authority}</TableCell>
                    <TableCell>{r.mine ?? "—"}</TableCell>
                    <TableCell>{r.received_date}</TableCell>
                    <TableCell className={overdue ? "text-destructive font-medium" : ""}>{r.reply_due_date}</TableCell>
                    <TableCell><Badge variant="outline" className={riskBadge(r.risk_level)}>{r.risk_level}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.documents?.length ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Edit"><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(r)} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); setDocs([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.notice_number}` : "New Notice"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update notice details. Reply due and reminders recalculate automatically." : "Notice number is generated automatically. Reply due date and reminders are calculated from received date."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Subject *" className="sm:col-span-2">
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Show-cause notice for delayed F1 return" />
            </Field>
            <Field label="Authority *">
              <PickSelect value={form.authority} onChange={(v) => setForm({ ...form, authority: v })} options={AUTHORITIES} placeholder="Select authority" />
            </Field>
            <Field label="Mine">
              <PickSelect value={form.mine} onChange={(v) => setForm({ ...form, mine: v })} options={MINES} placeholder="Select mine" />
            </Field>
            <Field label="Received Date *">
              <Input type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} />
            </Field>
            <Field label="Reply Period (days) *">
              <Input type="number" min={0} value={form.reply_period_days} onChange={(e) => setForm({ ...form, reply_period_days: e.target.value })} />
            </Field>
            <Field label="Reply Due (auto)">
              <Input value={replyDuePreview} readOnly disabled />
            </Field>
            <Field label="Status *">
              <PickSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES} />
            </Field>
            <Field label="Risk Level *">
              <PickSelect value={form.risk_level} onChange={(v) => setForm({ ...form, risk_level: v })} options={RISK_LEVELS} />
            </Field>
            <Field label="Responsible Person">
              <Input value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} />
            </Field>
            <Field label="Department">
              <PickSelect value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS} placeholder="Select department" />
            </Field>
            <Field label="Reminder Days (before due)" className="sm:col-span-2">
              <Input value={form.reminder_days} onChange={(e) => setForm({ ...form, reminder_days: e.target.value })} placeholder="1,3,7,15,30" />
              {reminderPreview.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {reminderPreview.map((r) => (
                    <span key={r.n} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      T-{r.n}d · {r.date}
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Closed Date">
              <Input type="date" value={form.closed_date} onChange={(e) => setForm({ ...form, closed_date: e.target.value })} />
            </Field>
            <Field label="Tags (comma separated)">
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. show-cause, urgent" />
            </Field>
            <Field label="Legal Remarks" className="sm:col-span-2">
              <Textarea rows={3} value={form.legal_remarks} onChange={(e) => setForm({ ...form, legal_remarks: e.target.value })} placeholder="Advocate notes, legal strategy…" />
            </Field>
            <Field label="Documents" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload files
                </Button>
                <span className="text-xs text-muted-foreground">PDF, images, or any attachment</span>
              </div>
              {docs.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {docs.map((d) => (
                    <li key={d.path} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-border bg-muted/30">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">{d.name}</a>
                      <span className="text-muted-foreground tabular-nums">{(d.size / 1024).toFixed(1)} KB</span>
                      <button onClick={() => removeDoc(d)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
            {editing && editing.timeline?.length > 0 && (
              <Field label="Timeline" className="sm:col-span-2">
                <ul className="space-y-1 text-xs text-muted-foreground max-h-32 overflow-y-auto border border-border rounded p-2">
                  {editing.timeline.map((t, i) => (
                    <li key={i}>· {new Date(t.date).toLocaleString()} — {t.event}</li>
                  ))}
                </ul>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this notice?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.notice_number} — {deleteTarget?.subject}" will be permanently removed, including its attached documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PickSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Select…"} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="w-full sm:w-auto">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
