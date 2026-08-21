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
import { Plus, Search, ArrowUpDown, Pencil, Trash2, Loader2, Upload, FileText, X, ClipboardList, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMasterNames } from "@/lib/masters";

export const Route = createFileRoute("/inspections")({
  head: () => ({ meta: [{ title: "MineCompli — Mining Compliance Management System" }] }),
  component: InspectionsModule,
});

const AUTHORITIES_FALLBACK = ["IBM", "DGMS", "MoEFCC", "SPCB", "Forest", "PESO", "Revenue", "Labour", "State Mining", "Other"];
const MINES_FALLBACK = ["Block A-12", "Block B-7", "Block C-3", "Block D-9", "Block E-1"];
const DEPARTMENTS_FALLBACK = ["Mining", "Environment", "Safety", "Legal", "HR", "Finance", "Operations"];
const SEVERITY = ["Critical", "High", "Medium", "Low"];
const CLOSURE_STATUS = ["Open", "In Progress", "Pending Evidence", "Closed", "Escalated"];
const INSPECTION_TYPES = ["Routine", "Surprise", "Statutory", "Special", "Follow-up"];

type Evidence = { name: string; path: string; url: string; size: number };

type Observation = {
  id: string;
  inspection_id: string;
  observation: string;
  severity: string;
  corrective_action: string | null;
  target_date: string | null;
  responsible_person: string | null;
  closure_status: string;
  closed_date: string | null;
  evidence: Evidence[];
  sort_order: number;
};

type Inspection = {
  id: string;
  inspection_number: string;
  inspection_date: string;
  authority: string;
  officer: string | null;
  mine: string | null;
  inspection_type: string | null;
  scope: string | null;
  overall_severity: string;
  closure_status: string;
  closed_date: string | null;
  summary: string | null;
  responsible_person: string | null;
  department: string | null;
  tags: string[] | null;
  evidence: Evidence[];
  created_at: string;
  updated_at: string;
};

type ObsDraft = {
  id?: string;
  observation: string;
  severity: string;
  corrective_action: string;
  target_date: string;
  responsible_person: string;
  closure_status: string;
  closed_date: string;
  evidence: Evidence[];
};

const emptyForm = {
  inspection_date: new Date().toISOString().slice(0, 10),
  authority: "",
  officer: "",
  mine: "",
  inspection_type: "Routine",
  scope: "",
  overall_severity: "Medium",
  closure_status: "Open",
  closed_date: "",
  summary: "",
  responsible_person: "",
  department: "",
  tags: "",
};
type FormState = typeof emptyForm;

const emptyObs: ObsDraft = {
  observation: "",
  severity: "Medium",
  corrective_action: "",
  target_date: "",
  responsible_person: "",
  closure_status: "Open",
  closed_date: "",
  evidence: [],
};

function sevBadge(s: string) {
  const map: Record<string, string> = {
    Critical: "bg-destructive/15 text-destructive border-destructive/30",
    High: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
    Medium: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
    Low: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  };
  return map[s] ?? "bg-muted text-muted-foreground border-border";
}
function closureBadge(s: string) {
  const map: Record<string, string> = {
    Open: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300",
    "In Progress": "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    "Pending Evidence": "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
    Closed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    Escalated: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return map[s] ?? "bg-muted text-muted-foreground border-border";
}

async function uploadEvidence(files: FileList | null): Promise<Evidence[]> {
  if (!files || files.length === 0) return [];
  const out: Evidence[] = [];
  for (const file of Array.from(files)) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("inspection-evidence").upload(path, file);
    if (upErr) { toast.error(`Upload failed: ${file.name}`, { description: upErr.message }); continue; }
    const { data: signed } = await supabase.storage.from("inspection-evidence").createSignedUrl(path, 60 * 60 * 24 * 365);
    out.push({ name: file.name, path, url: signed?.signedUrl ?? "", size: file.size });
  }
  return out;
}

function InspectionsModule() {
  const { names: AUTHORITIES } = useMasterNames("authorities", AUTHORITIES_FALLBACK);
  const { names: MINES } = useMasterNames("mines", MINES_FALLBACK);
  const { names: DEPARTMENTS } = useMasterNames("departments", DEPARTMENTS_FALLBACK);
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/inspections" });
  const calendarCreateDate = searchParams.create === "1" && searchParams.fromCalendar === "1"
    && typeof searchParams.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : "";
  const calendarReturnView = searchParams.calendarView === "week" || searchParams.calendarView === "day" ? searchParams.calendarView : "month";

  const [rows, setRows] = useState<Inspection[]>([]);
  const [obsByInspection, setObsByInspection] = useState<Record<string, Observation[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Inspection | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [observations, setObservations] = useState<ObsDraft[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Inspection | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const obsFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [search, setSearch] = useState("");
  const [fAuthority, setFAuthority] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fSeverity, setFSeverity] = useState("all");
  const [fMine, setFMine] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  async function load() {
    setLoading(true);
    const [insRes, obsRes] = await Promise.all([
      (supabase as any).from("inspections").select("*").order("inspection_date", { ascending: false }),
      (supabase as any).from("inspection_observations").select("*").order("sort_order", { ascending: true }),
    ]);
    if (insRes.error) toast.error("Failed to load inspections", { description: insRes.error.message });
    else setRows((insRes.data ?? []) as Inspection[]);
    if (!obsRes.error) {
      const map: Record<string, Observation[]> = {};
      for (const o of (obsRes.data ?? []) as Observation[]) {
        (map[o.inspection_id] ||= []).push(o);
      }
      setObsByInspection(map);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!calendarCreateDate) return;
    setEditing(null);
    setForm({ ...emptyForm, inspection_date: calendarCreateDate });
    setEvidence([]);
    setObservations([]);
    setDialogOpen(true);
  }, [calendarCreateDate]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setEvidence([]);
    setObservations([]);
    setDialogOpen(true);
  }
  function openEdit(row: Inspection) {
    setEditing(row);
    setForm({
      inspection_date: row.inspection_date,
      authority: row.authority,
      officer: row.officer ?? "",
      mine: row.mine ?? "",
      inspection_type: row.inspection_type ?? "Routine",
      scope: row.scope ?? "",
      overall_severity: row.overall_severity,
      closure_status: row.closure_status,
      closed_date: row.closed_date ?? "",
      summary: row.summary ?? "",
      responsible_person: row.responsible_person ?? "",
      department: row.department ?? "",
      tags: (row.tags ?? []).join(", "),
    });
    setEvidence(Array.isArray(row.evidence) ? row.evidence : []);
    const existing = (obsByInspection[row.id] ?? []).map<ObsDraft>((o) => ({
      id: o.id,
      observation: o.observation,
      severity: o.severity,
      corrective_action: o.corrective_action ?? "",
      target_date: o.target_date ?? "",
      responsible_person: o.responsible_person ?? "",
      closure_status: o.closure_status,
      closed_date: o.closed_date ?? "",
      evidence: Array.isArray(o.evidence) ? o.evidence : [],
    }));
    setObservations(existing);
    setDialogOpen(true);
  }

  async function handleInspectionUpload(files: FileList | null) {
    setUploading(true);
    const docs = await uploadEvidence(files);
    setEvidence((d) => [...d, ...docs]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (docs.length) toast.success(`${docs.length} file(s) uploaded`);
  }
  async function handleObsUpload(idx: number, files: FileList | null) {
    setUploading(true);
    const docs = await uploadEvidence(files);
    setObservations((arr) => arr.map((o, i) => i === idx ? { ...o, evidence: [...o.evidence, ...docs] } : o));
    setUploading(false);
    const ref = obsFileRefs.current[idx];
    if (ref) ref.value = "";
  }
  async function removeEvidence(path: string, isObs?: number) {
    await supabase.storage.from("inspection-evidence").remove([path]);
    if (typeof isObs === "number") {
      setObservations((arr) => arr.map((o, i) => i === isObs ? { ...o, evidence: o.evidence.filter((e) => e.path !== path) } : o));
    } else {
      setEvidence((d) => d.filter((x) => x.path !== path));
    }
  }

  function addObservation() {
    setObservations((arr) => [...arr, { ...emptyObs }]);
  }
  function updateObs(idx: number, patch: Partial<ObsDraft>) {
    setObservations((arr) => arr.map((o, i) => i === idx ? { ...o, ...patch } : o));
  }
  function removeObs(idx: number) {
    setObservations((arr) => arr.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!form.inspection_date) return toast.error("Inspection date is required");
    if (!form.authority) return toast.error("Authority is required");

    setSaving(true);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload: Record<string, unknown> = {
      inspection_date: form.inspection_date,
      authority: form.authority,
      officer: form.officer || null,
      mine: form.mine || null,
      inspection_type: form.inspection_type || null,
      scope: form.scope || null,
      overall_severity: form.overall_severity,
      closure_status: form.closure_status,
      closed_date: form.closed_date || null,
      summary: form.summary || null,
      responsible_person: form.responsible_person || null,
      department: form.department || null,
      tags: tags.length ? tags : null,
      evidence,
    };

    let inspectionId = editing?.id;
    if (editing) {
      const { error } = await (supabase as any).from("inspections").update(payload).eq("id", editing.id);
      if (error) { setSaving(false); return toast.error("Update failed", { description: error.message }); }
    } else {
      const { data, error } = await (supabase as any).from("inspections").insert(payload).select("id").single();
      if (error) { setSaving(false); return toast.error("Create failed", { description: error.message }); }
      inspectionId = data.id;
    }

    // Sync observations: delete removed, upsert remaining
    if (inspectionId) {
      const existingIds = new Set((obsByInspection[inspectionId] ?? []).map((o) => o.id));
      const keptIds = new Set(observations.map((o) => o.id).filter(Boolean) as string[]);
      const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
      if (toDelete.length) {
        await (supabase as any).from("inspection_observations").delete().in("id", toDelete);
      }
      for (let i = 0; i < observations.length; i++) {
        const o = observations[i];
        if (!o.observation.trim()) continue;
        const obsPayload = {
          inspection_id: inspectionId,
          observation: o.observation.trim(),
          severity: o.severity,
          corrective_action: o.corrective_action || null,
          target_date: o.target_date || null,
          responsible_person: o.responsible_person || null,
          closure_status: o.closure_status,
          closed_date: o.closed_date || null,
          evidence: o.evidence,
          sort_order: i,
        };
        if (o.id) {
          await (supabase as any).from("inspection_observations").update(obsPayload).eq("id", o.id);
        } else {
          await (supabase as any).from("inspection_observations").insert(obsPayload);
        }
      }
    }

    setSaving(false);
    const createdFromCalendar = !editing && !!calendarCreateDate;
    toast.success(editing ? "Inspection updated" : "Inspection created");
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setEvidence([]);
    setObservations([]);
    if (createdFromCalendar) {
      navigate({ to: "/calendar", search: { date: calendarCreateDate, view: calendarReturnView } as any });
      return;
    }
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const obs = obsByInspection[deleteTarget.id] ?? [];
    const allPaths = [
      ...(deleteTarget.evidence ?? []).map((e) => e.path),
      ...obs.flatMap((o) => (o.evidence ?? []).map((e) => e.path)),
    ];
    if (allPaths.length) await supabase.storage.from("inspection-evidence").remove(allPaths);
    const { error } = await (supabase as any).from("inspections").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Delete failed", { description: error.message });
    else {
      toast.success("Inspection deleted");
      setDeleteTarget(null);
      load();
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = rows.filter((r) => {
      if (q) {
        const hay = [r.inspection_number, r.authority, r.officer, r.mine, r.summary, r.scope, r.responsible_person]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fAuthority !== "all" && r.authority !== fAuthority) return false;
      if (fStatus !== "all" && r.closure_status !== fStatus) return false;
      if (fSeverity !== "all" && r.overall_severity !== fSeverity) return false;
      if (fMine !== "all" && r.mine !== fMine) return false;
      if (fFrom && r.inspection_date < fFrom) return false;
      if (fTo && r.inspection_date > fTo) return false;
      return true;
    });
    arr.sort((a, b) => sortAsc
      ? (a.inspection_date < b.inspection_date ? -1 : 1)
      : (a.inspection_date < b.inspection_date ? 1 : -1));
    return arr;
  }, [rows, search, fAuthority, fStatus, fSeverity, fMine, fFrom, fTo, sortAsc]);

  const counters = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let open = 0, closed = 0, critical = 0, pendingActions = 0, overdueActions = 0;
    for (const r of rows) {
      if (r.closure_status === "Closed") closed++; else open++;
      if (r.overall_severity === "Critical") critical++;
    }
    for (const list of Object.values(obsByInspection)) {
      for (const o of list) {
        if (o.closure_status !== "Closed") {
          pendingActions++;
          if (o.target_date && o.target_date < today) overdueActions++;
        }
      }
    }
    return { total: rows.length, open, closed, critical, pendingActions, overdueActions };
  }, [rows, obsByInspection]);

  return (
    <>
      <Topbar title="Inspection Management" subtitle="Capture inspection observations, corrective actions and closure" />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Counter icon={ClipboardList} label="Total" value={counters.total} />
          <Counter icon={Clock} label="Open" value={counters.open} tone="sky" />
          <Counter icon={CheckCircle2} label="Closed" value={counters.closed} tone="emerald" />
          <Counter icon={AlertTriangle} label="Critical" value={counters.critical} tone="destructive" />
          <Counter icon={ClipboardList} label="Pending Actions" value={counters.pendingActions} tone="amber" />
          <Counter icon={AlertTriangle} label="Overdue Actions" value={counters.overdueActions} tone="destructive" />
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-full min-w-0 sm:min-w-[220px] sm:flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inspection #, authority, officer, mine…" className="pl-8" />
            </div>
            <FilterSelect label="Authority" value={fAuthority} onChange={setFAuthority} options={AUTHORITIES} />
            <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={CLOSURE_STATUS} />
            <FilterSelect label="Severity" value={fSeverity} onChange={setFSeverity} options={SEVERITY} />
            <FilterSelect label="Mine" value={fMine} onChange={setFMine} options={MINES} />
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="w-full sm:w-[150px]" />
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="w-full sm:w-[150px]" />
            </div>
            <Button onClick={openNew} className="w-full sm:w-auto sm:ml-auto">
              <Plus className="size-4" /> New Inspection
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inspection #</TableHead>
                <TableHead>
                  <button onClick={() => setSortAsc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">
                    Date <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead>Mine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Obs.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin inline mr-2" /> Loading inspections…
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  No inspections found. Click <span className="text-foreground font-medium">New Inspection</span> to create one.
                </TableCell></TableRow>
              ) : filtered.map((r) => {
                const obsCount = obsByInspection[r.id]?.length ?? 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.inspection_number}</TableCell>
                    <TableCell>{r.inspection_date}</TableCell>
                    <TableCell>{r.authority}</TableCell>
                    <TableCell>{r.officer ?? "—"}</TableCell>
                    <TableCell>{r.mine ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.inspection_type ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={sevBadge(r.overall_severity)}>{r.overall_severity}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={closureBadge(r.closure_status)}>{r.closure_status}</Badge></TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{obsCount}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); setEvidence([]); setObservations([]); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.inspection_number}` : "New Inspection"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update inspection details, observations and corrective actions." : "Inspection number is generated automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Inspection Date *">
              <Input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} />
            </Field>
            <Field label="Authority *">
              <PickSelect value={form.authority} onChange={(v) => setForm({ ...form, authority: v })} options={AUTHORITIES} placeholder="Select authority" />
            </Field>
            <Field label="Officer">
              <Input value={form.officer} onChange={(e) => setForm({ ...form, officer: e.target.value })} placeholder="Inspecting officer name" />
            </Field>
            <Field label="Mine">
              <PickSelect value={form.mine} onChange={(v) => setForm({ ...form, mine: v })} options={MINES} placeholder="Select mine" />
            </Field>
            <Field label="Inspection Type">
              <PickSelect value={form.inspection_type} onChange={(v) => setForm({ ...form, inspection_type: v })} options={INSPECTION_TYPES} />
            </Field>
            <Field label="Overall Severity *">
              <PickSelect value={form.overall_severity} onChange={(v) => setForm({ ...form, overall_severity: v })} options={SEVERITY} />
            </Field>
            <Field label="Closure Status *">
              <PickSelect value={form.closure_status} onChange={(v) => setForm({ ...form, closure_status: v })} options={CLOSURE_STATUS} />
            </Field>
            <Field label="Closed Date">
              <Input type="date" value={form.closed_date} onChange={(e) => setForm({ ...form, closed_date: e.target.value })} />
            </Field>
            <Field label="Responsible Person">
              <Input value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} />
            </Field>
            <Field label="Department">
              <PickSelect value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS} placeholder="Select department" />
            </Field>
            <Field label="Scope" className="sm:col-span-2">
              <Input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Scope or areas covered" />
            </Field>
            <Field label="Summary" className="sm:col-span-2">
              <Textarea rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Overall summary of the inspection" />
            </Field>
            <Field label="Tags (comma separated)" className="sm:col-span-2">
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. safety, blasting" />
            </Field>
            <Field label="Inspection Evidence" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleInspectionUpload(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload files
                </Button>
                <span className="text-xs text-muted-foreground">Reports, photos, attachments</span>
              </div>
              {evidence.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {evidence.map((d) => (
                    <li key={d.path} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-border bg-muted/30">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">{d.name}</a>
                      <span className="text-muted-foreground tabular-nums">{(d.size / 1024).toFixed(1)} KB</span>
                      <button onClick={() => removeEvidence(d.path)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>

            <div className="sm:col-span-2 border-t border-border pt-4">
              <div className="flex flex-col items-start gap-2 mb-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                <h3 className="text-sm font-medium">Observations &amp; Corrective Actions</h3>
                <Button type="button" variant="outline" size="sm" onClick={addObservation}>
                  <Plus className="size-4" /> Add Observation
                </Button>
              </div>
              {observations.length === 0 && (
                <p className="text-xs text-muted-foreground">No observations added yet.</p>
              )}
              <div className="space-y-3">
                {observations.map((o, idx) => (
                  <div key={idx} className="rounded-md border border-border p-3 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Observation #{idx + 1}</span>
                      <button onClick={() => removeObs(idx)} className="text-muted-foreground hover:text-destructive" aria-label="Remove observation">
                        <X className="size-4" />
                      </button>
                    </div>
                    <Textarea rows={2} value={o.observation} onChange={(e) => updateObs(idx, { observation: e.target.value })} placeholder="Describe observation / non-conformity" />
                    <div className="grid sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Severity</Label>
                        <PickSelect value={o.severity} onChange={(v) => updateObs(idx, { severity: v })} options={SEVERITY} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Target Date</Label>
                        <Input type="date" value={o.target_date} onChange={(e) => updateObs(idx, { target_date: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Closure Status</Label>
                        <PickSelect value={o.closure_status} onChange={(v) => updateObs(idx, { closure_status: v })} options={CLOSURE_STATUS} />
                      </div>
                    </div>
                    <Textarea rows={2} value={o.corrective_action} onChange={(e) => updateObs(idx, { corrective_action: e.target.value })} placeholder="Corrective action to be taken" />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Responsible Person</Label>
                        <Input value={o.responsible_person} onChange={(e) => updateObs(idx, { responsible_person: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Closed Date</Label>
                        <Input type="date" value={o.closed_date} onChange={(e) => updateObs(idx, { closed_date: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <input
                        ref={(el) => { obsFileRefs.current[idx] = el; }}
                        type="file" multiple className="hidden"
                        onChange={(e) => handleObsUpload(idx, e.target.files)}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => obsFileRefs.current[idx]?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        Evidence
                      </Button>
                      {o.evidence.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {o.evidence.map((d) => (
                            <li key={d.path} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-border bg-background">
                              <FileText className="size-3.5 text-muted-foreground" />
                              <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">{d.name}</a>
                              <span className="text-muted-foreground tabular-nums">{(d.size / 1024).toFixed(1)} KB</span>
                              <button onClick={() => removeEvidence(d.path, idx)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                                <X className="size-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            <AlertDialogTitle>Delete this inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.inspection_number}" and all its observations and evidence will be permanently removed.
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

function Counter({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "sky" | "emerald" | "destructive" | "amber" }) {
  const toneClass: Record<string, string> = {
    sky: "text-sky-600 dark:text-sky-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    destructive: "text-destructive",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
      <div className={`size-9 rounded-md bg-muted flex items-center justify-center ${tone ? toneClass[tone] : "text-muted-foreground"}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
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
